const pool = require('../config/db');

// ── Helper: Create notification ──
const createNotification = async (userId, type, title, message, link = null) => {
    try {
        await pool.query(
            `INSERT INTO notifications (user_id, type, title, message, link) 
             VALUES (?, ?, ?, ?, ?)`,
            [userId, type, title, message, link]
        );
    } catch (err) {
        console.error('Failed to create notification:', err);
    }
};

// ── 1. Admin: Get all agents ──
exports.getAgents = async (req, res) => {
    try {
        const [agents] = await pool.query(
            'SELECT * FROM delivery_agents ORDER BY name'
        );
        res.json({ success: true, agents });
    } catch (err) {
        console.error('Get agents error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ── Get available agents (for sellers to assign) ──
exports.getAvailableAgents = async (req, res) => {
    try {
        const [agents] = await pool.query(`
            SELECT u.id, u.name, u.email, u.phone, u.avatar_url, da.id as delivery_agent_id, da.is_available,
                (SELECT COUNT(*) FROM orders WHERE agent_id = u.id AND status NOT IN ('delivered','cancelled')) as active_deliveries
            FROM users u
            JOIN delivery_agents da ON u.id = da.user_id
            WHERE u.role = 'agent' AND u.status = 'active' AND da.is_available = TRUE
            ORDER BY u.name ASC
        `);

        res.json({ success: true, agents });
    } catch (err) {
        console.error('Get available agents error:', err);
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
};

// ── 2. Admin: Add a new agent ──
exports.addAgent = async (req, res) => {
    try {
        const { name, phone } = req.body;
        const [result] = await pool.query(
            'INSERT INTO delivery_agents (name, phone) VALUES (?, ?)',
            [name, phone]
        );
        res.status(201).json({
            id: result.insertId,
            message: 'Agent added successfully'
        });
    } catch (err) {
        console.error('Add agent error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// ── 3. Admin: Toggle agent availability ──
exports.toggleAgentAvailability = async (req, res) => {
    try {
        const { agentId } = req.params;
        const [agent] = await pool.query(
            'SELECT is_available FROM delivery_agents WHERE id = ?',
            [agentId]
        );
        if (agent.length === 0) {
            return res.status(404).json({ message: 'Agent not found' });
        }
        const newStatus = !agent[0].is_available;
        await pool.query(
            'UPDATE delivery_agents SET is_available = ? WHERE id = ?',
            [newStatus, agentId]
        );
        res.json({
            message: `Agent ${newStatus ? 'available' : 'unavailable'}`
        });
    } catch (err) {
        console.error('Toggle agent error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// ── 4. Seller: Assign agent to an order ──
exports.assignDelivery = async (req, res) => {
    try {
        const { orderId, agentId } = req.body;
        const sellerId = req.user.id;

        // Verify order belongs to seller
        const [order] = await pool.query(
            'SELECT id, buyer_id FROM orders WHERE id = ? AND seller_id = ?',
            [orderId, sellerId]
        );
        if (order.length === 0) {
            return res.status(404).json({ message: 'Order not found or unauthorized' });
        }

        // Check agent is available
        const [agent] = await pool.query(
            'SELECT id, name, phone FROM delivery_agents WHERE id = ? AND is_available = TRUE',
            [agentId]
        );
        if (agent.length === 0) {
            return res.status(400).json({ message: 'Agent not available' });
        }

        // Check if delivery already exists
        const [existing] = await pool.query(
            'SELECT id FROM deliveries WHERE order_id = ?',
            [orderId]
        );

        if (existing.length > 0) {
            await pool.query(
                `UPDATE deliveries 
                 SET agent_id = ?, status = 'assigned' 
                 WHERE order_id = ?`,
                [agentId, orderId]
            );
        } else {
            await pool.query(
                `INSERT INTO deliveries (order_id, agent_id, status) 
                 VALUES (?, ?, 'assigned')`,
                [orderId, agentId]
            );
        }

        // Update order agent_id to the assigned delivery agent's user account,
        // mark order as assigned, and record assignment time.
        await pool.query(
            `UPDATE orders o
             JOIN delivery_agents da ON da.id = ?
             SET o.agent_id = da.user_id,
                 o.agent_assigned_at = NOW(),
                 o.status = 'assigned',
                 o.tracking_updated_at = NOW()
             WHERE o.id = ?`,
            [agentId, orderId]
        );

        // Add tracking event for assignment
        await pool.query(
            `INSERT INTO tracking_events (order_id, agent_id, status, notes)
             VALUES (?, (SELECT user_id FROM delivery_agents WHERE id = ?), 'assigned', 'Delivery agent assigned to order')`,
            [orderId, agentId]
        );

        // Mark agent as busy
        await pool.query(
            'UPDATE delivery_agents SET is_available = FALSE WHERE id = ?',
            [agentId]
        );

        // Notify buyer about assignment
        await createNotification(
            order[0].buyer_id,
            'delivery_assigned',
            `Delivery agent assigned for order #${orderId}`,
            `${agent[0].name} (${agent[0].phone}) will deliver your order.`,
            `/buyer/tracking/${orderId}`
        );

        res.json({ message: 'Delivery assigned successfully' });
    } catch (err) {
        console.error('Assign delivery error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// ── 5. Agent: Update live location ──
exports.updateLocation = async (req, res) => {
    try {
        const { deliveryId, lat, lng } = req.body;
        await pool.query(
            `UPDATE deliveries 
             SET current_lat = ?, current_lng = ?, updated_at = NOW() 
             WHERE id = ?`,
            [lat, lng, deliveryId]
        );
        res.json({ message: 'Location updated' });
    } catch (err) {
        console.error('Update location error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// ── 6. Get delivery status (for buyer/seller) ──
exports.getDeliveryStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const [delivery] = await pool.query(
            `SELECT d.*, a.name as agent_name, a.phone as agent_phone 
             FROM deliveries d
             JOIN delivery_agents a ON d.agent_id = a.id
             WHERE d.order_id = ?`,
            [orderId]
        );
        if (delivery.length === 0) {
            return res.status(404).json({ message: 'No delivery found' });
        }
        res.json(delivery[0]);
    } catch (err) {
        console.error('Get delivery status error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Alias to get delivery by order id
exports.getDeliveryByOrder = async (req, res) => {
    try {
        // reuse getDeliveryStatus logic
        const { orderId } = req.params;
        const [delivery] = await pool.query(
            `SELECT d.*, a.name as agent_name, a.phone as agent_phone 
             FROM deliveries d
             JOIN delivery_agents a ON d.agent_id = a.id
             WHERE d.order_id = ?`,
            [orderId]
        );
        if (delivery.length === 0) {
            return res.status(404).json({ message: 'No delivery found' });
        }
        res.json({ success: true, delivery: delivery[0] });
    } catch (err) {
        console.error('Get delivery by order error:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// ── 7. Buyer: Confirm delivery ──
exports.confirmDelivery = async (req, res) => {
    try {
        const { orderId } = req.params;
        const buyerId = req.user && req.user.id;

        // Verify order belongs to this buyer
        const [order] = await pool.query(
            'SELECT id, seller_id FROM orders WHERE id = ? AND buyer_id = ?',
            [orderId, buyerId]
        );
        if (order.length === 0) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Update delivery status
        await pool.query(
            'UPDATE deliveries SET status = "completed" WHERE order_id = ?',
            [orderId]
        );

        // Update order status
        await pool.query(
            'UPDATE orders SET status = "delivered" WHERE id = ?',
            [orderId]
        );

        // Notify seller about completion
        await createNotification(
            order[0].seller_id,
            'order_completed',
            `Order #${orderId} completed`,
            'Buyer confirmed delivery. Order is complete.',
            `/seller/orders/${orderId}`
        );

        res.json({ message: 'Delivery confirmed and completed' });
    } catch (err) {
        console.error('Confirm delivery error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};