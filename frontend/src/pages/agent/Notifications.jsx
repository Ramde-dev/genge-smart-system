import React, { useState, useEffect } from 'react';
import AgentLayout from '../../components/agent/AgentLayout';
import api from '../../services/api';

export default function AgentNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await api.get('/agent/notifications');
        setNotifications(res.data?.notifications || res.data || []);
      } catch (error) {
        console.error('Error fetching notifications:', error);
        setError(error.response?.data?.message || 'Failed to load notifications.');
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
  }, []);

  const markAsRead = async (id) => {
    try {
      await api.put(`/agent/notifications/${id}/read`);
      setNotifications((current) => current.map((notification) => (
        notification.id === id ? { ...notification, is_read: true } : notification
      )));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to mark notification as read.');
    }
  };

  return (
    <AgentLayout>
      <div style={{ padding: '2rem' }}>
        <h1>Notifications</h1>
        {loading ? (
          <p>Loading...</p>
        ) : error ? (
          <p role="alert">{error}</p>
        ) : notifications.length === 0 ? (
          <p>No notifications</p>
        ) : (
          <ul>
            {notifications.map((n) => (
              <li key={n.id}>
                {n.message}
                {!n.is_read && (
                  <button type="button" onClick={() => markAsRead(n.id)}>Mark as read</button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </AgentLayout>
  );
}