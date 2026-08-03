import React, { useState, useEffect } from 'react';
import AgentLayout from '../../components/agent/AgentLayout';
import api from '../../services/api';

export default function AgentNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await api.get('/agent/notifications');
        setNotifications(res.data || []);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
  }, []);

  return (
    <AgentLayout>
      <div style={{ padding: '2rem' }}>
        <h1>Notifications</h1>
        {loading ? (
          <p>Loading...</p>
        ) : notifications.length === 0 ? (
          <p>No notifications</p>
        ) : (
          <ul>
            {notifications.map((n) => (
              <li key={n.id}>{n.message}</li>
            ))}
          </ul>
        )}
      </div>
    </AgentLayout>
  );
}