const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

// Only logged-in users can reach this route
router.get('/dashboard-data', authMiddleware, (req, res) => {
    res.json({ message: "You are authorized to see this!" });
});