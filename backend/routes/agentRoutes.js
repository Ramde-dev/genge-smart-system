const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');

// Import agent controller with error handling
let agentController;
try {
    agentController = require('../controllers/agentController');
} catch (err) {
    console.error('❌ Error loading agentController:', err.message);
    agentController = {};
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

// ── All agent routes require authentication ──
router.use(authenticateToken);

// ── Delivery Management ──
// Get all deliveries assigned to the agent
router.get('/deliveries', safeHandler(agentController.getDeliveries));

// Get single delivery details
router.get('/deliveries/:deliveryId', safeHandler(agentController.getDeliveryDetails));

// Update delivery status
router.put('/deliveries/:deliveryId/status', safeHandler(agentController.updateDeliveryStatus));

// ── Location Tracking ──
// Update current location for a delivery
router.post('/update-location', safeHandler(agentController.updateLocation));

// Get tracking history for an order
router.get('/tracking/:orderId', safeHandler(agentController.getTrackingHistory));

// Get all tracking events for agent's deliveries
router.get('/tracking-events', safeHandler(agentController.getTrackingEvents));

// ── Profile Management ──
// Get agent profile with stats
router.get('/profile', safeHandler(agentController.getAgentProfile));

// Toggle availability (available/unavailable)
router.put('/toggle-availability', safeHandler(agentController.toggleAvailability));

module.exports = router;