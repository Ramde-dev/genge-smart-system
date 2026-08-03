const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken, authorize } = require('../middleware/authMiddleware');

// ── TEST ROUTE (Public) ──
router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'Seller routes are working!'
    });
});

// ── PROTECTED ROUTES ──
router.use(authenticateToken);
router.use(authorize(['Seller']));

// DASHBOARD ROUTE - FIXED
router.get('/dashboard', async (req, res) => {
    try {
        const sellerId = req.user.id;
        console.log('Dashboard requested for seller:', sellerId);

        // Fetch aggregated stats
        const [stats] = await db.execute(`
            SELECT
                COALESCE((SELECT SUM(total_price) FROM orders WHERE seller_id = ? AND status = 'delivered'), 0) as sales,
                COALESCE((SELECT COUNT(*) FROM products WHERE seller_id = ? AND deleted_at IS NULL), 0) as listings,
                COALESCE((SELECT COUNT(*) FROM orders WHERE seller_id = ? AND status = 'pending'), 0) as pending,
                COALESCE((SELECT COUNT(*) FROM orders WHERE seller_id = ? AND status = 'processing'), 0) as processing,
                COALESCE((SELECT COUNT(*) FROM orders WHERE seller_id = ? AND status = 'shipped'), 0) as shipped,
                COALESCE((SELECT COUNT(*) FROM orders WHERE seller_id = ? AND status = 'delivered'), 0) as delivered,
                COALESCE((SELECT COUNT(*) FROM orders WHERE seller_id = ? AND status = 'cancelled'), 0) as cancelled,
                COALESCE((SELECT COUNT(*) FROM orders WHERE seller_id = ?), 0) as totalOrders
        `, [sellerId, sellerId, sellerId, sellerId, sellerId, sellerId, sellerId, sellerId]);

        const [orders] = await db.execute(`
            SELECT
                o.id,
                o.total_price,
                o.status,
                o.created_at,
                u.name as buyer_name,
                u.email as buyer_email,
                (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as items_count
            FROM orders o
            JOIN users u ON o.buyer_id = u.id
            WHERE o.seller_id = ?
            ORDER BY o.created_at DESC
            LIMIT 5
        `, [sellerId]);

        const [lowStock] = await db.execute(`
            SELECT id, name, price, stock, category FROM products WHERE seller_id = ? AND stock <= 10 AND deleted_at IS NULL ORDER BY stock ASC LIMIT 5
        `, [sellerId]);

        res.status(200).json({
            success: true,
            stats: {
                totalRevenue: Number(stats[0].sales) || 0,
                pendingOrders: Number(stats[0].pending) || 0,
                totalProducts: Number(stats[0].listings) || 0,
                processingOrders: Number(stats[0].processing) || 0,
                shippedOrders: Number(stats[0].shipped) || 0,
                deliveredOrders: Number(stats[0].delivered) || 0,
                cancelledOrders: Number(stats[0].cancelled) || 0,
                totalOrders: Number(stats[0].totalOrders) || 0
            },
            recent_orders: orders.map(o => ({
                id: o.id,
                total_price: o.total_price,
                status: o.status,
                created_at: o.created_at,
                buyer_name: o.buyer_name,
                buyer_email: o.buyer_email,
                items_count: o.items_count
            })),
            low_stock_products: lowStock || []
        });
    } catch (error) {
        console.error('Seller dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard data',
            error: error.message
        });
    }
});

module.exports = router;