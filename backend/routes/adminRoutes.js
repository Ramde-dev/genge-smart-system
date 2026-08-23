const express = require('express');
const router = express.Router();
const { authenticateToken, authorize } = require('../middleware/authMiddleware');
const adminController = require('../controllers/adminController');

// ── All admin routes require authentication and admin role ──
router.use(authenticateToken);
router.use(authorize(['admin']));

// ── Dashboard ──
router.get('/dashboard', adminController.getDashboard);

// ── Manage Users ──
router.get('/users', adminController.getUsers);
router.put('/users/status', adminController.updateUserStatus);

// ── Manage Sellers ──
router.get('/sellers', adminController.getSellers);
router.put('/sellers/:sellerId/approve', adminController.approveSeller);
router.put('/sellers/:sellerId/suspend', adminController.suspendSeller);

// ── Manage Products ──
router.get('/products', adminController.getProducts);
router.delete('/products/:productId', adminController.deleteProduct);

// ── Manage Agents ──
router.get('/agents', adminController.getAgents);
router.post('/agents', adminController.addAgent);
router.get('/agents/:agentId', adminController.getAgentById);
router.put('/agents/:agentId', adminController.updateAgent);
router.put('/agents/:agentId/status', adminController.updateAgentStatus);
router.delete('/agents/:agentId', adminController.deleteAgent);
router.post('/agents/:agentId/reset-password', adminController.resetAgentPassword);
router.put('/agents/:agentId/toggle-availability', adminController.toggleAgentAvailability);

// ── Fraud Alerts ──
router.get('/fraud-alerts', adminController.getFraudAlerts);
router.put('/fraud-alerts/:alertId/resolve', adminController.resolveFraudAlert);

// ── Quality Scores ──
router.get('/quality-scores', adminController.getQualityScores);

// ── Reports ──
router.get('/reports', adminController.getReports);
router.post('/reports/generate', adminController.generateReport);
router.get('/reports/:reportId/download', adminController.downloadReport);

// Seller payouts
router.get('/payouts', adminController.getPayouts);
router.put('/payouts/:payoutId/pay', adminController.paySellerPayout);

// ── Admin Settings ──
router.get('/settings', (req, res) => {
    res.json({
        success: true,
        message: 'Admin settings',
        settings: {
            appName: 'Genge Smart System',
            version: '1.0.0',
            maintenanceMode: false
        }
    });
});

// ── Dashboard Data (test route) ──
router.get('/dashboard-data', (req, res) => {
    res.json({
        success: true,
        message: "You are authorized to see this!",
        user: {
            id: req.user.id,
            role: req.user.role
        }
    });
});

module.exports = router;