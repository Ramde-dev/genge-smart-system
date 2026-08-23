const pool = require('../config/db');
const { reply } = require('../chatService');

exports.sendMessage = async (req, res) => {
    try {
        const message = String(req.body.message || '').trim();
        if (!message || message.length > 2000) {
            return res.status(400).json({ success: false, message: 'Message must contain 1-2000 characters.' });
        }
        const result = await reply({
            user: req.user,
            conversationId: req.body.conversationId || null,
            message,
            context: req.body.context || {}
        });
        res.json({ success: true, ...result });
    } catch (error) {
        console.error('Chat message error:', error.message);
        res.status(503).json({ success: false, message: 'AI Assistant is temporarily unavailable. Please try again later.' });
    }
};

exports.getConversations = async (req, res) => {
    try {
        const [conversations] = await pool.query(
            'SELECT id, title, created_at, updated_at FROM conversations WHERE user_id = ? ORDER BY updated_at DESC LIMIT 50',
            [req.userId]
        );
        res.json({ success: true, conversations });
    } catch (error) {
        console.error('Get chat conversations error:', error.message);
        res.status(500).json({ success: false, message: 'Unable to load chat history.' });
    }
};

exports.getMessages = async (req, res) => {
    try {
        const [messages] = await pool.query(
            `SELECT m.id, m.role, m.content, m.created_at
             FROM chat_messages m JOIN conversations c ON c.id = m.conversation_id
             WHERE m.conversation_id = ? AND c.user_id = ? ORDER BY m.created_at ASC LIMIT 100`,
            [req.params.id, req.userId]
        );
        res.json({ success: true, messages });
    } catch (error) {
        console.error('Get chat messages error:', error.message);
        res.status(500).json({ success: false, message: 'Unable to load conversation.' });
    }
};

exports.deleteConversation = async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM conversations WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
        if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Conversation not found.' });
        res.json({ success: true });
    } catch (error) {
        console.error('Delete chat conversation error:', error.message);
        res.status(500).json({ success: false, message: 'Unable to delete conversation.' });
    }
};
