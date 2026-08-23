const pool = require('../config/db');
const { sendNotificationEmail } = require('../utils/email');

// ── Get all notifications for the logged‑in buyer ──
exports.getNotifications = async (req, res) => {
    try {
        const userId = req.userId;
        const [notifications] = await pool.query(
            `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC`,
            [userId]
        );
        res.json(notifications);
    } catch (err) {
        console.error('Get notifications error:', err);
        res.status(500).json({ message: 'Failed to fetch notifications' });
    }
};

// ── Get unread count ──
exports.getUnreadCount = async (req, res) => {
    try {
        const userId = req.userId;
        const [rows] = await pool.query(
            `SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE`,
            [userId]
        );
        res.json({ count: rows[0].count });
    } catch (err) {
        console.error('Get unread count error:', err);
        res.status(500).json({ message: 'Failed to get unread count' });
    }
};

// ── Mark single notification as read ──
exports.markNotificationRead = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;
        const [result] = await pool.query(
            `UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?`,
            [id, userId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Notification not found' });
        }
        res.json({ message: 'Marked as read' });
    } catch (err) {
        console.error('Mark notification as read error:', err);
        res.status(500).json({ message: 'Failed to mark as read' });
    }
};

// ── Mark all notifications as read ──
exports.markAllNotificationsRead = async (req, res) => {
    try {
        const userId = req.userId;
        await pool.query(
            `UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE`,
            [userId]
        );
        res.json({ message: 'All notifications marked as read' });
    } catch (err) {
        console.error('Mark all notifications read error:', err);
        res.status(500).json({ message: 'Failed to mark all as read' });
    }
};

// ── Delete a notification ──
exports.deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;
        const [result] = await pool.query(
            `DELETE FROM notifications WHERE id = ? AND user_id = ?`,
            [id, userId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Notification not found' });
        }
        res.json({ message: 'Notification deleted' });
    } catch (err) {
        console.error('Delete notification error:', err);
        res.status(500).json({ message: 'Failed to delete notification' });
    }
};

// ── Get notification by ID ──
exports.getNotificationById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;
        const [rows] = await pool.query(
            `SELECT * FROM notifications WHERE id = ? AND user_id = ?`,
            [id, userId]
        );
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Notification not found' });
        }
        res.json(rows[0]);
    } catch (err) {
        console.error('Get notification by ID error:', err);
        res.status(500).json({ message: 'Failed to fetch notification' });
    }
};

// ── Create a notification (used by seller order status update and delivery) ──
exports.createNotification = async (userId, type, title, message, link = null, orderId = null) => {
    try {
        await pool.query(
            `INSERT INTO notifications (user_id, order_id, type, title, message, link) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [userId, orderId, type, title, message, link]
        );
        const [users] = await pool.query('SELECT email FROM users WHERE id = ?', [userId]);
        if (users[0]?.email) {
            await sendNotificationEmail(users[0].email, title, message, link);
        }
    } catch (err) {
        console.error('Failed to create notification:', err);
    }
};