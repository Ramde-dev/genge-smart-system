import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  HiOutlineMenu,
  HiOutlineX,
  HiOutlineHome,
  HiOutlineTruck,
  HiOutlineLogout,
  HiOutlineUserCircle,
  HiOutlineLocationMarker,
  HiOutlineClipboardList,
} from 'react-icons/hi';
import styles from './AgentLayout.module.css';

export default function AgentLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userName, setUserName] = useState('Agent');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const name = localStorage.getItem('userName') || 'Agent';
    setUserName(name);
  }, []);

  // Close mobile sidebar when route changes
  useEffect(() => {
    if (window.innerWidth < 768) {
      setMobileOpen(false);
    }
  }, [location]);

  const links = [
    { label: 'Dashboard', path: '/agent/dashboard', icon: <HiOutlineHome size={22} /> },
    { label: 'My Deliveries', path: '/agent/deliveries', icon: <HiOutlineClipboardList size={22} /> },
    { label: 'Update Location', path: '/agent/update-location', icon: <HiOutlineLocationMarker size={22} /> },
    { label: 'Profile', path: '/agent/profile', icon: <HiOutlineUserCircle size={22} /> },
    { label: 'Notifications', path: '/agent/notifications', icon: <HiOutlineClipboardList size={22} /> },
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
    <div className={styles.agentLayout}>
      {/* Mobile Overlay */}
      {mobileOpen && <div className={styles.overlay} onClick={closeMobile} />}

      {/* Sidebar */}
      <aside
        className={`${styles.sidebar} ${sidebarOpen ? '' : styles.sidebarCollapsed} ${
          mobileOpen ? styles.mobileOpen : ''
        }`}
      >
        <div className={styles.sidebarHeader}>
          <h1 className={styles.brand}>Genge Agent</h1>
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