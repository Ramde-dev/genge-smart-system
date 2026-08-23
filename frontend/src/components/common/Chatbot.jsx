import { useEffect, useState } from 'react';
import { FaComments, FaPaperPlane, FaPlus, FaTimes, FaTrash } from 'react-icons/fa';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import api from '../../services/api';
import styles from './Chatbot.module.css';

const buyerQuestions = [
  'How do I browse products?', 'How do I search for a product?', 'How do product categories work?',
  'How can I view product details?', 'Where can I see a product price?', 'How do I check product stock?',
  'How can I see seller information?', 'Where can I see product reviews?', 'How do I add a product to my cart?',
  'How do I open my shopping cart?', 'How do I change cart quantity?', 'How do I remove an item from my cart?',
  'Why is my cart empty?', 'How is my cart total calculated?', 'How do I start checkout?',
  'How do I complete the checkout form?', 'What name should I enter at checkout?', 'Which email should I use at checkout?',
  'Which phone number should I enter?', 'What should I enter as my delivery address?', 'Which city should I enter for delivery?',
  'Which region should I enter for delivery?', 'Is postal code required?', 'How do I save my delivery address?',
  'Which mobile money provider can I choose?', 'How do I pay with mobile money?', 'What is the system payment number?',
  'What should I do if payment fails?', 'How much is the shipping fee?', 'What is included in the order summary?',
  'How do I submit my order?', 'How do I know my order was placed?', 'Where can I find my order number?',
  'Where can I see my order history?', 'How do I check my order status?', 'What does pending order mean?',
  'What does processing order mean?', 'What does shipped order mean?', 'What does delivered order mean?',
  'How do I cancel my order?', 'Why is my order not showing?', 'How do I track my order?',
  'Can I see my delivery agent?', 'How can I see delivery location?', 'What should I do if delivery is late?',
  'How do I change my delivery address?', 'Where can I manage saved addresses?', 'How do I set a default address?',
  'How do I update my buyer profile?', 'How do I receive system notifications?',
];

const additionalQuestions = [
  'How do I register as a seller?', 'How do I add a product?', 'How do I edit a product?', 'How do I remove a product?',
  'Where is my inventory?', 'How do I see seller orders?', 'How do I update an order status?', 'How do I assign a delivery agent?',
  'Where are seller analytics?', 'How do I update my seller profile?', 'Why is my product not visible?', 'Why do I need a seller phone number?',
  'How do I manage sellers?', 'How do I manage products?', 'How do I manage delivery agents?', 'Where are fraud alerts?',
  'Where are quality scores?', 'How do I generate a report?', 'How do I download a report?', 'How do I review payouts?',
  'How do I review admin notifications?', 'Where can I see my deliveries?', 'How do I update delivery status?', 'How do I update delivery location?',
  'How do I view delivery details?', 'Where are agent notifications?', 'How do I log out?', 'What information should I never share?',
  'Why can I not access a feature?', 'What should I do when the system shows an error?', 'What can GENGE AI Assistant help with?',
  'What is GengeSmart?', 'Who can use GengeSmart?', 'What features does GengeSmart have?', 'How do I register?',
  'How do I log in?', 'How do I update my name?', 'How do I update my phone number?', 'How do I view account information?',
  'How do I return to the dashboard?', 'Where can I find notifications?', 'How do I go back?', 'How do I find help?',
  'What do notification updates mean?', 'How do I mark a notification as read?', 'How do I delete a notification?', 'How can I protect my account?', 'Why is a page not loading?',
  'Why can I not submit a form?', 'Why can I not upload a file?',
];

const allQuestions = [...buyerQuestions, ...additionalQuestions];

export default function Chatbot() {
  const { user } = useUser();
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [error, setError] = useState('');

  const loadConversations = async () => {
    if (!user) return;
    try {
      const response = await api.get('/chat/conversations');
      setConversations(response.data.conversations || []);
    } catch {
      setError('Chat history is temporarily unavailable.');
    }
  };

  useEffect(() => {
    if (isOpen) loadConversations();
  }, [isOpen, user]);

  const openConversation = async (id) => {
    try {
      const response = await api.get(`/chat/conversations/${id}/messages`);
      setConversationId(id);
      setMessages(response.data.messages || []);
      setHistoryOpen(false);
      setError('');
    } catch {
      setError('Unable to load that conversation.');
    }
  };

  const startNewChat = () => {
    setConversationId(null);
    setMessages([]);
    setError('');
    setHistoryOpen(false);
  };

  const sendMessage = async (text = input) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setInput('');
    setError('');
    setMessages((current) => [...current, { role: 'user', content: trimmed }]);
    if (!user) {
      setMessages((current) => [...current, {
        role: 'assistant',
        content: 'Please sign in to use personalized GENGE AI help for orders, deliveries, and account actions.',
        actions: [{ label: 'Sign in', path: '/login' }],
      }]);
      return;
    }
    setLoading(true);
    try {
      const response = await api.post('/chat', {
        conversationId,
        message: trimmed,
        context: { page: location.pathname },
      });
      setConversationId(response.data.conversationId);
      setMessages((current) => [...current, {
        role: 'assistant',
        content: response.data.message,
        actions: response.data.actions || [],
      }]);
      loadConversations();
    } catch {
      setError('AI Assistant is temporarily unavailable. Please try again later.');
      setMessages((current) => current.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const deleteConversation = async (id) => {
    try {
      await api.delete(`/chat/conversations/${id}`);
      if (id === conversationId) startNewChat();
      loadConversations();
    } catch {
      setError('Unable to delete that conversation.');
    }
  };

  return (
    <div className={`${styles.wrapper} ${isOpen ? styles.open : ''}`}>
      {isOpen && (
        <section className={styles.panel} aria-label="GENGE AI Assistant">
          <header className={styles.panelHeader}>
            <div>
              <strong>GENGE AI Assistant</strong>
              <span>{user ? `Helping ${user.name || 'you'} on this page` : 'Sign in for personalized help'}</span>
            </div>
            <div className={styles.headerActions}>
              {user && <button type="button" onClick={() => setHistoryOpen((current) => !current)} aria-label="Toggle chat history"><FaComments /></button>}
              <button type="button" onClick={() => setIsOpen(false)} aria-label="Close chatbot"><FaTimes /></button>
            </div>
          </header>

          {historyOpen && (
            <aside className={styles.history} aria-label="Conversation history">
              <button type="button" className={styles.newChat} onClick={startNewChat}><FaPlus /> New Chat</button>
              <strong>Recent conversations</strong>
              {conversations.length === 0 ? <span>No previous conversations</span> : conversations.map((conversation) => (
                <div className={styles.historyItem} key={conversation.id}>
                  <button type="button" onClick={() => openConversation(conversation.id)}>{conversation.title}</button>
                  <button type="button" onClick={() => deleteConversation(conversation.id)} aria-label={`Delete ${conversation.title}`}><FaTrash /></button>
                </div>
              ))}
            </aside>
          )}

          <div className={styles.messages} aria-live="polite">
            {messages.length === 0 && <div className={`${styles.message} ${styles.bot}`}><p>Hello! I&apos;m your GENGE AI Assistant. I can help you navigate the system, find information, and understand your current page.</p></div>}
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`${styles.message} ${message.role === 'assistant' ? styles.bot : styles.user}`}>
                <p>{message.content}</p>
                {message.actions?.map((action) => <button type="button" key={action.path} onClick={() => navigate(action.path)}>{action.label}</button>)}
              </div>
            ))}
            {loading && <div className={`${styles.message} ${styles.bot}`}><p>GENGE AI is thinking...</p></div>}
          </div>

          <label className={styles.questionPicker}>
              <span>Common questions</span>
            <select
              defaultValue=""
              onChange={(event) => {
                if (event.target.value) sendMessage(event.target.value);
                event.target.value = '';
              }}
              disabled={loading}
              aria-label="Choose a common question"
            >
              <option value="">Choose a question...</option>
              {allQuestions.map((question, index) => (
                <option key={question} value={question}>{index + 1}. {question}</option>
              ))}
            </select>
          </label>

          {error && <p className={styles.error}>{error}</p>}
          <form className={styles.inputRow} onSubmit={(event) => { event.preventDefault(); sendMessage(); }}>
            <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask GENGE AI..." aria-label="Ask GENGE AI Assistant" />
            <button type="submit" aria-label="Send message" disabled={!input.trim() || loading}><FaPaperPlane /></button>
          </form>
          <span className={styles.pageHint}>Current page: {location.pathname}</span>
        </section>
      )}
      <button type="button" className={styles.launcher} onClick={() => setIsOpen((current) => !current)} aria-label={isOpen ? 'Close chatbot' : 'Open chatbot'} title="Open GENGE AI Assistant">
        {isOpen ? <FaTimes /> : <FaComments />}
      </button>
    </div>
  );
}
