import { useEffect, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import api from '../../services/api';
import styles from './Payouts.module.css';

export default function Payouts() {
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payingId, setPayingId] = useState(null);

  const fetchPayouts = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/payouts');
      setPayouts(data.payouts || []);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to load payouts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const request = setTimeout(fetchPayouts, 0);
    return () => clearTimeout(request);
  }, []);

  const markPaid = async (id) => {
    setPayingId(id);
    try {
      await api.put(`/admin/payouts/${id}/pay`);
      setPayouts((current) => current.map((payout) => (
        payout.id === id ? { ...payout, status: 'paid', paid_at: new Date().toISOString() } : payout
      )));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to mark payout as paid.');
    } finally {
      setPayingId(null);
    }
  };

  return (
    <AdminLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>SETTLEMENTS</span>
            <h1 className={styles.title}>Seller payouts</h1>
            <p className={styles.subtitle}>Review buyer payments and release seller earnings.</p>
          </div>
          <button className={styles.refreshButton} onClick={fetchPayouts} disabled={loading}>Refresh</button>
        </header>
        {error && <p className={styles.error}>{error}</p>}
        <div className={styles.tableWrap}>
          {loading ? <p className={styles.empty}>Loading payouts...</p> : payouts.length === 0 ? <p className={styles.empty}>No seller payouts yet.</p> : (
            <table className={styles.table}>
              <thead><tr><th>Seller</th><th>Payment number</th><th>Order</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>{payouts.map((payout) => (
                <tr key={payout.id}>
                  <td><strong>{payout.seller_name}</strong><small>{payout.seller_email}</small></td>
                  <td><span className={payout.seller_phone ? styles.phone : styles.phoneMissing}>{payout.seller_phone || 'Missing number'}</span></td>
                  <td>#{payout.order_id}</td>
                  <td>TSh {Number(payout.amount).toLocaleString()}</td>
                  <td><span className={`${styles.status} ${payout.status === 'paid' ? styles.paid : styles.pending}`}>{payout.status}</span></td>
                  <td>{payout.status === 'pending' && <button className={styles.payButton} onClick={() => markPaid(payout.id)} disabled={payingId === payout.id}>{payingId === payout.id ? 'Saving...' : 'Mark Paid'}</button>}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
