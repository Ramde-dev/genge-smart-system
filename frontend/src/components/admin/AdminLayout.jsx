import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  HiOutlineMenu,
  HiOutlineX,
  HiOutlineHome,
  HiOutlineUsers,
  HiOutlineUserGroup,
  HiOutlineExclamationCircle,
  HiOutlineStar,
  HiOutlineDocumentText,
  HiOutlineLogout,
  HiOutlineBell,
  HiOutlineUserCircle,
  HiOutlineShoppingBag,
  HiOutlineTruck,
} from 'react-icons/hi';
import api from '../../services/api';
import styles from './AdminLayout.module.css';

export default function AdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userName, setUserName] = useState('Admin');
  const navigate = useNavigate();
  const location = useLocation();

  // ── Notification state ──
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const name = localStorage.getItem('userName') || 'Admin';
    setUserName(name);
  }, []);

  // Close mobile sidebar when route changes
  useEffect(() => {
    if (window.innerWidth < 768) {
      setMobileOpen(false);
    }
  }, [location]);

  // ── Fetch unread count ──
  const fetchUnreadCount = async () => {
    try {
      const res = await api.get('/buyer/notifications/unread-count');
      setUnreadCount(res.data.count);
    } catch (err) {
      // ignore (maybe no token or endpoint not ready)
    }
  };

  // ── Fetch notifications ──
  const fetchNotifications = async () => {
    try {
      const res = await api.get('/buyer/notifications');
      setNotifications(res.data);
    } catch (err) {
      // ignore
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    fetchNotifications();

    // Refresh count every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // ── Click outside to close dropdown ──
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Mark single notification as read ──
  const markAsRead = async (id) => {
    try {
      await api.put(`/buyer/notifications/${id}/read`);
      setNotifications(notifications.map(n =>
        n.id === id ? { ...n, is_read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      // ignore
    }
  };

  // ── Mark all as read ──
  const markAllAsRead = async () => {
    try {
      await api.put('/buyer/notifications/read-all');
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      // ignore
    }
  };

  const links = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: <HiOutlineHome size={22} /> },
    { label: 'Manage Users', path: '/admin/users', icon: <HiOutlineUsers size={22} /> },
    { label: 'Manage Sellers', path: '/admin/sellers', icon: <HiOutlineUserGroup size={22} /> },
    { label: 'Manage Products', path: '/admin/products', icon: <HiOutlineShoppingBag size={22} /> },
    { label: 'Manage Agents', path: '/admin/agents', icon: <HiOutlineTruck size={22} /> },
    { label: 'Fraud Alerts', path: '/admin/fraud-alerts', icon: <HiOutlineExclamationCircle size={22} /> },
    { label: 'Quality Scores', path: '/admin/quality-scores', icon: <HiOutlineStar size={22} /> },
    { label: 'Reports', path: '/admin/reports', icon: <HiOutlineDocumentText size={22} /> },
  ];

  const isDesktop = () => window.innerWidth >= 768;

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const toggleSidebar = () => {
    if (window.innerWidth < 768) {
      setMobileOpen(!mobileOpen);
    } else {
      setSidebarOpen(!sidebarOpen);
    }
  };

  const closeMobile = () => {
    if (window.innerWidth < 768) setMobileOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div className={styles.adminLayout}>
      {/* Mobile Overlay */}
      {mobileOpen && <div className={styles.overlay} onClick={closeMobile} />}

      {/* Sidebar */}
      <aside
        className={`${styles.sidebar} ${sidebarOpen ? '' : styles.sidebarCollapsed} ${
          mobileOpen ? styles.mobileOpen : ''
        }`}
      >
        <div className={styles.sidebarHeader}>
          <h1 className={styles.brand}>GengeSmart</h1>
          <button className={styles.toggleBtn} onClick={toggleSidebar}>
            {sidebarOpen && window.innerWidth >= 768 ? (
              <HiOutlineX size={24} />
            ) : (
              <HiOutlineMenu size={24} />
            )}
          </button>
        </div>

        <nav className={styles.nav}>
          {links.map((link) => (
            <button
              key={link.path}
              onClick={() => {
                navigate(link.path);
                closeMobile();
              }}
              className={`${styles.navLink} ${isActive(link.path) ? styles.active : ''}`}
              title={link.label}
              data-label={link.label}
              aria-label={link.label}
            >
              {link.icon}
              <span>{link.label}</span>
            </button>
          ))}
        </nav>

        <button className={styles.logoutBtn} onClick={handleLogout} title="Sign Out" data-label="Sign Out" aria-label="Sign Out">
          <HiOutlineLogout size={22} /> <span>Sign Out</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className={styles.mainContent}>
        {/* Top Bar */}
        <header className={styles.topBar}>
          <div className={styles.topBarLeft}>
            <button className={styles.menuBtn} onClick={toggleSidebar}>
              <HiOutlineMenu size={24} />
            </button>
            <span className={styles.pageTitle}>
              {links.find((l) => l.path === location.pathname)?.label || 'Dashboard'}
            </span>
          </div>
          <div className={styles.topBarRight}>
            {/* ── Notification Bell ── */}
            <div className={styles.notificationWrapper} ref={dropdownRef}>
              <button
                className={styles.iconBtn}
                onClick={() => setDropdownOpen(!dropdownOpen)}
                aria-label="Notifications"
              >
                <HiOutlineBell size={22} />
                {unreadCount > 0 && (
                  <span className={styles.badge}>{unreadCount}</span>
                )}
              </button>

              {dropdownOpen && (
                <div className={styles.dropdown}>
                  <div className={styles.dropdownHeader}>
                    <span>Notifications</span>
                    {unreadCount > 0 && (
                      <button onClick={markAllAsRead} className={styles.markAllBtn}>
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className={styles.dropdownList}>
                    {notifications.length === 0 ? (
                      <p className={styles.empty}>No notifications</p>
                    ) : (
                      notifications.slice(0, 10).map((n) => (
                        <div
                          key={n.id}
                          className={`${styles.notificationItem} ${!n.is_read ? styles.unread : ''}`}
                        >
                          <div className={styles.notificationContent}>
                            <strong>{n.title}</strong>
                            <p>{n.message}</p>
                            <span className={styles.time}>
                              {new Date(n.created_at).toLocaleString()}
                            </span>
                          </div>
                          {!n.is_read && (
                            <button
                              onClick={() => markAsRead(n.id)}
                              className={styles.markReadBtn}
                            >
                              Read
                            </button>
                          )}
                        </div>
                      ))
                    )}
                    {/* ✅ Updated to admin notifications */}
                    <Link to="/admin/notifications" className={styles.viewAll}>
                      View all
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.userInfo}>
              <HiOutlineUserCircle size={28} className={styles.userAvatar} />
              <span className={styles.userName}>{userName}</span>
            </div>
          </div>
        </header>

        <div className={styles.content}>{children}</div>
      </main>
    </div>
  );
}