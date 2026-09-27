import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';
import styles from './Orders.module.css';
import {
  HiOutlineMenu,
  HiOutlineX,
  HiOutlineHome,
  HiOutlineShoppingBag,
  HiOutlinePlusCircle,
  HiOutlineArchive,
  HiOutlineLogout,
  HiOutlineTrendingUp,
  HiOutlineUserCircle,
  HiOutlineEye,
} from 'react-icons/hi';
import SearchFilterBar from '../../components/seller/SearchFilterBar';

export default function Orders() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', category: '' });

  const navigate = useNavigate();
  const location = useLocation();

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/seller/orders', {
        params: { search: filters.search, status: filters.category },
      });
      setOrders(data.orders || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const handler = setTimeout(fetchOrders, 300);
    return () => clearTimeout(handler);
  }, [fetchOrders]);

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await api.put(`/seller/orders/${orderId}/status`, { status: newStatus });
      fetchOrders();
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update order status.');
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return styles.statusPending;
      case 'shipped':
        return styles.statusShipped;
      case 'delivered':
        return styles.statusDelivered;
      case 'cancelled':
        return styles.statusCancelled;
      default:
        return styles.statusDefault;
    }
  };

  return (
    <div className={styles.pageContainer}>
      {mobileOpen && <div className={styles.overlay} onClick={() => setMobileOpen(false)} />}
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        location={location}
        navigate={navigate}
      />

      <main className={styles.mainContent}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <button
              className={styles.menuToggle}
              onClick={() => setMobileOpen(true)}
            >
              <HiOutlineMenu size={28} />
            </button>
            <h2 className={styles.title}>Orders</h2>
          </div>
        </header>

        <div className={styles.filterWrapper}>
          <SearchFilterBar
            onSearch={(v) => setFilters((p) => ({ ...p, search: v }))}
            onCategoryChange={(v) => setFilters((p) => ({ ...p, category: v }))}
          />
        </div>

        <div className={styles.tableCard}>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Order ID</th>
                  <th className={styles.th}>Customer</th>
                  <th className={styles.th}>Contact</th>
                  <th className={styles.th}>Total</th>
                  <th className={styles.th}>Status</th>
                  <th className={`${styles.th} ${styles.thActions}`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className={styles.loadingState}>
                      <span className={styles.spinner} />
                      Loading orders...
                    </td>
                  </tr>
                ) : orders.length > 0 ? (
                  orders.map((o) => (
                    <tr key={o.id} className={styles.row}>
                      <td className={styles.td}>
                        <span className={styles.orderId}>#{o.id}</span>
                      </td>
                      <td className={`${styles.td} ${styles.customerName}`}>
                        {o.buyer_name}
                      </td>
                      <td className={styles.td}>
                        <div className={styles.contactEmail}>{o.buyer_email}</div>
                        <div className={styles.contactPhone}>{o.buyer_phone}</div>
                      </td>
                      <td className={styles.td}>
                        <span className={styles.totalPrice}>
                          TSh {Number(o.total_price).toLocaleString()}
                        </span>
                      </td>
                      <td className={styles.td}>
                        <select
                          value={o.status}
                          onChange={(e) => handleStatusUpdate(o.id, e.target.value)}
                          className={`${styles.statusSelect} ${getStatusColor(o.status)}`}
                        >
                          <option value="pending">Pending</option>
                          <option value="processing">Processing</option>
                          <option value="shipped">Shipped</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                      <td className={`${styles.td} ${styles.actions}`}>
                        <button
                          onClick={() => navigate(`/seller/orders/${o.id}`)}
                          className={styles.viewBtn}
                        >
                          <HiOutlineEye size={16} />
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className={styles.emptyState}>
                      <HiOutlineShoppingBag size={48} className={styles.emptyIcon} />
                      <p>No orders found</p>
                      <span>Orders will appear here once customers place them</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

function Sidebar({ sidebarOpen, setSidebarOpen, mobileOpen, setMobileOpen, location, navigate }) {
  const links = [
    { label: 'Dashboard', path: '/seller/dashboard', icon: <HiOutlineHome size={22} /> },
    { label: 'Analytics', path: '/seller/analytics', icon: <HiOutlineTrendingUp size={22} /> },
    { label: 'My Orders', path: '/seller/orders', icon: <HiOutlineShoppingBag size={22} /> },
    { label: 'Inventory', path: '/seller/inventory', icon: <HiOutlineArchive size={22} /> },
    { label: 'Add Product', path: '/seller/add-product', icon: <HiOutlinePlusCircle size={22} /> },
  ];

  return (
    <aside
      className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarExpanded : styles.sidebarCollapsed} ${mobileOpen ? styles.mobileOpen : ''}`}
    >
      <div className={styles.sidebarHeader}>
        <h1 className={styles.brand}>GengeSmart</h1>
        <button
          className={styles.closeSidebar}
          onClick={() => {
            setSidebarOpen(false);
            setMobileOpen(false);
          }}
        >
          <HiOutlineX size={24} />
        </button>
      </div>

      <nav className={styles.nav}>
        {links.map((link) => (
          <button
            key={link.path}
            onClick={() => {
              navigate(link.path);
              setSidebarOpen(false);
              setMobileOpen(false);
            }}
            title={link.label}
            data-label={link.label}
            aria-label={link.label}
            className={`${styles.navLink} ${
              location.pathname === link.path ? styles.activeNavLink : ''
            }`}
          >
            {link.icon}
            <span>{link.label}</span>
          </button>
        ))}
      </nav>

      <div className={styles.sidebarFooter}>
        <button
          onClick={() => {
            navigate('/seller/profile');
            setSidebarOpen(false);
            setMobileOpen(false);
          }}
          title="Profile"
          data-label="Profile"
          aria-label="Profile"
          className={styles.navLink}
        >
          <HiOutlineUserCircle size={22} />
          <span>Profile</span>
        </button>
        <button
          onClick={() => {
            localStorage.clear();
            setMobileOpen(false);
            navigate('/login');
          }}
          title="Sign Out"
          data-label="Sign Out"
          aria-label="Sign Out"
          className={styles.navLink}
        >
          <HiOutlineLogout size={22} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}