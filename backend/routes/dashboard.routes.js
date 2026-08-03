const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken, authorize } = require('../middleware/authMiddleware');

// ── All dashboard routes require authentication ──
router.use(authenticateToken);

// ── 1. SELLER DASHBOARD ──
router.get('/seller', authorize(['Seller']), async (req, res) => {
    try {
        const sellerId = req.user.id;

        // 1. Fetching stats
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

        // 2. Fetching recent orders
        const [orders] = await db.execute(`
            SELECT
                o.id,
                o.total_price as total,
                o.status,
                o.created_at,
                u.name as buyer,
                u.email as buyer_email,
                (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as items_count
            FROM orders o
            JOIN users u ON o.buyer_id = u.id
            WHERE o.seller_id = ?
            ORDER BY o.created_at DESC
            LIMIT 5
        `, [sellerId]);

        // 3. Fetching low stock products
        const [lowStock] = await db.execute(`
            SELECT
                id,
                name,
                price,
                stock,
                category
            FROM products
            WHERE seller_id = ? AND stock <= 10 AND deleted_at IS NULL
            ORDER BY stock ASC
            LIMIT 5
        `, [sellerId]);

        // Map DB fields to frontend-friendly keys
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
            recent_orders: (orders || []).map(o => ({
                id: o.id,
                total_price: o.total_price || o.total || 0,
                status: o.status,
                created_at: o.created_at,
                buyer_name: o.buyer || o.buyer_name || null,
                buyer_email: o.buyer_email || null,
                items_count: o.items_count || 0
            })),
            low_stock_products: lowStock || []
        });
    } catch (error) {
        console.error("Seller dashboard error:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            details: error.message
        });
    }
});

// Alias route so frontend requests to `/seller/dashboard` return the same payload
router.get('/seller/dashboard', authorize(['Seller']), async (req, res) => {
    try {
        const sellerId = req.user.id;

        // 1. Fetching stats
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

        // 2. Fetching recent orders
        const [orders] = await db.execute(`
            SELECT
                o.id,
                o.total_price as total,
                o.status,
                o.created_at,
                u.name as buyer,
                u.email as buyer_email,
                (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as items_count
            FROM orders o
            JOIN users u ON o.buyer_id = u.id
            WHERE o.seller_id = ?
            ORDER BY o.created_at DESC
            LIMIT 5
        `, [sellerId]);

        // 3. Fetching low stock products
        const [lowStock] = await db.execute(`
            SELECT
                id,
                name,
                price,
                stock,
                category
            FROM products
            WHERE seller_id = ? AND stock <= 10 AND deleted_at IS NULL
            ORDER BY stock ASC
            LIMIT 5
        `, [sellerId]);

        // Map DB fields to frontend-friendly keys for the alias route
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
            recent_orders: (orders || []).map(o => ({
                id: o.id,
                total_price: o.total_price || o.total || 0,
                status: o.status,
                created_at: o.created_at,
                buyer_name: o.buyer || o.buyer_name || null,
                buyer_email: o.buyer_email || null,
                items_count: o.items_count || 0
            })),
            low_stock_products: lowStock || []
        });
    } catch (error) {
        console.error("Seller dashboard error (alias):", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            details: error.message
        });
    }
});

// ── 2. ADMIN DASHBOARD ──
router.get('/admin', async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin only.'
            });
        }

        // Get user stats
        const [userStats] = await db.execute(`
            SELECT
                (SELECT COUNT(*) FROM users) as totalUsers,
                (SELECT COUNT(*) FROM users WHERE role = 'Seller') as totalSellers,
                (SELECT COUNT(*) FROM users WHERE role = 'Buyer') as totalBuyers,
                (SELECT COUNT(*) FROM users WHERE role = 'agent') as totalAgents,
                (SELECT COUNT(*) FROM users WHERE status = 'active') as activeUsers,
                (SELECT COUNT(*) FROM users WHERE status = 'inactive') as inactiveUsers
        `);

        // Get order stats
        const [orderStats] = await db.execute(`
            SELECT
                (SELECT COUNT(*) FROM orders) as totalOrders,
                COALESCE((SELECT SUM(total_price) FROM orders WHERE status = 'delivered'), 0) as totalRevenue,
                COALESCE((SELECT COUNT(*) FROM orders WHERE status = 'pending'), 0) as pendingOrders,
                COALESCE((SELECT COUNT(*) FROM orders WHERE status = 'processing'), 0) as processingOrders,
                COALESCE((SELECT COUNT(*) FROM orders WHERE status = 'shipped'), 0) as shippedOrders,
                COALESCE((SELECT COUNT(*) FROM orders WHERE status = 'delivered'), 0) as deliveredOrders,
                COALESCE((SELECT COUNT(*) FROM orders WHERE status = 'cancelled'), 0) as cancelledOrders
        `);

        // Get product stats
        const [productStats] = await db.execute(`
            SELECT
                (SELECT COUNT(*) FROM products WHERE deleted_at IS NULL) as totalProducts,
                (SELECT COUNT(*) FROM products WHERE stock <= 10 AND deleted_at IS NULL) as lowStockProducts
        `);

        // Get recent activity
        const [recentActivity] = await db.execute(`
            (SELECT 
                CONCAT('New user registered: ', name) as action,
                'user' as type,
                created_at as time
            FROM users 
            ORDER BY created_at DESC 
            LIMIT 3)
            UNION ALL
            (SELECT 
                CONCAT('New order #', id, ' placed') as action,
                'order' as type,
                created_at as time
            FROM orders 
            ORDER BY created_at DESC 
            LIMIT 3)
            ORDER BY time DESC
            LIMIT 5
        `);

        res.status(200).json({
            success: true,
            user_stats: userStats[0] || {
                totalUsers: 0,
                totalSellers: 0,
                totalBuyers: 0,
                totalAgents: 0,
                activeUsers: 0,
                inactiveUsers: 0
            },
            order_stats: orderStats[0] || {
                totalOrders: 0,
                totalRevenue: 0,
                pendingOrders: 0,
                processingOrders: 0,
                shippedOrders: 0,
                deliveredOrders: 0,
                cancelledOrders: 0
            },
            product_stats: productStats[0] || {
                totalProducts: 0,
                lowStockProducts: 0
            },
            recent_activity: recentActivity || []
        });
    } catch (error) {
        console.error("Admin dashboard error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch admin dashboard data",
            error: error.message
        });
    }
});

// ── 3. BUYER DASHBOARD ──
router.get('/buyer', async (req, res) => {
    try {
        const buyerId = req.user.id;

        // Get order stats
        const [orderStats] = await db.execute(`
            SELECT
                (SELECT COUNT(*) FROM orders WHERE buyer_id = ?) as totalOrders,
                (SELECT COUNT(*) FROM orders WHERE buyer_id = ? AND status = 'pending') as pendingOrders,
                (SELECT COUNT(*) FROM orders WHERE buyer_id = ? AND status = 'processing') as processingOrders,
                (SELECT COUNT(*) FROM orders WHERE buyer_id = ? AND status = 'shipped') as shippedOrders,
                (SELECT COUNT(*) FROM orders WHERE buyer_id = ? AND status = 'delivered') as deliveredOrders,
                (SELECT COUNT(*) FROM orders WHERE buyer_id = ? AND status = 'cancelled') as cancelledOrders,
                COALESCE((SELECT SUM(total_price) FROM orders WHERE buyer_id = ? AND status = 'delivered'), 0) as totalSpent
        `, [buyerId, buyerId, buyerId, buyerId, buyerId, buyerId, buyerId]);

        // Get recent orders
        const [recentOrders] = await db.execute(`
            SELECT
                o.id,
                o.total_price,
                o.status,
                o.created_at,
                u.name as seller_name,
                (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as items_count
            FROM orders o
            JOIN users u ON o.seller_id = u.id
            WHERE o.buyer_id = ?
            ORDER BY o.created_at DESC
            LIMIT 5
        `, [buyerId]);

        // Get tracking notifications (unread)
        const [notifications] = await db.execute(`
            SELECT 
                id,
                order_id,
                title,
                message,
                type,
                created_at
            FROM notifications
            WHERE user_id = ? AND is_read = FALSE
            ORDER BY created_at DESC
            LIMIT 5
        `, [buyerId]);

        res.status(200).json({
            success: true,
            order_stats: orderStats[0] || {
                totalOrders: 0,
                pendingOrders: 0,
                processingOrders: 0,
                shippedOrders: 0,
                deliveredOrders: 0,
                cancelledOrders: 0,
                totalSpent: 0
            },
            recent_orders: recentOrders || [],
            notifications: notifications || []
        });
    } catch (error) {
        console.error("Buyer dashboard error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch buyer dashboard data",
            error: error.message
        });
    }
});

// ── 4. AGENT DASHBOARD ──
router.get('/agent', async (req, res) => {
    try {
        const agentId = req.user.id;

        // Get the agent's delivery_agent ID
        const [agent] = await db.execute(
            'SELECT id FROM delivery_agents WHERE user_id = ?',
            [agentId]
        );

        if (agent.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Agent not found'
            });
        }

        const agentDeliveryId = agent[0].id;

        // Get delivery stats
        const [deliveryStats] = await db.execute(`
            SELECT
                (SELECT COUNT(*) FROM deliveries WHERE agent_id = ?) as totalDeliveries,
                (SELECT COUNT(*) FROM deliveries WHERE agent_id = ? AND status = 'assigned') as assignedDeliveries,
                (SELECT COUNT(*) FROM deliveries WHERE agent_id = ? AND status = 'picked_up') as pickedUpDeliveries,
                (SELECT COUNT(*) FROM deliveries WHERE agent_id = ? AND status = 'in_transit') as inTransitDeliveries,
                (SELECT COUNT(*) FROM deliveries WHERE agent_id = ? AND status = 'arrived') as arrivedDeliveries,
                (SELECT COUNT(*) FROM deliveries WHERE agent_id = ? AND status = 'delivered') as completedDeliveries
        `, [agentDeliveryId, agentDeliveryId, agentDeliveryId, agentDeliveryId, agentDeliveryId, agentDeliveryId]);

        // Get recent deliveries
        const [recentDeliveries] = await db.execute(`
            SELECT
                d.*,
                o.id as order_id,
                u.name as buyer_name,
                u.address as buyer_address,
                u.phone as buyer_phone
            FROM deliveries d
            JOIN orders o ON d.order_id = o.id
            JOIN users u ON o.buyer_id = u.id
            WHERE d.agent_id = ?
            ORDER BY d.created_at DESC
            LIMIT 5
        `, [agentDeliveryId]);

        res.status(200).json({
            success: true,
            stats: deliveryStats[0] || {
                totalDeliveries: 0,
                assignedDeliveries: 0,
                pickedUpDeliveries: 0,
                inTransitDeliveries: 0,
                arrivedDeliveries: 0,
                completedDeliveries: 0
            },
            recent_deliveries: recentDeliveries || []
        });
    } catch (error) {
        console.error("Agent dashboard error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch agent dashboard data",
            error: error.message
        });
    }
});

// ── 5. GET DASHBOARD STATS ONLY ──
router.get('/stats', async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;

        let stats = {};

        switch (userRole) {
            case 'Seller':
                const [sellerStats] = await db.execute(`
                    SELECT
                        COALESCE((SELECT SUM(total_price) FROM orders WHERE seller_id = ? AND status = 'delivered'), 0) as revenue,
                        COALESCE((SELECT COUNT(*) FROM products WHERE seller_id = ? AND deleted_at IS NULL), 0) as products,
                        COALESCE((SELECT COUNT(*) FROM orders WHERE seller_id = ? AND status = 'pending'), 0) as pendingOrders
                `, [userId, userId, userId]);
                stats = sellerStats[0] || { revenue: 0, products: 0, pendingOrders: 0 };
                break;

            case 'Buyer':
                const [buyerStats] = await db.execute(`
                    SELECT
                        COALESCE((SELECT COUNT(*) FROM orders WHERE buyer_id = ?), 0) as totalOrders,
                        COALESCE((SELECT COUNT(*) FROM orders WHERE buyer_id = ? AND status = 'delivered'), 0) as delivered,
                        COALESCE((SELECT SUM(total_price) FROM orders WHERE buyer_id = ? AND status = 'delivered'), 0) as totalSpent
                `, [userId, userId, userId]);
                stats = buyerStats[0] || { totalOrders: 0, delivered: 0, totalSpent: 0 };
                break;

            case 'agent':
                const [agent] = await db.execute(
                    'SELECT id FROM delivery_agents WHERE user_id = ?',
                    [userId]
                );
                if (agent.length > 0) {
                    const [agentStats] = await db.execute(`
                        SELECT
                            (SELECT COUNT(*) FROM deliveries WHERE agent_id = ?) as totalDeliveries,
                            (SELECT COUNT(*) FROM deliveries WHERE agent_id = ? AND status = 'delivered') as completed
                    `, [agent[0].id, agent[0].id]);
                    stats = agentStats[0] || { totalDeliveries: 0, completed: 0 };
                } else {
                    stats = { totalDeliveries: 0, completed: 0 };
                }
                break;

            default:
                stats = { message: 'No stats available for this role' };
        }

        res.status(200).json({
            success: true,
            stats
        });
    } catch (error) {
        console.error("Stats error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch stats",
            error: error.message
        });
    }
});

// ── 6. GET RECENT ACTIVITY ──
router.get('/activity', async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;

        let activity = [];

        switch (userRole) {
            case 'Seller':
                const [sellerActivity] = await db.execute(`
                    (SELECT 
                        CONCAT('Order #', id, ' placed') as action,
                        'order' as type,
                        created_at as time
                    FROM orders 
                    WHERE seller_id = ?
                    ORDER BY created_at DESC 
                    LIMIT 3)
                    UNION ALL
                    (SELECT 
                        CONCAT('Product "', name, '" added') as action,
                        'product' as type,
                        created_at as time
                    FROM products 
                    WHERE seller_id = ? AND deleted_at IS NULL
                    ORDER BY created_at DESC 
                    LIMIT 3)
                    ORDER BY time DESC
                    LIMIT 5
                `, [userId, userId]);
                activity = sellerActivity || [];
                break;

            case 'Buyer':
                const [buyerActivity] = await db.execute(`
                    SELECT 
                        CONCAT('Order #', id, ' - ', status) as action,
                        'order' as type,
                        created_at as time
                    FROM orders 
                    WHERE buyer_id = ?
                    ORDER BY created_at DESC 
                    LIMIT 5
                `, [userId]);
                activity = buyerActivity || [];
                break;

            default:
                activity = [];
        }

        res.status(200).json({
            success: true,
            activity
        });
    } catch (error) {
        console.error("Activity error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch activity",
            error: error.message
        });
    }
});

module.exports = router;