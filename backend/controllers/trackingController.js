const pool = require('../config/db');

// ── Get tracking info for a specific order ──
exports.getTrackingInfo = async (req, res) => {
    try {
        const { orderId } = req.params;
        const buyerId = req.user.id;

        // Verify order belongs to buyer
        const [orderCheck] = await pool.query(
            `SELECT 
                o.id, 
                o.agent_id, 
                o.status, 
                o.total_price, 
                o.created_at,
                o.agent_assigned_at,
                o.tracking_updated_at
            FROM orders o
            WHERE o.id = ? AND o.buyer_id = ?`,
            [orderId, buyerId]
        );

        if (orderCheck.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Get latest tracking info
        const [tracking] = await pool.query(`
            SELECT 
                te.*,
                u.name as agent_name,
                u.phone as agent_phone,
                u.avatar_url as agent_avatar,
                u.email as agent_email
            FROM tracking_events te
            JOIN users u ON te.agent_id = u.id
            WHERE te.order_id = ?
            ORDER BY te.created_at DESC
            LIMIT 1
        `, [orderId]);

        // Get all tracking events for timeline
        const [events] = await pool.query(`
            SELECT 
                te.*,
                u.name as agent_name
            FROM tracking_events te
            LEFT JOIN users u ON te.agent_id = u.id
            WHERE te.order_id = ?
            ORDER BY te.created_at ASC
        `, [orderId]);

        // Get agent info if assigned
        let agentInfo = null;
        if (orderCheck[0].agent_id) {
            const [agent] = await pool.query(`
                SELECT 
                    u.id, 
                    u.name, 
                    u.email, 
                    u.phone, 
                    u.avatar_url,
                    u.address,
                    da.is_available
                FROM users u
                LEFT JOIN delivery_agents da ON u.id = da.user_id
                WHERE u.id = ?
            `, [orderCheck[0].agent_id]);
            agentInfo = agent[0] || null;
        }

        res.json({
            success: true,
            order: {
                id: orderCheck[0].id,
                status: orderCheck[0].status,
                total_price: orderCheck[0].total_price,
                created_at: orderCheck[0].created_at,
                agent_assigned_at: orderCheck[0].agent_assigned_at,
                tracking_updated_at: orderCheck[0].tracking_updated_at
            },
            tracking: tracking[0] || null,
            events: events || [],
            agent: agentInfo
        });

    } catch (err) {
        console.error('Get tracking info error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch tracking info',
            error: err.message
        });
    }
};

// ── Get all tracked orders for buyer ──
exports.getTrackedOrders = async (req, res) => {
    try {
        const buyerId = req.user.id;

        const [orders] = await pool.query(`
            SELECT 
                o.id,
                o.status,
                o.total_price,
                o.created_at,
                o.agent_assigned_at,
                o.tracking_updated_at,
                u.name as agent_name,
                u.phone as agent_phone,
                u.avatar_url as agent_avatar,
                (SELECT latitude FROM tracking_events WHERE order_id = o.id ORDER BY created_at DESC LIMIT 1) as last_latitude,
                (SELECT longitude FROM tracking_events WHERE order_id = o.id ORDER BY created_at DESC LIMIT 1) as last_longitude,
                (SELECT created_at FROM tracking_events WHERE order_id = o.id ORDER BY created_at DESC LIMIT 1) as last_update,
                (SELECT location_address FROM tracking_events WHERE order_id = o.id ORDER BY created_at DESC LIMIT 1) as last_location,
                (SELECT status FROM tracking_events WHERE order_id = o.id ORDER BY created_at DESC LIMIT 1) as last_status
            FROM orders o
            LEFT JOIN users u ON o.agent_id = u.id
            WHERE o.buyer_id = ? 
            AND o.agent_id IS NOT NULL
            ORDER BY o.created_at DESC
        `, [buyerId]);

        res.json({
            success: true,
            orders
        });

    } catch (err) {
        console.error('Get tracked orders error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch tracked orders',
            error: err.message
        });
    }
};

// ── Get notifications for user ──
exports.getNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 50, offset = 0 } = req.query;

        const [notifications] = await pool.query(`
            SELECT 
                id,
                order_id,
                title,
                message,
                type,
                is_read,
                created_at,
                (SELECT status FROM orders WHERE id = notifications.order_id) as order_status
            FROM notifications
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `, [userId, parseInt(limit), parseInt(offset)]);

        // Get unread count
        const [unreadResult] = await pool.query(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
            [userId]
        );

        res.json({
            success: true,
            notifications,
            unread_count: unreadResult[0].count || 0,
            total: notifications.length
        });

    } catch (err) {
        console.error('Get notifications error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch notifications',
            error: err.message
        });
    }
};

// ── Mark notification as read ──
exports.markNotificationRead = async (req, res) => {
    try {
        const { notificationId } = req.params;
        const userId = req.user.id;

        const [result] = await pool.query(
            'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
            [notificationId, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        res.json({
            success: true,
            message: 'Notification marked as read'
        });

    } catch (err) {
        console.error('Mark notification read error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to mark notification as read',
            error: err.message
        });
    }
};

// ── Mark all notifications as read ──
exports.markAllNotificationsRead = async (req, res) => {
    try {
        const userId = req.user.id;

        const [result] = await pool.query(
            'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
            [userId]
        );

        res.json({
            success: true,
            message: `${result.affectedRows} notifications marked as read`
        });

    } catch (err) {
        console.error('Mark all notifications read error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to mark all notifications as read',
            error: err.message
        });
    }
};

// ── Get unread notification count ──
exports.getUnreadCount = async (req, res) => {
    try {
        const userId = req.user.id;

        const [result] = await pool.query(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
            [userId]
        );

        res.json({
            success: true,
            count: parseInt(result[0].count) || 0
        });

    } catch (err) {
        console.error('Get unread count error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to get unread count',
            error: err.message
        });
    }
};

// ── Delete notification ──
exports.deleteNotification = async (req, res) => {
    try {
        const { notificationId } = req.params;
        const userId = req.user.id;

        const [result] = await pool.query(
            'DELETE FROM notifications WHERE id = ? AND user_id = ?',
            [notificationId, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        res.json({
            success: true,
            message: 'Notification deleted'
        });

    } catch (err) {
        console.error('Delete notification error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to delete notification',
            error: err.message
        });
    }
};

// ── Get tracking stats for buyer ──
exports.getTrackingStats = async (req, res) => {
    try {
        const userId = req.user.id;

        const [stats] = await pool.query(`
            SELECT 
                COUNT(*) as total_orders,
                SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered_orders,
                SUM(CASE WHEN status = 'in_transit' THEN 1 ELSE 0 END) as in_transit_orders,
                SUM(CASE WHEN status = 'assigned' THEN 1 ELSE 0 END) as assigned_orders,
                SUM(CASE WHEN status = 'picked_up' THEN 1 ELSE 0 END) as picked_up_orders,
                SUM(CASE WHEN status = 'arrived' THEN 1 ELSE 0 END) as arrived_orders
            FROM orders
            WHERE buyer_id = ? AND agent_id IS NOT NULL
        `, [userId]);

        // Get recent tracking updates
        const [recent] = await pool.query(`
            SELECT 
                o.id as order_id,
                o.status,
                te.created_at as last_update,
                te.location_address
            FROM orders o
            JOIN tracking_events te ON o.id = te.order_id
            WHERE o.buyer_id = ? 
            AND te.id IN (SELECT MAX(id) FROM tracking_events GROUP BY order_id)
            ORDER BY te.created_at DESC
            LIMIT 5
        `, [userId]);

        res.json({
            success: true,
            stats: stats[0] || {
                total_orders: 0,
                delivered_orders: 0,
                in_transit_orders: 0,
                assigned_orders: 0,
                picked_up_orders: 0,
                arrived_orders: 0
            },
            recent_updates: recent || []
        });

    } catch (err) {
        console.error('Get tracking stats error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch tracking stats',
            error: err.message
        });
    }
};

// ── Get agent's current location for a specific order ──
exports.getAgentLocation = async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.user.id;

        // Verify order belongs to user
        const [orderCheck] = await pool.query(
            'SELECT id, agent_id FROM orders WHERE id = ? AND buyer_id = ?',
            [orderId, userId]
        );

        if (orderCheck.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        if (!orderCheck[0].agent_id) {
            return res.status(400).json({
                success: false,
                message: 'No agent assigned to this order yet'
            });
        }

        // Get latest location
        const [location] = await pool.query(`
            SELECT 
                latitude,
                longitude,
                location_address,
                created_at as updated_at,
                u.name as agent_name,
                u.phone as agent_phone
            FROM tracking_events te
            JOIN users u ON te.agent_id = u.id
            WHERE te.order_id = ?
            ORDER BY te.created_at DESC
            LIMIT 1
        `, [orderId]);

        if (location.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No location data available yet'
            });
        }

        res.json({
            success: true,
            location: location[0]
        });

    } catch (err) {
        console.error('Get agent location error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to get agent location',
            error: err.message
        });
    }
};

// ── Create a test notification (for development) ──
exports.createTestNotification = async (req, res) => {
    try {
        const { userId, orderId, title, message, type } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        await pool.query(`
            INSERT INTO notifications 
            (user_id, order_id, title, message, type) 
            VALUES (?, ?, ?, ?, ?)
        `, [
            userId,
            orderId || null,
            title || 'Test Notification',
            message || 'This is a test notification',
            type || 'info'
        ]);

        res.json({
            success: true,
            message: 'Test notification created'
        });

    } catch (err) {
        console.error('Create test notification error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to create test notification',
            error: err.message
        });
    }
};