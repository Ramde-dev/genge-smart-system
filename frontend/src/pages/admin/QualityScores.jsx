import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import api from '../../services/api';
import {
  HiOutlineStar,
  HiOutlineTrendingUp,
  HiOutlineTrendingDown,
  HiOutlineRefresh,
} from 'react-icons/hi';
import styles from './QualityScores.module.css';

export default function QualityScores() {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // ── Fetch scores ──
  const fetchScores = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/admin/quality-scores');
      setScores(res.data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching quality scores:', err);
      setError('Failed to load quality scores. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Auto-refresh every 30 seconds ──
  useEffect(() => {
    fetchScores();
    const interval = setInterval(fetchScores, 30000);
    return () => clearInterval(interval);
  }, [fetchScores]);

  // ── Trend helper ──
  const getTrend = (score) => {
    if (score >= 4.5) return 'up';
    if (score >= 3.5) return 'stable';
    return 'down';
  };

  return (
    <AdminLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Quality Scores</h1>
            <p className={styles.subtitle}>
              Performance and quality metrics for sellers
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
            onClick={fetchScores}
            disabled={loading}
          >
            <HiOutlineRefresh /> {loading ? 'Loading...' : 'Refresh'}
          </button>
        </header>

        {error && <div className={styles.errorMsg}>{error}</div>}

        {loading && scores.length === 0 ? (
          <div className={styles.loadingState}>
            <span className={styles.spinner} />
            Loading scores...
          </div>
        ) : scores.length === 0 ? (
          <div className={styles.emptyState}>No quality scores available.</div>
        ) : (
          <div className={styles.scoreGrid}>
            {scores.map((item, idx) => {
              const trend = getTrend(item.score);
              return (
                <div key={idx} className={styles.scoreCard}>
                  <div className={styles.cardHeader}>
                    <h3 className={styles.sellerName}>{item.seller}</h3>
                    <span className={styles.scoreBadge}>
                      <HiOutlineStar className={styles.starIcon} />
                      {item.score}
                    </span>
                  </div>
                  <div className={styles.scoreValue}>{item.score}</div>
                  <div className={styles.scoreMeta}>
                    <span className={styles.metaItem}>
                      <span className={styles.metaLabel}>Orders</span>
                      <span className={styles.metaValue}>{item.orders || 0}</span>
                    </span>
                    <span className={styles.metaItem}>
                      <span className={styles.metaLabel}>Avg. Order</span>
                      <span className={styles.metaValue}>
                        {item.avg_order_value ? `TSh ${(item.avg_order_value / 1000).toFixed(0)}k` : '—'}
                      </span>
                    </span>
                  </div>
                  <div className={styles.trend}>
                    {trend === 'up' && (
                      <>
                        <HiOutlineTrendingUp className={styles.trendUp} />
                        <span>Improving</span>
                      </>
                    )}
                    {trend === 'stable' && (
                      <span className={styles.stable}>Stable</span>
                    )}
                    {trend === 'down' && (
                      <>
                        <HiOutlineTrendingDown className={styles.trendDown} />
                        <span>Declining</span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}