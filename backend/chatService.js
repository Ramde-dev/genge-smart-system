const pool = require('./config/db');
const { systemPrompt, findKnowledgeAnswer } = require('./chatKnowledge');

const safeRoles = new Set(['buyer', 'seller', 'agent', 'admin']);

function safeAction(action, role) {
    if (!action || !action.roles.includes(role)) return null;
    return { label: action.label, path: action.path };
}

async function generateWithProvider(message, history, context, user) {
    if (!process.env.AI_API_KEY || !process.env.AI_API_URL) return null;
    const response = await fetch(process.env.AI_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.AI_API_KEY}`
        },
        body: JSON.stringify({
            model: process.env.AI_MODEL || 'gpt-4o-mini',
            temperature: 0.2,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'system', content: `Authenticated user role: ${user.role}. Current page: ${context?.page || 'unknown'}.` },
                ...history.slice(-8).map((item) => ({ role: item.role === 'assistant' ? 'assistant' : 'user', content: item.content })),
                { role: 'user', content: message }
            ]
        })
    });
    if (!response.ok) throw new Error(`AI provider returned ${response.status}`);
    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
}

async function getConversation(userId, conversationId) {
    if (!conversationId) return null;
    const [rows] = await pool.query('SELECT id, title FROM conversations WHERE id = ? AND user_id = ?', [conversationId, userId]);
    return rows[0] || null;
}

async function createConversation(userId, title) {
    const [result] = await pool.query('INSERT INTO conversations (user_id, title) VALUES (?, ?)', [userId, title.slice(0, 120) || 'New conversation']);
    return result.insertId;
}

async function reply({ user, conversationId, message, context = {} }) {
    const role = String(user.role || '').toLowerCase();
    if (!safeRoles.has(role)) throw new Error('Unsupported user role');
    const cleanMessage = String(message || '').trim().slice(0, 2000);
    if (!cleanMessage) return { conversationId, message: 'Please enter a question so I can help.', actions: [] };

    let conversation = await getConversation(user.id, conversationId);
    if (!conversation) {
        conversationId = await createConversation(user.id, cleanMessage);
    }
    const [history] = await pool.query('SELECT role, content FROM chat_messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT 20', [conversationId]);
    await pool.query('INSERT INTO chat_messages (conversation_id, role, content) VALUES (?, \'user\', ?)', [conversationId, cleanMessage]);

    const localAnswer = findKnowledgeAnswer(cleanMessage, role);
    let answer = localAnswer?.answer;
    let action = safeAction(localAnswer?.action, role);
    if (!answer) {
        try {
            answer = await generateWithProvider(cleanMessage, history, context, { id: user.id, role });
        } catch (error) {
            console.error('Chat provider error:', error.message);
        }
    }
    if (!answer) answer = 'I can help with GengeSmart navigation, products, checkout, orders, delivery, reports, and role-specific tasks. Please ask a specific question.';

    await pool.query('INSERT INTO chat_messages (conversation_id, role, content) VALUES (?, \'assistant\', ?)', [conversationId, answer]);
    await pool.query('UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [conversationId]);
    return { conversationId, message: answer, actions: action ? [action] : [] };
}

module.exports = { reply, getConversation };
