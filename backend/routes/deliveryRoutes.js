const express = require('express');
const router = express.Router();
const { authenticateToken, authorize } = require('../middleware/authMiddleware');

// Import delivery controller with error handling
let deliveryController;
try {
    deliveryController = require('../controllers/deliveryController');
    console.log('Delivery controller loaded successfully');
} catch (err) {
    console.error(' Error loading deliveryController:', err.message);
    deliveryController = {};
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

// ── All delivery routes require authentication ──
router.use(authenticateToken);

// ── Get all delivery agents ──
router.get('/agents', safeHandler(deliveryController.getAgents));

// ── Get available agents (for sellers to assign) ──
router.get('/agents/available', safeHandler(deliveryController.getAvailableAgents));

// ── Create a new delivery agent (admin only) ──
router.post('/agents', authorize(['admin']), safeHandler(deliveryController.addAgent));

// ── Toggle agent availability (admin only) ──
router.put('/agents/:agentId/toggle', authorize(['admin']), safeHandler(deliveryController.toggleAgentAvailability));

// ── Assign agent to order (seller only) ──
router.post('/assign', authorize(['Seller']), safeHandler(deliveryController.assignDelivery));

// ── Update delivery location (agent only) ──
router.put('/location', authorize(['agent']), safeHandler(deliveryController.updateLocation));

// ── Get delivery status for an order ──
router.get('/status/:orderId', safeHandler(deliveryController.getDeliveryStatus));

// ── Confirm delivery (buyer only) ──
router.put('/confirm/:orderId', authorize(['Buyer']), safeHandler(deliveryController.confirmDelivery));

// ── Get delivery details by order ID ──
router.get('/:orderId', safeHandler(deliveryController.getDeliveryByOrder));

module.exports = router;