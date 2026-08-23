const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');

// Import notification controller with error handling
let notificationController;
try {
    notificationController = require('../controllers/notificationController');
} catch (err) {
    console.error('❌ Error loading notificationController:', err.message);
    notificationController = {};
}

// ── Helper to safely call controller functions ──
const safeHandler = (fn) => {
    return async (req, res) => {
        try {
            if (typeof fn !== 'function') {
                return res.status(501).json({
                    success: false,
                    message: 'This endpoint is not yet implemented'
                });
            }
            await fn(req, res);
        } catch (error) {
            console.error('Controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error',
                error: error.message
            });
        }
    };
};

// ── All notification routes require authentication ──
router.use(authenticateToken);

// ── Notification Routes ──
// Get all notifications for the authenticated user
router.get('/', safeHandler(notificationController.getNotifications));

// Get unread notification count
router.get('/unread-count', safeHandler(notificationController.getUnreadCount));

// Mark notification as read
router.put('/:id/read', safeHandler(notificationController.markNotificationRead));

// Mark all notifications as read
router.put('/read-all', safeHandler(notificationController.markAllNotificationsRead));

// Delete notification
router.delete('/:id', safeHandler(notificationController.deleteNotification));

// Get notification by ID
router.get('/:id', safeHandler(notificationController.getNotificationById));

module.exports = router;