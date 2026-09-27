const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Multer configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, path.join(__dirname, '..', 'uploads')); },
    filename: (req, file, cb) => { cb(null, `logo-${Date.now()}${path.extname(file.originalname)}`); }
});
const upload = multer({ storage });

// ── Public routes with Validation ──
router.post('/register', [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    validate
], authController.register);

router.post('/verify-email', [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('code').isLength({ min: 6, max: 6 }).isNumeric().withMessage('Verification code must be 6 digits'),
    validate
], authController.verifyEmail);

router.post('/resend-verification', [
    body('email').isEmail().withMessage('Please provide a valid email'),
    validate
], authController.resendVerification);

router.post('/login', [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required'),
    validate
], authController.login);

// ── Agent Login Route ──
router.post('/agent/login', [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required'),
    validate
], authController.agentLogin);

// ── Forgot Password Route ──
router.post('/forgot-password', [
    body('email').isEmail().withMessage('Please provide a valid email address'),
    validate
], authController.forgotPassword);

router.post('/verify-reset-code', [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('code').isLength({ min: 6, max: 6 }).isNumeric().withMessage('Reset code must be 6 digits'),
    validate
], authController.verifyResetCode);

router.post('/reset-password', [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('code').isLength({ min: 6, max: 6 }).isNumeric().withMessage('Reset code must be 6 digits'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    validate
], authController.resetPassword);

// ── Protected routes (require authentication) ──
router.get('/profile', authenticateToken, authController.getProfile);
router.put('/profile', authenticateToken, authController.updateProfile);
router.put('/security', authenticateToken, authController.updateSecurity);
router.post('/upload-logo', authenticateToken, upload.single('logo'), authController.uploadLogo);

// ── Agent Protected Routes ──
router.get('/agent/profile', authenticateToken, authController.getAgentProfile);

module.exports = router;