import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import api from '../../services/api';
import {
  HiOutlineCheck,
  HiOutlineX,
  HiOutlineEye,
  HiOutlineSearch,
  HiOutlineRefresh,
  HiOutlineX as HiOutlineClear,
} from 'react-icons/hi';
import styles from './ManageSellers.module.css';

export default function ManageSellers() {
  const [sellers, setSellers] = useState([]);
  const [filteredSellers, setFilteredSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // ── Fetch sellers ──
  const fetchSellers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/admin/sellers');
      setSellers(res.data);
      setFilteredSellers(res.data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching sellers:', err);
      setError('Failed to load sellers. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Auto-refresh ──
  useEffect(() => {
    fetchSellers();
    const interval = setInterval(fetchSellers, 30000);
    return () => clearInterval(interval);
  }, [fetchSellers]);

  // ── Search ──
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredSellers(sellers);
      return;
    }
    const lower = searchTerm.toLowerCase();
    const filtered = sellers.filter(
      (s) =>
        s.store_name?.toLowerCase().includes(lower) ||
        s.email?.toLowerCase().includes(lower) ||
        s.shopName?.toLowerCase().includes(lower) ||
        s.name?.toLowerCase().includes(lower)
    );
    setFilteredSellers(filtered);
  }, [searchTerm, sellers]);

  // ── Update status ──
  const updateSellerStatus = async (sellerId, newStatus, actionLabel) => {
    if (!window.confirm(`Are you sure you want to ${actionLabel} this seller?`)) return;

    setActionLoading(sellerId);
    try {
      let endpoint;
      if (newStatus === 'active') {
        endpoint = `/admin/sellers/${sellerId}/approve`;
      } else if (newStatus === 'suspended') {
        endpoint = `/admin/sellers/${sellerId}/suspend`;
      } else {
        endpoint = `/admin/sellers/${sellerId}/suspend`;
      }
      await api.put(endpoint);
      const updatedSellers = sellers.map((s) =>
        s.id === sellerId ? { ...s, status: newStatus } : s
      );
      setSellers(updatedSellers);
      setFilteredSellers(
        filteredSellers.map((s) =>
          s.id === sellerId ? { ...s, status: newStatus } : s
        )
      );
    } catch (err) {
      console.error('Status update error:', err);
      alert(err.response?.data?.message || `Failed to ${actionLabel} seller.`);
      fetchSellers();
    } finally {
      setActionLoading(null);
    }
  };

  // ── Open/Close Modal ──
  const openModal = (seller) => {
    setSelectedSeller(seller);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedSeller(null);
  };

  const clearSearch = () => setSearchTerm('');

  return (
    <AdminLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Manage Sellers</h1>
            <p className={styles.subtitle}>
              Approve and monitor seller accounts
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
            onClick={fetchSellers}
            disabled={loading}
          >
            <HiOutlineRefresh /> {loading ? 'Loading...' : 'Refresh'}
          </button>
        </header>

        <div className={styles.searchBar}>
          <HiOutlineSearch className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search sellers by store name or email..."
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
          {loading && filteredSellers.length === 0 ? (
            <div className={styles.loadingState}>
              <span className={styles.spinner} />
              Loading sellers...
            </div>
          ) : filteredSellers.length === 0 ? (
            <div className={styles.emptyState}>
              {searchTerm ? 'No sellers match your search.' : 'No sellers found.'}
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Store</th>
                  <th>Owner</th>
                  <th>Email</th>
                  <th>Rating</th>
                  <th>Orders</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSellers.map((seller) => (
                  <tr key={seller.id}>
                    <td>
                      <span className={styles.storeName}>
                        {seller.store_name || seller.shopName || seller.name}
                      </span>
                    </td>
                    <td>{seller.owner || '—'}</td>
                    <td>{seller.email}</td>
                    <td>
                      {seller.rating ? (
                        <span className={styles.ratingValue}>{seller.rating.toFixed(1)}</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>{seller.orders || 0}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${styles[seller.status]}`}>
                        {seller.status || 'pending'}
                      </span>
                    </td>
                    <td className={styles.actionsCell}>
                      {seller.status === 'pending' && (
                        <>
                          <button
                            className={styles.approveBtn}
                            onClick={() => updateSellerStatus(seller.id, 'active', 'approve')}
                            disabled={actionLoading === seller.id}
                          >
                            {actionLoading === seller.id ? (
                              <span className={styles.spinnerSmall} />
                            ) : (
                              <><HiOutlineCheck /> Approve</>
                            )}
                          </button>
                          <button
                            className={styles.rejectBtn}
                            onClick={() => updateSellerStatus(seller.id, 'suspended', 'reject')}
                            disabled={actionLoading === seller.id}
                          >
                            {actionLoading === seller.id ? (
                              <span className={styles.spinnerSmall} />
                            ) : (
                              <><HiOutlineX /> Reject</>
                            )}
                          </button>
                        </>
                      )}
                      {seller.status === 'active' && (
                        <button
                          className={styles.suspendBtn}
                          onClick={() => updateSellerStatus(seller.id, 'suspended', 'suspend')}
                          disabled={actionLoading === seller.id}
                        >
                          {actionLoading === seller.id ? (
                            <span className={styles.spinnerSmall} />
                          ) : (
                            <><HiOutlineX /> Suspend</>
                          )}
                        </button>
                      )}
                      {seller.status === 'suspended' && (
                        <button
                          className={styles.reinstateBtn}
                          onClick={() => updateSellerStatus(seller.id, 'active', 'reinstate')}
                          disabled={actionLoading === seller.id}
                        >
                          {actionLoading === seller.id ? (
                            <span className={styles.spinnerSmall} />
                          ) : (
                            <><HiOutlineCheck /> Reinstate</>
                          )}
                        </button>
                      )}
                      <button className={styles.viewBtn} onClick={() => openModal(seller)}>
                        <HiOutlineEye /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── View Modal ── */}
      {showModal && selectedSeller && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Seller Details</h2>
              <button className={styles.modalClose} onClick={closeModal}>
                <HiOutlineClear size={24} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Store Name</span>
                <span className={styles.detailValue}>
                  {selectedSeller.store_name || selectedSeller.shopName || selectedSeller.name}
                </span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Owner</span>
                <span className={styles.detailValue}>{selectedSeller.owner || '—'}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Email</span>
                <span className={styles.detailValue}>{selectedSeller.email}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Rating</span>
                <span className={styles.detailValue}>
                  {selectedSeller.rating ? selectedSeller.rating.toFixed(1) : '—'}
                </span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Orders</span>
                <span className={styles.detailValue}>{selectedSeller.orders || 0}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Status</span>
                <span className={`${styles.statusBadge} ${styles[selectedSeller.status]}`}>
                  {selectedSeller.status || 'pending'}
                </span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Joined</span>
                <span className={styles.detailValue}>
                  {selectedSeller.created_at
                    ? new Date(selectedSeller.created_at).toLocaleDateString()
                    : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}