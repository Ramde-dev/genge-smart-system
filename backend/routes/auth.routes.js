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
    destination: (req, file, cb) => { cb(null, 'uploads/'); },
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

// ── Protected routes (require authentication) ──
router.get('/profile', authenticateToken, authController.getProfile);
router.put('/profile', authenticateToken, authController.updateProfile);
router.put('/security', authenticateToken, authController.updateSecurity);
router.post('/upload-logo', authenticateToken, upload.single('logo'), authController.uploadLogo);

// ── Agent Protected Routes ──
router.get('/agent/profile', authenticateToken, authController.getAgentProfile);

module.exports = router;