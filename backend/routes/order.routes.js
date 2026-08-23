const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken } = require('../middleware/authMiddleware');
const { createNotification } = require('../controllers/notificationController');

// ── 1. DASHBOARD ──
router.get('/dashboard', authenticateToken, async (req, res) => {
    try {
        const sellerId = req.user.id;
        const [stats] = await db.execute(`
            SELECT
                (SELECT SUM(total_price) FROM orders WHERE seller_id = ? AND status = 'delivered') as sales,
                (SELECT COUNT(*) FROM products WHERE seller_id = ? AND deleted_at IS NULL) as listings,
                (SELECT COUNT(*) FROM orders WHERE seller_id = ? AND status = 'pending') as pending,
                (SELECT COUNT(*) FROM orders WHERE seller_id = ? AND status = 'processing') as processing,
                (SELECT COUNT(*) FROM orders WHERE seller_id = ? AND status = 'shipped') as shipped
        `, [sellerId, sellerId, sellerId, sellerId, sellerId]);

        const [orders] = await db.execute(`
            SELECT
                o.id, 
                o.total_price as total, 
                o.status, 
                u.name as buyer,
                u.email as buyer_email,
                (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as items_count,
                o.created_at
            FROM orders o
            JOIN users u ON o.buyer_id = u.id
            WHERE o.seller_id = ? AND o.status IN ('pending', 'processing')
            ORDER BY o.created_at DESC LIMIT 5
        `, [sellerId]);

        res.status(200).json({ 
            success: true,
            stats: stats[0], 
            orders 
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ 
            success: false,
            message: "Server error", 
            details: error.message 
        });
    }
});

// ── 2. ORDERS LIST ──
router.get('/orders', authenticateToken, async (req, res) => {
    try {
        const sellerId = req.user.id;
        const { search, status, page = 1, limit = 20 } = req.query;
        const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
        const limitNumber = Math.max(parseInt(limit, 10) || 20, 1);
        const offsetNumber = Math.max((pageNumber - 1) * limitNumber, 0);

        let sql = `SELECT 
                    o.*, 
                    u.name as buyer_name, 
                    u.email as buyer_email, 
                    u.phone as buyer_phone, 
                    u.address as buyer_address,
                    (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as items_count
                   FROM orders o
                   JOIN users u ON o.buyer_id = u.id
                   WHERE o.seller_id = ?`;
        const params = [sellerId];

        if (search) { 
            sql += " AND (u.name LIKE ? OR u.email LIKE ?)"; 
            params.push(`%${search}%`, `%${search}%`);
        }
        if (status) { 
            sql += " AND o.status = ?"; 
            params.push(status);
        }

        // Get total count
        let countSql = `SELECT COUNT(*) as total FROM orders o JOIN users u ON o.buyer_id = u.id WHERE o.seller_id = ?`;
        const countParams = [sellerId];
        if (search) {
            countSql += " AND (u.name LIKE ? OR u.email LIKE ?)";
            countParams.push(`%${search}%`, `%${search}%`);
        }
        if (status) {
            countSql += " AND o.status = ?";
            countParams.push(status);
        }
        const [countResult] = await db.execute(countSql, countParams);

        const finalSql = sql + ` ORDER BY o.created_at DESC LIMIT ${limitNumber} OFFSET ${offsetNumber}`;
        const [rows] = await db.execute(finalSql, params);

        res.status(200).json({
            success: true,
            orders: rows,
            pagination: {
                total: countResult[0].total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(countResult[0].total / limit)
            }
        });
    } catch (error) {
        console.error('Orders list error:', error);
        res.status(500).json({ 
            success: false,
            message: "Failed to fetch orders" 
        });
    }
});

// ── 3. ORDER DETAILS ──
router.get('/orders/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const sellerId = req.user.id;

        const [order] = await db.execute(`
            SELECT
                o.*,
                u.name as buyer_name, 
                u.email as buyer_email,
                u.phone as buyer_phone, 
                u.address as buyer_address,
                a.name as agent_name,
                a.phone as agent_phone,
                a.email as agent_email,
                (SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'id', oi.id,
                        'product_id', oi.product_id,
                        'product_name', p.name,
                        'quantity', oi.quantity,
                        'price', oi.price,
                        'subtotal', oi.quantity * oi.price,
                        'image_url', p.image_url
                    )
                ) FROM order_items oi 
                JOIN products p ON oi.product_id = p.id 
                WHERE oi.order_id = o.id) as items
            FROM orders o
            LEFT JOIN users u ON o.buyer_id = u.id
            LEFT JOIN users a ON o.agent_id = a.id
            WHERE o.id = ? AND o.seller_id = ?
        `, [id, sellerId]);

        if (order.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: "Order not found" 
            });
        }

        // Get tracking events
        const [trackingEvents] = await db.execute(`
            SELECT * FROM tracking_events 
            WHERE order_id = ? 
            ORDER BY created_at ASC
        `, [id]);

        res.status(200).json({
            success: true,
            order: order[0],
            tracking_events: trackingEvents
        });
    } catch (error) {
        console.error("Details error:", error);
        res.status(500).json({ 
            success: false,
            message: "Failed to fetch order details" 
        });
    }
});

// ── 4. UPDATE ORDER STATUS (with email + notification) ──
router.put('/orders/:id/status', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const sellerId = req.user.id;

    console.log('[DEBUG] Order status update request', { id, status, sellerId, body: req.body });

    try {
        const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        // 1. Update the order status
        const [result] = await db.execute(
            'UPDATE orders SET status = ? WHERE id = ? AND seller_id = ?',
            [status, id, sellerId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Order not found or unauthorized'
            });
        }

        // 2. Get buyer details
        const [rows] = await db.execute(`
            SELECT u.id as buyer_id, o.buyer_id 
            FROM orders o
            JOIN users u ON o.buyer_id = u.id
            WHERE o.id = ?
        `, [id]);

        if (rows.length > 0) {
            const { buyer_id } = rows[0];

            // Create the in-app notification and its email from one central path.
            if (buyer_id) {
                const statusMessages = {
                    'pending': 'Your order is pending confirmation',
                    'processing': 'Your order is being processed',
                    'shipped': 'Your order has been shipped!',
                    'delivered': 'Your order has been delivered!',
                    'cancelled': 'Your order has been cancelled'
                };
                try {
                    await createNotification(
                        buyer_id,
                        'order_status',
                        `Order #${id} ${status}`,
                        statusMessages[status] || `Your order status has been updated to "${status}".`,
                        `/buyer/orders/${id}`
                    );
                } catch (err) {
                    console.error('Notification error:', err);
                }
            }
        }

        // 5. Add tracking event if status is not pending
        if (status !== 'pending') {
            await db.execute(
                `INSERT INTO tracking_events (order_id, status, notes) VALUES (?, ?, ?)`,
                [id, status, `Order status updated to ${status}`]
            );
        }

        res.status(200).json({
            success: true,
            message: "Order status updated successfully"
        });
    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({ 
            success: false,
            message: "Failed to update status" 
        });
    }
});

// ── 5. ANALYTICS ──
// NOTE: Seller analytics endpoints are handled in analytics.routes.js to avoid route collisions with product routes and to keep analytics logic centralized.

// ── 6. SELLER TRACKING MANAGEMENT ──

// 6a. Update tracking number and estimated delivery
router.put('/orders/:id/tracking', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const sellerId = req.user.id;
        const { trackingNumber, estimatedDelivery, courier } = req.body;

        // Verify order belongs to this seller
        const [order] = await db.execute(
            'SELECT id, buyer_id FROM orders WHERE id = ? AND seller_id = ?',
            [id, sellerId]
        );
        if (order.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Order not found or not yours' 
            });
        }

        // Build update query dynamically
        const updates = [];
        const values = [];
        if (trackingNumber !== undefined && trackingNumber !== '') {
            updates.push('tracking_number = ?');
            values.push(trackingNumber);
        }
        if (estimatedDelivery !== undefined && estimatedDelivery !== '') {
            updates.push('estimated_delivery = ?');
            values.push(estimatedDelivery);
        }
        if (courier !== undefined && courier !== '') {
            updates.push('courier = ?');
            values.push(courier);
        }

        if (updates.length === 0) {
            return res.status(400).json({ 
                success: false,
                message: 'No fields to update' 
            });
        }

        values.push(id);
        await db.execute(
            `UPDATE orders SET ${updates.join(', ')} WHERE id = ?`,
            values
        );

        // Add tracking event
        if (trackingNumber) {
            await db.execute(
                `INSERT INTO tracking_events (order_id, status, notes) VALUES (?, ?, ?)`,
                [id, 'shipped', `Tracking number: ${trackingNumber}`]
            );
            
            // Update order status to shipped if tracking number provided
            await db.execute(
                `UPDATE orders SET status = 'shipped' WHERE id = ? AND status = 'processing'`,
                [id]
            );
        }

        res.json({ 
            success: true,
            message: 'Tracking updated successfully' 
        });
    } catch (error) {
        console.error('Update tracking error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error' 
        });
    }
});

// 6b. Add a tracking event
router.post('/orders/:id/tracking/event', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const sellerId = req.user.id;
        const { status, description, location } = req.body;

        if (!status) {
            return res.status(400).json({ 
                success: false,
                message: 'Status is required' 
            });
        }

        // Verify order belongs to this seller
        const [order] = await db.execute(
            'SELECT id FROM orders WHERE id = ? AND seller_id = ?',
            [id, sellerId]
        );
        if (order.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Order not found or not yours' 
            });
        }

        // Insert tracking event
        await db.execute(
            `INSERT INTO tracking_events (order_id, status, notes, location_address) VALUES (?, ?, ?, ?)`,
            [id, status, description || '', location || '']
        );

        // Update the order's main status if needed
        const statusMap = ['assigned', 'picked_up', 'in_transit', 'arrived', 'delivered'];
        if (statusMap.includes(status)) {
            await db.execute(
                `UPDATE orders SET status = ? WHERE id = ?`,
                [status, id]
            );
        }

        res.json({ 
            success: true,
            message: 'Tracking event added successfully' 
        });
    } catch (error) {
        console.error('Add tracking event error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error' 
        });
    }
});

// 6c. Get tracking events for an order
router.get('/orders/:id/tracking', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const sellerId = req.user.id;

        // Verify order belongs to this seller
        const [order] = await db.execute(
            'SELECT id FROM orders WHERE id = ? AND seller_id = ?',
            [id, sellerId]
        );
        if (order.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Order not found or not yours' 
            });
        }

        const [events] = await db.execute(`
            SELECT * FROM tracking_events 
            WHERE order_id = ? 
            ORDER BY created_at ASC
        `, [id]);

        res.json({
            success: true,
            events
        });
    } catch (error) {
        console.error('Get tracking events error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error' 
        });
    }
});

module.exports = router;