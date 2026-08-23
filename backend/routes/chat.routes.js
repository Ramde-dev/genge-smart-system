const express = require('express');
const { authenticateToken } = require('../middleware/authMiddleware');
const controller = require('../controllers/chatController');

const router = express.Router();
router.use(authenticateToken);
router.get('/conversations', controller.getConversations);
router.get('/conversations/:id/messages', controller.getMessages);
router.delete('/conversations/:id', controller.deleteConversation);
router.post('/', controller.sendMessage);

module.exports = router;
