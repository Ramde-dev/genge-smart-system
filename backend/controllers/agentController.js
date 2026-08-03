const pool = require('../config/db');

// ── Get deliveries assigned to the logged-in agent ──
exports.getDeliveries = async (req, res) => {
    try {
        const agentId = req.user.id; // agent's user ID from JWT token

        // Get the agent's delivery_agent ID
        const [agent] = await pool.query(
            'SELECT id FROM delivery_agents WHERE user_id = ?',
            [agentId]
        );
        if (agent.length === 0) {
            return res.json([]);
        }

        const agentDeliveryId = agent[0].id;

        // Fetch all deliveries assigned to this agent with tracking info
        const [deliveries] = await pool.query(`
            SELECT 
                d.*,
                u.name as buyer_name,
                u.address as buyer_address,
                u.phone as buyer_phone,
                o.total_price,
                o.status as order_status,
                o.created_at as order_created_at,
                o.agent_assigned_at,
                o.tracking_updated_at,
                te.latitude,
                te.longitude,
                te.location_address as last_location,
                te.created_at as last_update,
                (SELECT COUNT(*) FROM tracking_events WHERE order_id = o.id) as tracking_count
            FROM deliveries d
            JOIN orders o ON d.order_id = o.id
            JOIN users u ON o.buyer_id = u.id
            LEFT JOIN tracking_events te ON o.id = te.order_id 
                AND te.id = (SELECT MAX(id) FROM tracking_events WHERE order_id = o.id)
            WHERE d.agent_id = ?
            ORDER BY d.created_at DESC
        `, [agentDeliveryId]);

        res.json({
            success: true,
            deliveries
        });
    } catch (err) {
        console.error('Get agent deliveries error:', err);
        res.status(500).json({ 
            success: false,
            message: 'Server error',
            error: err.message 
        });
    }
};

// ── Get single delivery details ──
exports.getDeliveryDetails = async (req, res) => {
    try {
        const agentId = req.user.id;
        const { deliveryId } = req.params;

        // Get the agent's delivery_agent ID
        const [agent] = await pool.query(
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

        // Fetch delivery details
        const [delivery] = await pool.query(`
            SELECT 
                d.*,
                u.name as buyer_name,
                u.email as buyer_email,
                u.address as buyer_address,
                u.phone as buyer_phone,
                o.total_price,
                o.status as order_status,
                o.created_at as order_created_at,
                o.agent_assigned_at,
                o.tracking_updated_at,
                te.latitude,
                te.longitude,
                te.location_address as last_location,
                te.created_at as last_update
            FROM deliveries d
            JOIN orders o ON d.order_id = o.id
            JOIN users u ON o.buyer_id = u.id
            LEFT JOIN tracking_events te ON o.id = te.order_id 
                AND te.id = (SELECT MAX(id) FROM tracking_events WHERE order_id = o.id)
            WHERE d.id = ? 
            AND (d.agent_id = ? OR d.agent_id = (SELECT id FROM delivery_agents WHERE user_id = ?))
        `, [deliveryId, agentDeliveryId, agentId]);

        if (delivery.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Delivery not found'
            });
        }

        // Get all tracking events for timeline
        const [events] = await pool.query(`
            SELECT 
                id,
                latitude,
                longitude,
                location_address,
                status,
                notes,
                created_at
            FROM tracking_events
            WHERE order_id = ?
            ORDER BY created_at ASC
        `, [delivery[0].order_id]);

        res.json({
            success: true,
            delivery: delivery[0],
            events
        });
    } catch (err) {
        console.error('Get delivery details error:', err);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: err.message
        });
    }
};

// ── Update agent location ──
exports.updateLocation = async (req, res) => {
    try {
        const agentId = req.user.id;
        const deliveryId = req.body.deliveryId || req.body.orderId;
        const { latitude, longitude, address } = req.body;

        if (!deliveryId || !latitude || !longitude) {
            return res.status(400).json({
                success: false,
                message: 'Delivery ID, latitude and longitude are required'
            });
        }

        // Get the agent's delivery_agent ID
        const [agent] = await pool.query(
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

        // Verify this delivery is assigned to this agent
        const [deliveryCheck] = await pool.query(
            `SELECT d.id, d.order_id, o.buyer_id, o.status 
             FROM deliveries d 
             JOIN orders o ON d.order_id = o.id 
             WHERE d.id = ? 
             AND (d.agent_id = ? OR d.agent_id = (SELECT id FROM delivery_agents WHERE user_id = ?))`,
            [deliveryId, agentDeliveryId, agentId]
        );

        if (deliveryCheck.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'You are not assigned to this delivery'
            });
        }

        // Insert tracking event
        const [result] = await pool.query(`
            INSERT INTO tracking_events 
            (order_id, agent_id, latitude, longitude, location_address, status) 
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            deliveryCheck[0].order_id,
            agentId,
            latitude,
            longitude,
            address || null,
            deliveryCheck[0].status || 'in_transit'
        ]);

        // Update order tracking timestamp
        await pool.query(
            'UPDATE orders SET tracking_updated_at = NOW() WHERE id = ?',
            [deliveryCheck[0].order_id]
        );

        // Update delivery last_location if available
        if (address) {
            await pool.query(
                'UPDATE deliveries SET last_location = ?, current_lat = ?, current_lng = ?, updated_at = NOW() WHERE id = ?',
                [address, latitude, longitude, deliveryId]
            );
        } else {
            await pool.query(
                'UPDATE deliveries SET current_lat = ?, current_lng = ?, updated_at = NOW() WHERE id = ?',
                [latitude, longitude, deliveryId]
            );
        }

        // Create notification for buyer
        await pool.query(`
            INSERT INTO notifications 
            (user_id, order_id, title, message, type) 
            VALUES (?, ?, ?, ?, ?)
        `, [
            deliveryCheck[0].buyer_id,
            deliveryCheck[0].order_id,
            '📍 Location Updated',
            `Your delivery agent has updated their location for Order #${deliveryCheck[0].order_id}`,
            'tracking'
        ]);

        res.json({
            success: true,
            message: 'Location updated successfully',
            tracking_id: result.insertId
        });

    } catch (err) {
        console.error('Update location error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to update location',
            error: err.message
        });
    }
};

// ── Update delivery status ──
exports.updateDeliveryStatus = async (req, res) => {
    try {
        const agentId = req.user.id;
        const { deliveryId } = req.params;
        const { status, notes } = req.body;

        const validStatuses = ['assigned', 'picked_up', 'in_transit', 'arrived', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Valid statuses: ' + validStatuses.join(', ')
            });
        }

        // Get the agent's delivery_agent ID
        const [agent] = await pool.query(
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

        // Verify this delivery is assigned to this agent
        const [deliveryCheck] = await pool.query(
            'SELECT d.id, d.order_id, o.buyer_id FROM deliveries d JOIN orders o ON d.order_id = o.id WHERE d.id = ? AND d.agent_id = ?',
            [deliveryId, agentDeliveryId]
        );

        if (deliveryCheck.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'You are not assigned to this delivery'
            });
        }

        // Update delivery status
        await pool.query(
            'UPDATE deliveries SET status = ? WHERE id = ?',
            [status, deliveryId]
        );

        // Update order status
        await pool.query(
            'UPDATE orders SET status = ? WHERE id = ?',
            [status, deliveryCheck[0].order_id]
        );

        // Add tracking event
        await pool.query(`
            INSERT INTO tracking_events 
            (order_id, agent_id, status, notes) 
            VALUES (?, ?, ?, ?)
        `, [deliveryCheck[0].order_id, agentId, status, notes || null]);

        // Create notification for buyer
        const statusMessages = {
            'assigned': 'A delivery agent has been assigned to your order 👤',
            'picked_up': 'Your order has been picked up by the delivery agent! 🚚',
            'in_transit': 'Your order is on the way to you! 🚗',
            'arrived': 'Your order has arrived at your location! 📍',
            'delivered': 'Your order has been delivered! ✅ Thank you for shopping with us!',
            'cancelled': 'Your order has been cancelled ❌'
        };

        await pool.query(`
            INSERT INTO notifications 
            (user_id, order_id, title, message, type) 
            VALUES (?, ?, ?, ?, ?)
        `, [
            deliveryCheck[0].buyer_id,
            deliveryCheck[0].order_id,
            `📦 Order #${deliveryCheck[0].order_id} Updated`,
            statusMessages[status] || `Delivery status updated to: ${status}`,
            'order'
        ]);

        // If delivered, also notify that delivery is complete
        if (status === 'delivered') {
            await pool.query(`
                INSERT INTO notifications 
                (user_id, order_id, title, message, type) 
                VALUES (?, ?, ?, ?, ?)
            `, [
                deliveryCheck[0].buyer_id,
                deliveryCheck[0].order_id,
                '✅ Delivery Complete',
                'Your order has been successfully delivered! Thank you for shopping with us!',
                'order'
            ]);
        }

        res.json({
            success: true,
            message: `Delivery status updated to ${status}`
        });

    } catch (err) {
        console.error('Update delivery status error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to update delivery status',
            error: err.message
        });
    }
};

// ── Get tracking history for an order ──
exports.getTrackingHistory = async (req, res) => {
    try {
        const agentId = req.user.id;
        const { orderId } = req.params;

        // Get the agent's delivery_agent ID
        const [agent] = await pool.query(
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

        // Verify delivery belongs to agent
        const [deliveryCheck] = await pool.query(
            'SELECT id FROM deliveries WHERE order_id = ? AND agent_id = ?',
            [orderId, agentDeliveryId]
        );

        if (deliveryCheck.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'You do not have access to this order'
            });
        }

        const [events] = await pool.query(`
            SELECT 
                te.*,
                u.name as agent_name,
                u.phone as agent_phone
            FROM tracking_events te
            JOIN users u ON te.agent_id = u.id
            WHERE te.order_id = ?
            ORDER BY te.created_at ASC
        `, [orderId]);

        res.json({
            success: true,
            events
        });

    } catch (err) {
        console.error('Get tracking history error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch tracking history',
            error: err.message
        });
    }
};

// ── Get agent profile with stats ──
exports.getAgentProfile = async (req, res) => {
    try {
        const agentId = req.user.id;

        const [profile] = await pool.query(`
            SELECT 
                u.id,
                u.name,
                u.email,
                u.phone,
                u.address,
                u.avatar_url,
                u.status,
                u.created_at,
                da.id as delivery_agent_id,
                da.is_available,
                (SELECT COUNT(*) FROM deliveries d WHERE d.agent_id = da.id AND d.status = 'delivered') as completed_deliveries,
                (SELECT COUNT(*) FROM deliveries d WHERE d.agent_id = da.id AND d.status != 'delivered' AND d.status != 'cancelled') as active_deliveries,
                (SELECT COUNT(*) FROM deliveries d WHERE d.agent_id = da.id) as total_deliveries
            FROM users u
            LEFT JOIN delivery_agents da ON u.id = da.user_id
            WHERE u.id = ? AND u.role = 'agent'
        `, [agentId]);

        if (profile.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Agent not found'
            });
        }

        res.json({
            success: true,
            profile: profile[0]
        });

    } catch (err) {
        console.error('Get agent profile error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch agent profile',
            error: err.message
        });
    }
};

// ── Toggle agent availability ──
exports.toggleAvailability = async (req, res) => {
    try {
        const agentId = req.user.id;

        // Get the agent's delivery_agent ID
        const [agent] = await pool.query(
            'SELECT id, is_available FROM delivery_agents WHERE user_id = ?',
            [agentId]
        );

        if (agent.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Agent not found'
            });
        }

        const newStatus = !agent[0].is_available;

        await pool.query(
            'UPDATE delivery_agents SET is_available = ? WHERE user_id = ?',
            [newStatus, agentId]
        );

        res.json({
            success: true,
            message: `You are now ${newStatus ? 'available' : 'unavailable'}`,
            is_available: newStatus
        });

    } catch (err) {
        console.error('Toggle availability error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to toggle availability',
            error: err.message
        });
    }
};

// ── Get all tracking events for agent's deliveries ──
exports.getTrackingEvents = async (req, res) => {
    try {
        const agentId = req.user.id;

        // Get the agent's delivery_agent ID
        const [agent] = await pool.query(
            'SELECT id FROM delivery_agents WHERE user_id = ?',
            [agentId]
        );
        if (agent.length === 0) {
            return res.json([]);
        }

        const agentDeliveryId = agent[0].id;

        const [events] = await pool.query(`
            SELECT 
                te.*,
                o.id as order_id,
                u.name as buyer_name
            FROM tracking_events te
            JOIN orders o ON te.order_id = o.id
            JOIN users u ON o.buyer_id = u.id
            JOIN deliveries d ON d.order_id = o.id
            WHERE d.agent_id = ?
            ORDER BY te.created_at DESC
            LIMIT 100
        `, [agentDeliveryId]);

        res.json({
            success: true,
            events
        });

    } catch (err) {
        console.error('Get tracking events error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch tracking events',
            error: err.message
        });
    }
};