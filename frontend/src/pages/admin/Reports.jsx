import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import api from '../../services/api';
import {
  HiOutlineDocument,
  HiOutlineDownload,
  HiOutlineEye,
  HiOutlineRefresh,
  HiOutlinePlus,
  HiOutlineSearch,
  HiOutlineX,
} from 'react-icons/hi';
import styles from './Reports.module.css';

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // ── Fetch reports ──
  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/admin/reports');
      setReports(res.data);
      setFilteredReports(res.data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError('Failed to load reports. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Auto-refresh ──
  useEffect(() => {
    fetchReports();
    const interval = setInterval(fetchReports, 30000);
    return () => clearInterval(interval);
  }, [fetchReports]);

  // ── Search ──
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredReports(reports);
      return;
    }
    const lower = searchTerm.toLowerCase();
    const filtered = reports.filter(
      (r) =>
        r.name.toLowerCase().includes(lower) ||
        r.type.toLowerCase().includes(lower) ||
        r.status.toLowerCase().includes(lower)
    );
    setFilteredReports(filtered);
  }, [searchTerm, reports]);

  // ── Generate new report ──
  const generateReport = async () => {
    if (!window.confirm('Generate a new report? This may take a moment.')) return;
    setGenerating(true);
    try {
      await api.post('/admin/reports/generate');
      alert('Report generation started. It may take a few minutes to complete.');
      setTimeout(fetchReports, 2000);
    } catch (err) {
      console.error('Error generating report:', err);
      alert(err.response?.data?.message || 'Failed to generate report.');
    } finally {
      setGenerating(false);
    }
  };

  // ── View report ──
  const openModal = (report) => {
    setSelectedReport(report);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedReport(null);
  };

  // ── Download report ──
  const downloadReport = (report) => {
    // Create CSV content (mock – replace with real data from backend if available)
    const headers = ['Report ID', 'Name', 'Date', 'Type', 'Status'];
    const row = [report.id, report.name, report.date, report.type, report.status];
    const csvContent = [headers.join(','), row.join(',')].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${report.name.replace(/\s+/g, '_')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const clearSearch = () => setSearchTerm('');

  return (
    <AdminLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Reports</h1>
            <p className={styles.subtitle}>
              Generate and view system reports
              {lastUpdated && (
                <span className={styles.lastUpdated}>
                  {' '}
                  · Updated {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
          <div className={styles.headerActions}>
            <button
              className={styles.refreshBtn}
              onClick={fetchReports}
              disabled={loading}
            >
              <HiOutlineRefresh /> {loading ? 'Loading...' : 'Refresh'}
            </button>
            <button
              className={styles.generateBtn}
              onClick={generateReport}
              disabled={generating}
            >
              <HiOutlinePlus /> {generating ? 'Generating...' : 'Generate New Report'}
            </button>
          </div>
        </header>

        <div className={styles.searchBar}>
          <HiOutlineSearch className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search reports by name, type, or status..."
            className={styles.searchInput}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className={styles.clearBtn} onClick={clearSearch}>
              <HiOutlineX />
            </button>
          )}
        </div>

        {error && <div className={styles.errorMsg}>{error}</div>}

        <div className={styles.tableWrapper}>
          {loading && filteredReports.length === 0 ? (
            <div className={styles.loadingState}>
              <span className={styles.spinner} />
              Loading reports...
            </div>
          ) : filteredReports.length === 0 ? (
            <div className={styles.emptyState}>
              {searchTerm ? 'No reports match your search.' : 'No reports available.'}
              {!searchTerm && (
                <button
                  className={styles.generateBtn}
                  onClick={generateReport}
                  disabled={generating}
                >
                  <HiOutlinePlus /> Generate First Report
                </button>
              )}
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Report Name</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((report) => (
                  <tr key={report.id}>
                    <td>
                      <HiOutlineDocument className={styles.docIcon} /> {report.name}
                    </td>
                    <td>{report.date}</td>
                    <td>
                      <span className={styles.typeBadge}>{report.type}</span>
                    </td>
                    <td>
                      <span className={`${styles.statusBadge} ${styles[report.status]}`}>
                        {report.status}
                      </span>
                    </td>
                    <td className={styles.actionsCell}>
                      {report.status === 'ready' && (
                        <>
                          <button
                            className={styles.viewBtn}
                            onClick={() => openModal(report)}
                          >
                            <HiOutlineEye /> View
                          </button>
                          <button
                            className={styles.downloadBtn}
                            onClick={() => downloadReport(report)}
                          >
                            <HiOutlineDownload /> Download
                          </button>
                        </>
                      )}
                      {report.status === 'pending' && (
                        <span className={styles.pendingLabel}>Generating...</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── View Report Modal ── */}
      {showModal && selectedReport && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Report Details</h2>
              <button className={styles.modalClose} onClick={closeModal}>
                <HiOutlineX size={24} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Name</span>
                <span className={styles.detailValue}>{selectedReport.name}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Date</span>
                <span className={styles.detailValue}>{selectedReport.date}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Type</span>
                <span className={styles.typeBadge}>{selectedReport.type}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Status</span>
                <span className={`${styles.statusBadge} ${styles[selectedReport.status]}`}>
                  {selectedReport.status}
                </span>
              </div>
              {selectedReport.status === 'ready' && (
                <button
                  className={styles.downloadModalBtn}
                  onClick={() => {
                    downloadReport(selectedReport);
                    closeModal();
                  }}
                >
                  <HiOutlineDownload /> Download Report
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}