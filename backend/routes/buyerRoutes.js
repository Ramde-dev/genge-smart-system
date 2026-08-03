const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');

// Import buyer controller with error handling
let buyerController;
try {
    buyerController = require('../controllers/buyerController');
    console.log('✅ Buyer controller loaded successfully');
} catch (err) {
    console.error('❌ Error loading buyerController:', err.message);
    // Create fallback controller with empty functions
    buyerController = {};
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

// ── Public Routes ──
// Get all products
router.get('/products', safeHandler(buyerController.getProducts));

// Get product by ID
router.get('/products/:id', safeHandler(buyerController.getProductById));

// Get categories
router.get('/categories', safeHandler(buyerController.getCategories));

// ── Protected Routes (require authentication) ──
router.use(authenticateToken);

// ── Profile Routes ──
// Get buyer profile
router.get('/profile', safeHandler(buyerController.getProfile));

// Update buyer profile
router.put('/profile', upload.single('avatar'), safeHandler(buyerController.updateProfile));

// Upload avatar
router.post('/upload-avatar', upload.single('avatar'), safeHandler(buyerController.uploadAvatar));

// ── Order Routes ──
// Get all orders
router.get('/orders', safeHandler(buyerController.getOrders));

// Get order details
router.get('/orders/:id', safeHandler(buyerController.getOrderDetails));

// Create new order
router.post('/orders', safeHandler(buyerController.createOrder));

// Cancel order
router.put('/orders/:id/cancel', safeHandler(buyerController.cancelOrder));

// ── Tracking Routes ──
// Get all tracking
router.get('/tracking', safeHandler(buyerController.getTracking));

// Get tracking detail
router.get('/tracking/:orderId', safeHandler(buyerController.getTrackingDetail));

module.exports = router;