import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import api from '../../services/api';
import styles from './Analytics.module.css';
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
  HiOutlineReceiptTax,
  HiOutlineShoppingCart,
  HiOutlineUsers,
} from 'react-icons/hi';

// ── Custom Tooltip ──
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className={styles.tooltip}>
        <p className={styles.tooltipLabel}>{label}</p>
        <p className={styles.tooltipValue}>
          TSh {Number(payload[0].value).toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
};

export default function Analytics() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [stats, setStats] = useState({ revenue: 0, avgOrder: 0, totalOrders: 0, customers: 0 });
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [mRes, cRes] = await Promise.all([
          api.get('/seller/analytics'),
          api.get('/seller/analytics/chart'),
        ]);
        setStats(mRes.data.data || {});
        setChartData(cRes.data.data || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();

    // Small delay to ensure the container is rendered with proper dimensions
    const timer = setTimeout(() => setIsReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

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
            <h2 className={styles.title}>Analytics</h2>
          </div>
        </header>

        {/* Stats Grid */}
        <div className={styles.statsGrid}>
          <MetricCard
            title="Total Revenue"
            value={loading ? '...' : `TSh ${Number(stats.revenue || 0).toLocaleString()}`}
            icon={<HiOutlineCurrencyDollar size={24} />}
            color="accent"
          />
          <MetricCard
            title="Avg. Order Value"
            value={loading ? '...' : `TSh ${Number(stats.avgOrder || 0).toLocaleString()}`}
            icon={<HiOutlineReceiptTax size={24} />}
            color="primary"
          />
          <MetricCard
            title="Total Orders"
            value={loading ? '...' : stats.totalOrders || 0}
            icon={<HiOutlineShoppingCart size={24} />}
            color="warning"
          />
          <MetricCard
            title="New Customers"
            value={loading ? '...' : stats.customers || 0}
            icon={<HiOutlineUsers size={24} />}
            color="success"
          />
        </div>

        {/* Chart Card */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h3 className={styles.chartTitle}>Sales Trends</h3>
            {!loading && chartData.length > 0 && (
              <span className={styles.chartPeriod}>Last 30 days</span>
            )}
          </div>

          <div className={styles.chartContainer}>
            {loading ? (
              <div className={styles.loadingState}>
                <span className={styles.spinner} />
                Loading chart data...
              </div>
            ) : chartData.length > 0 ? (
              isReady && (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      minTickGap={36}
                      interval={0}
                      tick={{ fontSize: 10, fill: '#94a3b8' }}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        if (Number.isNaN(date.getTime())) return value;
                        return date.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        });
                      }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: '#94a3b8' }}
                      tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                      width={42}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="amount"
                      stroke="#1a5a7a"
                      fill="#1a5a7a"
                      fillOpacity={0.1}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )
            ) : (
              <div className={styles.emptyState}>
                <HiOutlineTrendingUp size={48} className={styles.emptyIcon} />
                <p>No sales data available</p>
                <span>Sales data will appear here once you start selling</span>
              </div>
            )}
          </div>
        </div>
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
    <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarExpanded : styles.sidebarCollapsed} ${mobileOpen ? styles.mobileOpen : ''}`}>
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
            className={`${styles.navLink} ${
              location.pathname === link.path ? styles.activeNavLink : ''
            }`}
            data-label={link.label}
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
          className={styles.navLink}
          data-label="Profile"
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
          className={styles.navLink}
          data-label="Sign Out"
        >
          <HiOutlineLogout size={22} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}