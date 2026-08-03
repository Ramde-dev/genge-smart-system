import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import api from '../../services/api';
import {
  HiOutlineEye,
  HiOutlineCheck,
  HiOutlineX,
  HiOutlineClock,
  HiOutlineSearch,
  HiOutlineRefresh,
  HiOutlineX as HiOutlineClear,
} from 'react-icons/hi';
import styles from './FraudAlerts.module.css';

export default function FraudAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [filteredAlerts, setFilteredAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // ── Fetch alerts ──
  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/admin/fraud-alerts');
      setAlerts(res.data);
      setFilteredAlerts(res.data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching fraud alerts:', err);
      setError('Failed to load fraud alerts. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Auto-refresh ──
  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  // ── Search ──
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredAlerts(alerts);
      return;
    }
    const lower = searchTerm.toLowerCase();
    const filtered = alerts.filter(
      (a) =>
        a.user_name?.toLowerCase().includes(lower) ||
        a.type?.toLowerCase().includes(lower) ||
        a.risk_level?.toLowerCase().includes(lower) ||
        a.status?.toLowerCase().includes(lower)
    );
    setFilteredAlerts(filtered);
  }, [searchTerm, alerts]);

  // ── Resolve alert ──
  const resolveAlert = async (alertId) => {
    if (!window.confirm('Resolve this fraud alert?')) return;
    setActionLoading(alertId);
    try {
      await api.put(`/admin/fraud-alerts/${alertId}/resolve`);
      const updatedAlerts = alerts.map((a) =>
        a.id === alertId ? { ...a, status: 'resolved' } : a
      );
      setAlerts(updatedAlerts);
      setFilteredAlerts(
        filteredAlerts.map((a) =>
          a.id === alertId ? { ...a, status: 'resolved' } : a
        )
      );
    } catch (err) {
      console.error('Error resolving alert:', err);
      alert('Failed to resolve alert. Please try again.');
      fetchAlerts(); // revert on error
    } finally {
      setActionLoading(null);
    }
  };

  // ── Open modal ──
  const openModal = (alert) => {
    setSelectedAlert(alert);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedAlert(null);
  };

  const clearSearch = () => setSearchTerm('');

  const riskLevelMap = {
    critical: 'critical',
    high: 'high',
    medium: 'medium',
    low: 'low',
  };

  return (
    <AdminLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Fraud Alerts</h1>
            <p className={styles.subtitle}>
              Monitor and respond to suspicious activities
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
            onClick={fetchAlerts}
            disabled={loading}
          >
            <HiOutlineRefresh /> {loading ? 'Loading...' : 'Refresh'}
          </button>
        </header>

        <div className={styles.searchBar}>
          <HiOutlineSearch className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search by user, type, risk, or status..."
            className={styles.searchInput}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className={styles.clearBtn} onClick={clearSearch}>
              <HiOutlineClear />
            </button>
          )}
        </div>

        {error && <div className={styles.errorMsg}>{error}</div>}

        <div className={styles.tableWrapper}>
          {loading && filteredAlerts.length === 0 ? (
            <div className={styles.loadingState}>
              <span className={styles.spinner} />
              Loading alerts...
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className={styles.emptyState}>
              {searchTerm ? 'No alerts match your search.' : 'No fraud alerts found.'}
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Type</th>
                  <th>Risk</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlerts.map((alert) => (
                  <tr key={alert.id} className={styles[riskLevelMap[alert.risk_level] || 'medium']}>
                    <td>{alert.user_name || alert.user}</td>
                    <td>{alert.type}</td>
                    <td><span className={styles.riskBadge}>{alert.risk_level || 'medium'}</span></td>
                    <td>{new Date(alert.created_at).toLocaleString()}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${styles[alert.status]}`}>
                        {alert.status}
                      </span>
                    </td>
                    <td className={styles.actionsCell}>
                      {alert.status !== 'resolved' && (
                        <button
                          className={styles.resolveBtn}
                          onClick={() => resolveAlert(alert.id)}
                          disabled={actionLoading === alert.id}
                        >
                          {actionLoading === alert.id ? (
                            <span className={styles.spinnerSmall} />
                          ) : (
                            <><HiOutlineCheck /> Resolve</>
                          )}
                        </button>
                      )}
                      <button className={styles.investigateBtn} onClick={() => openModal(alert)}>
                        <HiOutlineEye /> Investigate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Investigate Modal ── */}
      {showModal && selectedAlert && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Fraud Alert Details</h2>
              <button className={styles.modalClose} onClick={closeModal}>
                <HiOutlineClear size={24} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>User</span>
                <span className={styles.detailValue}>{selectedAlert.user_name || selectedAlert.user}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Type</span>
                <span className={styles.detailValue}>{selectedAlert.type}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Risk Level</span>
                <span className={styles.riskBadge}>{selectedAlert.risk_level || 'medium'}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Status</span>
                <span className={`${styles.statusBadge} ${styles[selectedAlert.status]}`}>
                  {selectedAlert.status}
                </span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Description</span>
                <span className={styles.detailValue}>{selectedAlert.description || 'No description'}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Created At</span>
                <span className={styles.detailValue}>
                  {new Date(selectedAlert.created_at).toLocaleString()}
                </span>
              </div>
              {selectedAlert.status !== 'resolved' && (
                <button
                  className={styles.resolveModalBtn}
                  onClick={() => {
                    closeModal();
                    resolveAlert(selectedAlert.id);
                  }}
                >
                  <HiOutlineCheck /> Resolve Alert
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}