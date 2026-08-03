const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken, authorize } = require('../middleware/authMiddleware');

// ── All analytics routes require authentication and seller authorization ──
router.use(authenticateToken);
router.use(authorize(['Seller']));

// ── 1. GET /api/seller/analytics (Summary Metrics) ──
router.get('/', async (req, res) => {
    try {
        const sellerId = req.user.id;
        console.log(`[DEBUG] Fetching analytics for Seller ID: ${sellerId}`);

        const [stats] = await db.execute(`
            SELECT
                COALESCE(SUM(total_price), 0) as revenue,
                COUNT(*) as totalOrders,
                COALESCE(COUNT(DISTINCT buyer_id), 0) as customers,
                COALESCE(SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END), 0) as completedOrders,
                COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) as pendingOrders,
                COALESCE(SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END), 0) as processingOrders,
                COALESCE(SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END), 0) as cancelledOrders,
                COALESCE(MAX(total_price), 0) as highestOrder,
                COALESCE(MIN(total_price), 0) as lowestOrder
            FROM orders
            WHERE seller_id = ?
        `, [sellerId]);

        console.log("[DEBUG] Raw database result:", stats[0]);

        const data = stats[0];
        const revenue = Number(data.revenue);
        const totalOrders = Number(data.totalOrders);
        const avgOrder = totalOrders > 0 ? (revenue / totalOrders) : 0;
        const customers = Number(data.customers);
        const completedOrders = Number(data.completedOrders);
        const pendingOrders = Number(data.pendingOrders);
        const processingOrders = Number(data.processingOrders);
        const cancelledOrders = Number(data.cancelledOrders);
        const highestOrder = Number(data.highestOrder);
        const lowestOrder = Number(data.lowestOrder);

        // Calculate conversion rate
        const conversionRate = totalOrders > 0 ? ((completedOrders / totalOrders) * 100) : 0;

        const payload = {
            revenue,
            avgOrder,
            totalOrders,
            customers,
            completedOrders,
            pendingOrders,
            processingOrders,
            cancelledOrders,
            highestOrder,
            lowestOrder,
            conversionRate: Number(conversionRate.toFixed(2))
        };

        console.log("[DEBUG] Sending payload to frontend:", payload);
       
        res.status(200).json({
            success: true,
            data: payload
        });
    } catch (error) {
        console.error("[ERROR] Failed to fetch metrics:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch metrics",
            error: error.message
        });
    }
});

// ── 2. GET /api/seller/analytics/chart (Sales Trends) ──
router.get('/chart', async (req, res) => {
    try {
        const sellerId = req.user.id;
        const { period = '30days' } = req.query;

        console.log(`[DEBUG] Fetching chart data for Seller ID: ${sellerId}, Period: ${period}`);

        let interval;

        switch (period) {
            case '7days':
                interval = '7 DAY';
                break;
            case '30days':
                interval = '30 DAY';
                break;
            case 'month':
                interval = '6 MONTH';
                break;
            case 'year':
                interval = '5 YEAR';
                break;
            default:
                interval = '30 DAY';
        }

        let groupByExpression;
        let formatDateLabel;

        if (period === 'month') {
            groupByExpression = "DATE_FORMAT(created_at, '%Y-%m')";
            formatDateLabel = (value) => {
                const [year, month] = value.split('-');
                return new Date(`${year}-${month}-01`).toLocaleString('en-US', { month: 'short', year: 'numeric' });
            };
        } else if (period === 'year') {
            groupByExpression = "DATE_FORMAT(created_at, '%Y')";
            formatDateLabel = (value) => value;
        } else {
            groupByExpression = 'DATE(created_at)';
            formatDateLabel = (value) => new Date(value).toLocaleString('en-US', { month: 'short', day: '2-digit' });
        }

        const sql = `
            SELECT
                ${groupByExpression} as date,
                COALESCE(SUM(total_price), 0) as amount,
                COUNT(*) as orders
            FROM orders
            WHERE seller_id = ? AND status = 'delivered'
            AND created_at >= DATE_SUB(NOW(), INTERVAL ${interval})
            GROUP BY 1
            ORDER BY 1 ASC
        `;

        console.log('[DEBUG] Analytics chart SQL:', sql.replace(/\s+/g, ' ').trim());
        const [chartData] = await db.execute(sql, [sellerId]);

        console.log("[DEBUG] Chart data found:", chartData.length, "records");

        // Format returned labels and calculate moving average and trends
        const data = chartData.map((row, index, array) => {
            const date = formatDateLabel(row.date);
            let trend = 'stable';
            if (index > 0) {
                const prevAmount = Number(array[index - 1].amount);
                const currentAmount = Number(row.amount);
                if (currentAmount > prevAmount * 1.1) trend = 'up';
                else if (currentAmount < prevAmount * 0.9) trend = 'down';
            }
            return {
                ...row,
                amount: Number(row.amount),
                orders: Number(row.orders),
                trend
            };
        });

        res.status(200).json({
            success: true,
            data,
            period
        });
    } catch (error) {
        console.error("[ERROR] Failed to fetch chart data:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch chart data",
            error: error.message
        });
    }
});

// ── 3. GET /api/seller/analytics/top-products ──
router.get('/top-products', async (req, res) => {
    try {
        const sellerId = req.user.id;
        const { limit = 10 } = req.query;

        const [products] = await db.execute(`
            SELECT 
                p.id,
                p.name,
                p.price,
                p.image_url,
                COALESCE(SUM(oi.quantity), 0) as totalSold,
                COALESCE(SUM(oi.quantity * oi.price), 0) as totalRevenue,
                COUNT(DISTINCT o.id) as orderCount
            FROM products p
            LEFT JOIN order_items oi ON p.id = oi.product_id
            LEFT JOIN orders o ON oi.order_id = o.id AND o.status = 'delivered'
            WHERE p.seller_id = ? AND p.deleted_at IS NULL
            GROUP BY p.id
            ORDER BY totalSold DESC
            LIMIT ?
        `, [sellerId, parseInt(limit)]);

        res.status(200).json({
            success: true,
            products
        });
    } catch (error) {
        console.error("[ERROR] Failed to fetch top products:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch top products",
            error: error.message
        });
    }
});

// ── 4. GET /api/seller/analytics/categories ──
router.get('/categories', async (req, res) => {
    try {
        const sellerId = req.user.id;

        const [categories] = await db.execute(`
            SELECT 
                p.category,
                COUNT(DISTINCT p.id) as productCount,
                COALESCE(SUM(oi.quantity), 0) as totalSold,
                COALESCE(SUM(oi.quantity * oi.price), 0) as totalRevenue
            FROM products p
            LEFT JOIN order_items oi ON p.id = oi.product_id
            LEFT JOIN orders o ON oi.order_id = o.id AND o.status = 'delivered'
            WHERE p.seller_id = ? AND p.deleted_at IS NULL AND p.category IS NOT NULL
            GROUP BY p.category
            ORDER BY totalRevenue DESC
        `, [sellerId]);

        // Calculate percentages
        const totalRevenue = categories.reduce((sum, cat) => sum + Number(cat.totalRevenue), 0);
        const data = categories.map(cat => ({
            ...cat,
            totalRevenue: Number(cat.totalRevenue),
            totalSold: Number(cat.totalSold),
            percentage: totalRevenue > 0 ? ((Number(cat.totalRevenue) / totalRevenue) * 100).toFixed(1) : 0
        }));

        res.status(200).json({
            success: true,
            categories: data,
            totalRevenue
        });
    } catch (error) {
        console.error("[ERROR] Failed to fetch category analytics:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch category analytics",
            error: error.message
        });
    }
});

// ── 5. GET /api/seller/analytics/order-status ──
router.get('/order-status', async (req, res) => {
    try {
        const sellerId = req.user.id;

        const [statuses] = await db.execute(`
            SELECT 
                status,
                COUNT(*) as count,
                COALESCE(SUM(total_price), 0) as totalValue
            FROM orders
            WHERE seller_id = ?
            GROUP BY status
            ORDER BY 
                FIELD(status, 'pending', 'processing', 'shipped', 'delivered', 'cancelled')
        `, [sellerId]);

        // Calculate percentages
        const totalOrders = statuses.reduce((sum, s) => sum + Number(s.count), 0);
        const data = statuses.map(s => ({
            ...s,
            count: Number(s.count),
            totalValue: Number(s.totalValue),
            percentage: totalOrders > 0 ? ((Number(s.count) / totalOrders) * 100).toFixed(1) : 0
        }));

        res.status(200).json({
            success: true,
            statuses: data,
            totalOrders
        });
    } catch (error) {
        console.error("[ERROR] Failed to fetch order status:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch order status",
            error: error.message
        });
    }
});

// ── 6. GET /api/seller/analytics/customers ──
router.get('/customers', async (req, res) => {
    try {
        const sellerId = req.user.id;
        const { limit = 20 } = req.query;

        const [customers] = await db.execute(`
            SELECT 
                u.id,
                u.name,
                u.email,
                COUNT(o.id) as orderCount,
                COALESCE(SUM(o.total_price), 0) as totalSpent,
                MAX(o.created_at) as lastOrderDate,
                MIN(o.created_at) as firstOrderDate,
                COALESCE(AVG(o.total_price), 0) as averageOrderValue
            FROM users u
            JOIN orders o ON u.id = o.buyer_id
            WHERE o.seller_id = ? AND o.status = 'delivered'
            GROUP BY u.id
            ORDER BY totalSpent DESC
            LIMIT ?
        `, [sellerId, parseInt(limit)]);

        res.status(200).json({
            success: true,
            customers
        });
    } catch (error) {
        console.error("[ERROR] Failed to fetch customer analytics:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch customer analytics",
            error: error.message
        });
    }
});

module.exports = router;