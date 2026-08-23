import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import api from '../../services/api';
import {
  HiOutlineUsers,
  HiOutlineUserGroup,
  HiOutlineShieldCheck,
  HiOutlineStar,
  HiOutlineChartBar,
  HiOutlineExclamationCircle,
  HiOutlineLightBulb,
} from 'react-icons/hi';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import styles from './Dashboard.module.css';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalSellers: 0,
    fraudAlerts: 0,
    avgQualityScore: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [sellerAnalytics, setSellerAnalytics] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);

  // ── Fetch real data ──
  const fetchDashboard = useCallback(async () => {
    try {
      const res = await api.get('/admin/dashboard');
      const data = res.data;
      setStats(data.stats);
      setRecommendations(data.recommendations || []);
      setSellerAnalytics(data.sellerAnalytics || []);
      setRecentActivity(data.recentActivity || []);
      setChartData(data.chartData || []); // ← real chart data
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error('Error fetching dashboard:', err);
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Initial fetch + auto‑refresh every 30s ──
  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  if (loading) {
    return (
      <AdminLayout>
        <div className={styles.loadingState}>
          <span className={styles.spinner} />
          Loading dashboard...
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className={styles.errorState}>{error}</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Dashboard</h1>
            <p className={styles.subtitle}>
              Welcome back, Admin
              {lastUpdated && (
                <span className={styles.lastUpdated}>
                  {' '}
                  · Updated {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
          <button
            className={styles.refreshBtn}
            onClick={fetchDashboard}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Refresh Now'}
          </button>
        </header>

        {/* ── Stats Grid ── */}
        <div className={styles.statsGrid}>
          <StatCard
            title="Total Users"
            value={stats.totalUsers}
            icon={<HiOutlineUsers size={24} />}
            color="primary"
            trend="+12%"
          />
          <StatCard
            title="Total Sellers"
            value={stats.totalSellers}
            icon={<HiOutlineUserGroup size={24} />}
            color="success"
            trend="+5%"
          />
          <StatCard
            title="Fraud Alerts"
            value={stats.fraudAlerts}
            icon={<HiOutlineExclamationCircle size={24} />}
            color="danger"
            trend="-3%"
          />
          <StatCard
            title="Avg. Quality Score"
            value={stats.avgQualityScore || 0}
            icon={<HiOutlineStar size={24} />}
            color="warning"
            trend="+0.2"
          />
        </div>

        {/* ── Chart ── */}
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Activity Overview (Last 30 Days)</h3>
          <div className={styles.chartContainer}>
            {chartData.length === 0 ? (
              <div className={styles.noChartData}>No sales data available</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12, fill: '#94a3b8' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.5rem',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.1}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ── Smart Features Row ── */}
        <div className={styles.smartGrid}>
          <SmartCard
            title="Smart Recommendation"
            icon={<HiOutlineLightBulb size={28} />}
            color="#8b5cf6"
          >
            <ul className={styles.recommendationList}>
              {recommendations.length === 0 ? (
                <li className={styles.noRecommendation}>All sellers are performing well!</li>
              ) : (
                recommendations.map((rec, idx) => (
                  <li key={idx} className={`${styles.recommendationItem} ${styles[rec.priority]}`}>
                    {rec.message}
                  </li>
                ))
              )}
            </ul>
          </SmartCard>

          <SmartCard
            title="Smart Seller Analytics"
            icon={<HiOutlineChartBar size={28} />}
            color="#3b82f6"
          >
            <div className={styles.sellerAnalytics}>
              {sellerAnalytics.length === 0 ? (
                <p>No seller data available.</p>
              ) : (
                sellerAnalytics.map((seller, idx) => (
                  <div key={idx} className={styles.analyticsItem}>
                    <span className={styles.analyticsName}>{seller.name}</span>
                    <span className={styles.analyticsSales}>TSh {seller.sales.toLocaleString()}</span>
                    <span className={styles.analyticsRating}><HiOutlineStar /> {seller.rating.toFixed(1)}</span>
                  </div>
                ))
              )}
            </div>
          </SmartCard>

          <SmartCard
            title="Smart Fraud Controller"
            icon={<HiOutlineShieldCheck size={28} />}
            color="#ef4444"
          >
            <div className={styles.fraudStatus}>
              <p><strong>Status:</strong> Active</p>
              <p><strong>Pending alerts:</strong> {stats.fraudAlerts}</p>
              <div className={styles.fraudBar}>
                <div className={styles.fraudProgress} style={{ width: `${Math.min(100, stats.fraudAlerts * 10)}%` }} />
              </div>
              <span className={styles.fraudLabel}>
                {stats.fraudAlerts === 0 ? 'No threats detected' : `${stats.fraudAlerts} pending alert(s)`}
              </span>
            </div>
          </SmartCard>
        </div>

        {/* ── Recent Activity ── */}
        <div className={styles.recentActivity}>
          <h3 className={styles.sectionTitle}>Recent Activity</h3>
          <div className={styles.activityList}>
            {recentActivity.length === 0 ? (
              <p className={styles.noActivity}>No recent activity</p>
            ) : (
              recentActivity.map((item, idx) => (
                <div key={idx} className={styles.activityItem}>
                  <span className={styles.activityTime}>
                    {new Date(item.time).toLocaleString()}
                  </span>
                  <span>{item.action}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

// ── Stat Card ──
function StatCard({ title, value, icon, color, trend }) {
  const colorMap = {
    primary: styles.statPrimary,
    success: styles.statSuccess,
    danger: styles.statDanger,
    warning: styles.statWarning,
  };
  return (
    <div className={`${styles.statCard} ${colorMap[color]}`}>
      <div className={styles.statIcon}>{icon}</div>
      <div className={styles.statContent}>
        <p className={styles.statLabel}>{title}</p>
        <h4 className={styles.statValue}>{value}</h4>
        {trend && <span className={styles.statTrend}>{trend}</span>}
      </div>
    </div>
  );
}

// ── Smart Card ──
function SmartCard({ title, icon, color, children }) {
  return (
    <div className={styles.smartCard} style={{ borderTopColor: color }}>
      <div className={styles.smartHeader}>
        <span className={styles.smartIcon} style={{ color }}>{icon}</span>
        <h3 className={styles.smartTitle}>{title}</h3>
      </div>
      <div className={styles.smartBody}>{children}</div>
    </div>
  );
}