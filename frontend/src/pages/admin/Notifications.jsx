import { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import api from '../../services/api';
import styles from './Notifications.module.css';

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await api.get('/buyer/notifications');
        setNotifications(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
  }, []);

  const markAsRead = async (id) => {
    try {
      await api.put(`/buyer/notifications/${id}/read`);
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) { /* ignore */ }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/buyer/notifications/read-all');
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    } catch (err) { /* ignore */ }
  };

  return (
    <AdminLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Notifications</h1>
          {notifications.some(n => !n.is_read) && (
            <button onClick={markAllAsRead} className={styles.markAllBtn}>
              Mark all as read
            </button>
          )}
        </div>
        {loading ? (
          <div className={styles.loading}>Loading...</div>
        ) : notifications.length === 0 ? (
          <div className={styles.empty}>No notifications</div>
        ) : (
          <div className={styles.list}>
            {notifications.map(n => (
              <div key={n.id} className={`${styles.item} ${!n.is_read ? styles.unread : ''}`}>
                <div className={styles.content}>
                  <h3>{n.title}</h3>
                  <p>{n.message}</p>
                  <span className={styles.time}>{new Date(n.created_at).toLocaleString()}</span>
                  {n.link && <a href={n.link} className={styles.link}>View</a>}
                </div>
                {!n.is_read && (
                  <button onClick={() => markAsRead(n.id)} className={styles.readBtn}>
                    Mark as read
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}