import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';
import styles from './Dashboard.module.css';
import {
  HiOutlineHome,
  HiOutlineShoppingBag,
  HiOutlinePlusCircle,
  HiOutlineArchive,
  HiOutlineLogout,
  HiOutlineMenu,
  HiOutlineX,
  HiOutlineTrendingUp,
  HiOutlineUserCircle,
  HiOutlineCurrencyDollar,
  HiOutlineClock,
  HiOutlineTruck,
} from 'react-icons/hi';

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [data, setData] = useState({ 
    stats: { 
      totalRevenue: 0, 
      totalOrders: 0, 
      pendingOrders: 0,
      processingOrders: 0,
      shippedOrders: 0,
      deliveredOrders: 0,
      totalProducts: 0,
      lowStockProducts: 0
    }, 
    recent_orders: [],
    low_stock_products: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/seller/dashboard');
      // Normalize backend payload to frontend-friendly shape (supports legacy and new keys)
      const payload = response.data || {};
      const s = payload.stats || {};
      const normalized = {
        stats: {
          totalRevenue: Number(s.totalRevenue ?? s.sales ?? s.revenue ?? 0),
          totalOrders: Number(s.totalOrders ?? s.totalOrders ?? s.total ?? 0),
          pendingOrders: Number(s.pendingOrders ?? s.pending ?? s.pendingOrders ?? 0),
          totalProducts: Number(s.totalProducts ?? s.listings ?? s.products ?? 0),
          processingOrders: Number(s.processingOrders ?? s.processing ?? 0),
          shippedOrders: Number(s.shippedOrders ?? s.shipped ?? 0),
          deliveredOrders: Number(s.deliveredOrders ?? s.delivered ?? 0),
          cancelledOrders: Number(s.cancelledOrders ?? s.cancelled ?? 0)
        },
          recent_orders: (payload.recent_orders || payload.recentOrders || payload.recentOrdersList || []).map(o => ({
          id: o.id,
          total_price: o.total_price ?? o.total ?? o.totalPrice ?? 0,
          status: o.status,
          created_at: o.created_at || o.createdAt,
          buyer_name: (o.buyer_name ?? o.buyer ?? o.buyerName) || 'N/A',
          buyer_email: o.buyer_email ?? o.buyerEmail ?? null,
          items_count: o.items_count ?? o.itemsCount ?? 0
        })),
        low_stock_products: payload.low_stock_products || payload.low_stock || []
      };
      setData(normalized);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      setError(error.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleShip = async (orderId) => {
    try {
      await api.put(`/seller/orders/${orderId}/status`, { status: 'shipped' });
      await fetchDashboard();
    } catch (error) {
      console.error('Failed to ship:', error);
      alert('Failed to ship item.');
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
            <h2 className={styles.title}>Shop Overview</h2>
          </div>
        </header>

        {/* Error Message */}
        {error && (
          <div className={styles.errorBanner}>
            <span>❌ {error}</span>
            <button onClick={() => setError(null)} className={styles.closeError}>×</button>
          </div>
        )}

        {/* Stats Grid */}
        <div className={styles.statsGrid}>
          <MetricCard
            title="Total Revenue"
            value={loading ? '...' : `TSh ${Number(data.stats?.totalRevenue || 0).toLocaleString()}`}
            icon={<HiOutlineCurrencyDollar size={24} />}
            color="accent"
          />
          <MetricCard
            title="Total Orders"
            value={loading ? '...' : data.stats?.totalOrders || 0}
            icon={<HiOutlineShoppingBag size={24} />}
            color="primary"
          />
          <MetricCard
            title="Pending Orders"
            value={loading ? '...' : data.stats?.pendingOrders || 0}
            icon={<HiOutlineClock size={24} />}
            color="warning"
          />
          <MetricCard
            title="Total Products"
            value={loading ? '...' : data.stats?.totalProducts || 0}
            icon={<HiOutlineArchive size={24} />}
            color="primary"
          />
        </div>

        {/* Orders Table */}
        <div className={styles.tableCard}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Recent Orders</h3>
            <button
              onClick={() => navigate('/seller/orders')}
              className={styles.viewAllBtn}
            >
              View All
            </button>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Order ID</th>
                  <th className={styles.th}>Buyer</th>
                  <th className={styles.th}>Total</th>
                  <th className={styles.th}>Status</th>
                  <th className={`${styles.th} ${styles.thActions}`}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" className={styles.loadingState}>
                      <span className={styles.spinner} />
                      Loading dashboard...
                    </td>
                  </tr>
                ) : data.recent_orders && data.recent_orders.length > 0 ? (
                  data.recent_orders.map((o) => (
                    <tr key={o.id} className={styles.row}>
                      <td className={styles.td}>#{o.id}</td>
                      <td className={styles.td}>{o.buyer_name || 'N/A'}</td>
                      <td className={styles.td}>
                        TSh {Number(o.total_price || 0).toLocaleString()}
                      </td>
                      <td className={styles.td}>
                        <span className={`${styles.statusBadge} ${styles[o.status]}`}>
                          {o.status}
                        </span>
                      </td>
                      <td className={`${styles.td} ${styles.actions}`}>
                        {o.status === 'pending' && (
                          <button
                            onClick={() => handleShip(o.id)}
                            className={styles.shipBtn}
                          >
                            <HiOutlineTruck size={16} />
                            Ship Item
                          </button>
                        )}
                        {o.status === 'processing' && (
                          <button
                            onClick={() => handleShip(o.id)}
                            className={styles.shipBtn}
                          >
                            <HiOutlineTruck size={16} />
                            Ship
                          </button>
                        )}
                        {o.status === 'shipped' && (
                          <span className={styles.shippedLabel}>In Transit</span>
                        )}
                        {o.status === 'delivered' && (
                          <span className={styles.deliveredLabel}>✓ Delivered</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className={styles.emptyState}>
                      <HiOutlineShoppingBag size={48} className={styles.emptyIcon} />
                      <p>No orders yet</p>
                      <span>Orders will appear here when customers purchase your products</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Products */}
        {data.low_stock_products && data.low_stock_products.length > 0 && (
          <div className={styles.tableCard}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>⚠️ Low Stock Products</h3>
              <button
                onClick={() => navigate('/seller/inventory')}
                className={styles.viewAllBtn}
              >
                View All
              </button>
            </div>

            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>Product</th>
                    <th className={styles.th}>Price</th>
                    <th className={styles.th}>Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {data.low_stock_products.map((product) => (
                    <tr key={product.id} className={styles.row}>
                      <td className={styles.td}>{product.name}</td>
                      <td className={styles.td}>TSh {Number(product.price).toLocaleString()}</td>
                      <td className={styles.td}>
                        <span className={styles.lowStockBadge}>
                          {product.stock} left
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ── Metric Card Component ──
const MetricCard = ({ title, value, icon, color }) => {
  const colorMap = {
    accent: styles.cardAccent,
    primary: styles.cardPrimary,
    warning: styles.cardWarning,
    success: styles.cardSuccess,
  };
  return (
    <div className={`${styles.card} ${colorMap[color] || ''}`}>
      <div className={styles.cardIcon}>{icon}</div>
      <div className={styles.cardContent}>
        <p className={styles.cardLabel}>{title}</p>
        <h4 className={styles.cardValue}>{value}</h4>
      </div>
    </div>
  );
};

// ── Sidebar ──
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