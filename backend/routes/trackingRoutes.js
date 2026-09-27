const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');

// Import tracking controller with error handling
let trackingController;
try {
    trackingController = require('../controllers/trackingController');
} catch (err) {
    console.error('❌ Error loading trackingController:', err.message);
    trackingController = {};
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

// ── All tracking routes require authentication ──
router.use(authenticateToken);

// ── Tracking Info ──
// Get all tracked orders for buyer
router.get('/', safeHandler(trackingController.getTrackedOrders));

// Get tracking stats for buyer
router.get('/stats', safeHandler(trackingController.getTrackingStats));

// ── Notifications ──
// Get notifications for user
router.get('/notifications', safeHandler(trackingController.getNotifications));

// Get unread notification count
router.get('/notifications/unread-count', safeHandler(trackingController.getUnreadCount));

// Mark notification as read
router.put('/notifications/:notificationId/read', safeHandler(trackingController.markNotificationRead));

// Mark all notifications as read
router.put('/notifications/read-all', safeHandler(trackingController.markAllNotificationsRead));

// Delete notification
router.delete('/notifications/:notificationId', safeHandler(trackingController.deleteNotification));

// Get agent's current location for an order
router.get('/location/:orderId', safeHandler(trackingController.getAgentLocation));

// Get tracking info for a specific order
router.get('/:orderId', safeHandler(trackingController.getTrackingInfo));

// ── Test (Development only) ──
// Create test notification (remove in production)
router.post('/test-notification', safeHandler(trackingController.createTestNotification));

module.exports = router;