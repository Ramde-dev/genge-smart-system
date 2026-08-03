import { useState, useEffect } from 'react';
import BuyerLayout from './BuyerLayout';
import api from '../../services/api';
import { HiOutlineClock, HiOutlineCheckCircle, HiOutlineTruck, HiOutlineXCircle } from 'react-icons/hi';
import styles from './Orders.module.css';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await api.get('/buyer/orders');
        setOrders(res.data || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching orders:', err);
        setError('Failed to load orders. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return <HiOutlineClock className={styles.statusIconPending} />;
      case 'shipped':
        return <HiOutlineTruck className={styles.statusIconShipped} />;
      case 'delivered':
        return <HiOutlineCheckCircle className={styles.statusIconDelivered} />;
      case 'cancelled':
        return <HiOutlineXCircle className={styles.statusIconCancelled} />;
      default:
        return <HiOutlineClock />;
    }
  };

  const getStatusClass = (status) => {
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
        return '';
    }
  };

  return (
    <BuyerLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>My Orders</h1>
          <p className={styles.subtitle}>Track and manage all your orders</p>
        </header>

        {loading ? (
          <div className={styles.loadingState}>
            <span className={styles.spinner} />
            Loading orders...
          </div>
        ) : error ? (
          <div className={styles.errorState}>{error}</div>
        ) : orders.length === 0 ? (
          <div className={styles.emptyState}>
            <HiOutlineClock size={48} className={styles.emptyIcon} />
            <p>No orders yet</p>
            <span>Your orders will appear here once you start shopping.</span>
          </div>
        ) : (
          <div className={styles.ordersList}>
            {orders.map((order) => (
              <div key={order.id} className={styles.orderCard}>
                <div className={styles.orderHeader}>
                  <div className={styles.orderMeta}>
                    <span className={styles.orderId}>Order #{order.id}</span>
                    <span className={styles.orderDate}>
                      {new Date(order.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <span className={`${styles.orderStatus} ${getStatusClass(order.status)}`}>
                    {getStatusIcon(order.status)}
                    {order.status}
                  </span>
                </div>
                <div className={styles.orderItems}>
                  {order.items?.map((item) => (
                    <div key={item.id} className={styles.orderItem}>
                      <img
                        src={item.image_url || '/images/placeholder.png'}
                        alt={item.name}
                        className={styles.itemImage}
                      />
                      <div className={styles.itemDetails}>
                        <h4 className={styles.itemName}>{item.name}</h4>
                        <span className={styles.itemQty}>× {item.quantity}</span>
                      </div>
                      <span className={styles.itemPrice}>
                        TSh {Number(item.price).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
                <div className={styles.orderFooter}>
                  <span className={styles.totalLabel}>Total</span>
                  <span className={styles.totalAmount}>
                    TSh {Number(order.total_price).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </BuyerLayout>
  );
}