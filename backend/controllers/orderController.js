const db = require('../config/db');

// ── Create an order (buyer side) ──
exports.createOrder = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const { seller_id, total_price, items } = req.body;
        const buyer_id = req.user.id;

        // 1. Insert into 'orders'
        const [orderResult] = await connection.execute(
            'INSERT INTO orders (buyer_id, seller_id, total_price, status) VALUES (?, ?, ?, ?)',
            [buyer_id, seller_id, total_price, 'pending']
        );
        const orderId = orderResult.insertId;

        // 2. Insert into 'order_items'
        for (let item of items) {
            await connection.execute(
                'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
                [orderId, item.product_id, item.quantity, item.price]
            );
        }

        // Optional: Insert initial tracking event
        await connection.execute(
            'INSERT INTO tracking_events (order_id, status, description) VALUES (?, ?, ?)',
            [orderId, 'pending', 'Order placed and awaiting processing']
        );

        await connection.commit();
        res.status(201).json({ message: "Order placed successfully!", orderId });

    } catch (error) {
        await connection.rollback();
        console.error("Order creation error:", error);
        res.status(500).json({ message: "Failed to place order", error: error.message });
    } finally {
        connection.release();
    }
};

// ── Get orders for Seller Dashboard ──
exports.getSellerOrders = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const [orders] = await db.execute(`
            SELECT o.*, u.name as buyer_name 
            FROM orders o
            JOIN users u ON o.buyer_id = u.id
            WHERE o.seller_id = ?
            ORDER BY o.created_at DESC
        `, [sellerId]);

        res.json(orders);
    } catch (error) {
        console.error("Fetch seller orders error:", error);
        res.status(500).json({ message: "Error fetching orders" });
    }
};

// ── Seller: Update order tracking info ──
exports.updateOrderTracking = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const { orderId, trackingNumber, estimatedDelivery } = req.body;

        if (!orderId) {
            return res.status(400).json({ message: 'Order ID is required' });
        }

        // Verify order belongs to this seller
        const [order] = await db.execute(
            'SELECT id FROM orders WHERE id = ? AND seller_id = ?',
            [orderId, sellerId]
        );
        if (order.length === 0) {
            return res.status(404).json({ message: 'Order not found or not yours' });
        }

        // Build update query
        const updates = [];
        const values = [];
        if (trackingNumber !== undefined) {
            updates.push('tracking_number = ?');
            values.push(trackingNumber);
        }
        if (estimatedDelivery !== undefined) {
            updates.push('estimated_delivery = ?');
            values.push(estimatedDelivery);
        }

        if (updates.length === 0) {
            return res.status(400).json({ message: 'No fields to update' });
        }

        values.push(orderId);
        await db.execute(
            `UPDATE orders SET ${updates.join(', ')} WHERE id = ?`,
            values
        );

        res.json({ message: 'Tracking updated successfully' });
    } catch (err) {
        console.error('Update tracking error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// ── Seller: Add a tracking event ──
exports.addTrackingEvent = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const { orderId, status, description } = req.body;

        if (!orderId || !status) {
            return res.status(400).json({ message: 'Order ID and status are required' });
        }

        // Verify order belongs to this seller
        const [order] = await db.execute(
            'SELECT id FROM orders WHERE id = ? AND seller_id = ?',
            [orderId, sellerId]
        );
        if (order.length === 0) {
            return res.status(404).json({ message: 'Order not found or not yours' });
        }

        // Insert tracking event
        await db.execute(
            `INSERT INTO tracking_events (order_id, status, description) VALUES (?, ?, ?)`,
            [orderId, status, description || '']
        );

        // Update order status to match the latest event status
        await db.execute(
            `UPDATE orders SET status = ? WHERE id = ?`,
            [status, orderId]
        );

        res.json({ message: 'Tracking event added successfully' });
    } catch (err) {
        console.error('Add tracking event error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// ── Seller: Get tracking history for a specific order ──
exports.getOrderTrackingHistory = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const { orderId } = req.params;

        // Verify order belongs to this seller
        const [order] = await db.execute(
            'SELECT id FROM orders WHERE id = ? AND seller_id = ?',
            [orderId, sellerId]
        );
        if (order.length === 0) {
            return res.status(404).json({ message: 'Order not found or not yours' });
        }

        // Get all tracking events
        const [events] = await db.execute(
            `SELECT id, status, description, created_at 
             FROM tracking_events 
             WHERE order_id = ? 
             ORDER BY created_at ASC`,
            [orderId]
        );

        res.json(events);
    } catch (err) {
        console.error('Get tracking history error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};