import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  HiOutlineShoppingBag,
  HiOutlineHome,
  HiOutlineUserCircle,
  HiSearch,
  HiMenu,
  HiX,
  HiOutlineTruck,
  HiOutlineClipboardList,
  HiBell,
  HiOutlineUser,
  HiOutlineLogout,
  HiOutlineCheck,
} from 'react-icons/hi';
import { useCart } from '../../context/CartContext';
import { useUser } from '../../context/UserContext';
import api from '../../services/api';
import styles from './Navbar.module.css';

export default function Navbar({ onSearch }) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  const { cart } = useCart();
  const { user } = useUser();

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);

  // ── Lock body scroll when drawer is open ──
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // ── Fetch unread count and notifications ──
  const fetchUnreadCount = async () => {
    try {
      const res = await api.get('/buyer/notifications/unread-count');
      setUnreadCount(res.data.count);
    } catch (err) {
      // ignore
    }
  };

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

  const renderAvatar = () => {
    if (user?.avatar_url) {
      return (
        <img
          src={`http://localhost:5000${user.avatar_url}`}
          alt="Profile"
          className={styles.avatarImg}
        />
      );
    }
    return (
      <span className={styles.avatarInitials}>
        {user?.name ? user.name.substring(0, 2).toUpperCase() : <HiOutlineUserCircle size={24} />}
      </span>
    );
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  const navLinks = [
    { to: '/buyer/home', label: 'Home', icon: <HiOutlineHome /> },
    { to: '/buyer/orders', label: 'Orders', icon: <HiOutlineClipboardList /> },
    { to: '/buyer/tracking', label: 'Tracking', icon: <HiOutlineTruck /> },
    { to: '/buyer/cart', label: 'Cart', icon: <HiOutlineShoppingBag /> },
    { to: '/buyer/profile', label: 'Profile', icon: <HiOutlineUser /> },
  ];

  const desktopLinks = navLinks.filter(
    (link) => link.label !== 'Cart' && link.label !== 'Profile'
  );

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <div className={styles.left}>
          <button className={styles.menuBtn} onClick={() => setIsOpen(true)}>
            <HiMenu size={28} />
          </button>
          <Link to="/buyer/home" className={styles.brand}>
            Genge<span>Smart</span>
          </Link>
        </div>

        <div className={styles.searchWrapper}>
          <HiSearch className={styles.searchIcon} size={20} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search products..."
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>

        <div className={styles.desktopNav}>
          {desktopLinks.map((link) => (
            <Link key={link.to} to={link.to} className={styles.navLink}>
              {link.icon}
              <span>{link.label}</span>
            </Link>
          ))}
        </div>

        <div className={styles.right}>
          {/* ── Notification Bell with Dropdown ── */}
          <div className={styles.notificationWrapper} ref={dropdownRef}>
            <button
              className={styles.iconBtn}
              onClick={() => setDropdownOpen(!dropdownOpen)}
              aria-label="Notifications"
            >
              <HiBell size={24} />
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
                            <HiOutlineCheck size={16} /> Read
                          </button>
                        )}
                      </div>
                    ))
                  )}
                  <Link to="/buyer/notifications" className={styles.viewAll}>
                    View all
                  </Link>
                </div>
              </div>
            )}
          </div>

          <Link to="/buyer/cart" className={styles.cartBtn}>
            <HiOutlineShoppingBag size={24} />
            {cartCount > 0 && <span className={styles.cartBadge}>{cartCount}</span>}
          </Link>

          <Link to="/buyer/profile" className={styles.avatarLink}>
            {renderAvatar()}
          </Link>
        </div>
      </div>

      {/* Mobile Drawer */}
      <div className={`${styles.drawer} ${isOpen ? styles.drawerOpen : ''}`}>
        <div className={styles.drawerHeader}>
          <div className={styles.drawerUser}>
            <div className={styles.drawerAvatar}>
              {user?.avatar_url ? (
                <img src={`http://localhost:5000${user.avatar_url}`} alt="Profile" />
              ) : (
                <span>{user?.name ? user.name.substring(0, 2).toUpperCase() : '??'}</span>
              )}
            </div>
            <div className={styles.drawerUserInfo}>
              <span className={styles.drawerUserName}>{user?.name || 'Guest'}</span>
              <span className={styles.drawerUserEmail}>{user?.email || ''}</span>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={() => setIsOpen(false)}>
            <HiX size={28} />
          </button>
        </div>

        <div className={styles.drawerLinks}>
          {navLinks.map((link) => (
            <Link key={link.to} to={link.to} onClick={() => setIsOpen(false)}>
              {link.icon} {link.label}
            </Link>
          ))}
        </div>

        <button className={styles.drawerLogout} onClick={handleLogout}>
          <HiOutlineLogout size={20} /> Sign Out
        </button>
      </div>
    </nav>
  );
}