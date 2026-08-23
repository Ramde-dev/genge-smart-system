import { useState, useEffect, useCallback } from 'react';
import BuyerLayout from './BuyerLayout';
import api from '../../services/api';
import {
  HiOutlineTruck,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineXCircle,
  HiOutlineEye,
  HiOutlineX,
  HiOutlineLocationMarker,
  HiOutlinePhone,
  HiOutlineRefresh,
  HiOutlineChevronRight
} from 'react-icons/hi';
import styles from './Tracking.module.css';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

export default function Tracking() {
  const [currentTime] = useState(() => Date.now());
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [trackingData, setTrackingData] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [agentLocation, setAgentLocation] = useState(null);
  const [trackingEvents, setTrackingEvents] = useState([]);

  // ── Fetch orders ──
  const fetchOrders = useCallback(async () => {
    try {
      const res = await api.get('/tracking');
      setOrders(res.data.orders || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching tracking data:', err);
      setError('Failed to load tracking information.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialFetch = setTimeout(fetchOrders, 0);
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      if (!modalOpen) {
        fetchOrders();
      }
    }, 30000);
    
    return () => {
      clearTimeout(initialFetch);
      clearInterval(interval);
    };
  }, [fetchOrders, modalOpen]);

  // ── Open modal and fetch tracking details ──
  const openModal = async (order) => {
    setSelectedOrder(order);
    setModalOpen(true);
    setModalLoading(true);
    setModalError(null);
    setTrackingData(null);
    setAgentLocation(null);
    setTrackingEvents([]);

    try {
      const res = await api.get(`/tracking/${order.id}`);
      setTrackingData(res.data);
      
      // Set agent location if available
      if (res.data.tracking) {
        setAgentLocation({
          lat: parseFloat(res.data.tracking.latitude),
          lng: parseFloat(res.data.tracking.longitude),
          address: res.data.tracking.location_address,
          lastUpdate: res.data.tracking.created_at
        });
      }
      
      setTrackingEvents(res.data.events || []);
      
    } catch (err) {
      console.error('Error fetching tracking details:', err);
      setModalError(err.response?.data?.message || 'No tracking information available yet.');
    } finally {
      setModalLoading(false);
    }
  };

  // ── Refresh tracking details ──
  const refreshTracking = async () => {
    if (!selectedOrder) return;
    
    setRefreshing(true);
    try {
      const res = await api.get(`/tracking/${selectedOrder.id}`);
      setTrackingData(res.data);
      
      if (res.data.tracking) {
        setAgentLocation({
          lat: parseFloat(res.data.tracking.latitude),
          lng: parseFloat(res.data.tracking.longitude),
          address: res.data.tracking.location_address,
          lastUpdate: res.data.tracking.created_at
        });
      }
      
      setTrackingEvents(res.data.events || []);
      
    } catch (err) {
      console.error('Error refreshing tracking:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedOrder(null);
    setTrackingData(null);
    setAgentLocation(null);
    setModalError(null);
    setTrackingEvents([]);
  };

  // ── Get status icon ──
  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
      case 'assigned':
        return <HiOutlineClock className={styles.statusIconPending} />;
      case 'shipped':
      case 'picked_up':
      case 'in_transit':
        return <HiOutlineTruck className={styles.statusIconShipped} />;
      case 'delivered':
      case 'completed':
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
      case 'assigned':
        return styles.statusPending;
      case 'shipped':
      case 'picked_up':
      case 'in_transit':
        return styles.statusShipped;
      case 'delivered':
      case 'completed':
        return styles.statusDelivered;
      case 'cancelled':
        return styles.statusCancelled;
      default:
        return '';
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      'pending': 'Pending',
      'assigned': 'Assigned',
      'picked_up': 'Picked Up',
      'in_transit': 'In Transit',
      'arrived': 'Arrived',
      'shipped': 'Shipped',
      'delivered': 'Delivered',
      'completed': 'Completed',
      'cancelled': 'Cancelled'
    };
    return labels[status?.toLowerCase()] || status;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeAgo = (dateString) => {
    const diff = currentTime - new Date(dateString).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <BuyerLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <h1 className={styles.title}>Track Your Orders</h1>
          </div>
          <button 
            className={styles.refreshBtn}
            onClick={fetchOrders}
            disabled={loading}
          >
            <HiOutlineRefresh className={loading ? styles.spinning : ''} />
            Refresh
          </button>
        </header>

        {loading ? (
          <div className={styles.loadingState}>
            <span className={styles.spinner} />
            Loading tracking information...
          </div>
        ) : error ? (
          <div className={styles.errorState}>{error}</div>
        ) : orders.length === 0 ? (
          <div className={styles.emptyState}>
            <HiOutlineTruck size={48} className={styles.emptyIcon} />
            <h3>No orders to track</h3>
          </div>
        ) : (
          <div className={styles.ordersList}>
            {orders.map((order) => (
              <div key={order.id} className={styles.orderCard}>
                <div className={styles.orderHeader}>
                  <div className={styles.orderMeta}>
                    <span className={styles.orderId}>Order #{order.id}</span>
                    <span className={styles.orderDate}>
                      {formatDate(order.created_at)}
                    </span>
                  </div>
                  <div className={styles.orderStatus}>
                    {getStatusIcon(order.status)}
                    <span className={`${styles.statusLabel} ${getStatusClass(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                  </div>
                </div>

                <div className={styles.orderBody}>
                  <div className={styles.orderInfo}>
                    <div className={styles.infoRow}>
                      <span className={styles.label}>Agent:</span>
                      <span className={styles.value}>
                        {order.agent_name || 'Not assigned'}
                      </span>
                    </div>
                    {order.last_location && (
                      <div className={styles.infoRow}>
                        <span className={styles.label}>Location:</span>
                        <span className={styles.value}>
                          {order.last_location}
                        </span>
                      </div>
                    )}
                    {order.last_update && (
                      <div className={styles.infoRow}>
                        <span className={styles.label}>Last Update:</span>
                        <span className={styles.value}>
                          {getTimeAgo(order.last_update)}
                        </span>
                      </div>
                    )}
                  </div>
                  <button
                    className={styles.trackBtn}
                    onClick={() => openModal(order)}
                  >
                    <HiOutlineEye /> Track
                    <HiOutlineChevronRight size={16} />
                  </button>
                </div>

                {/* Mini timeline */}
                {order.status !== 'delivered' && order.status !== 'completed' && (
                  <div className={styles.miniTimeline}>
                    <span className={styles.timelineDot} />
                    <span className={styles.timelineLabel}>
                      {order.status === 'assigned' ? 'Waiting for pickup...' : 
                       order.status === 'picked_up' ? 'On the way!' : 
                       order.status === 'in_transit' ? 'In transit...' : 
                       'Processing...'}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Tracking Detail Modal ── */}
      {modalOpen && selectedOrder && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderLeft}>
                <h2>Order #{selectedOrder.id}</h2>
                <span className={styles.modalOrderStatus}>
                  {getStatusIcon(selectedOrder.status)}
                  {getStatusLabel(selectedOrder.status)}
                </span>
              </div>
              <button className={styles.closeBtn} onClick={closeModal}>
                <HiOutlineX size={24} />
              </button>
            </div>

            <div className={styles.modalBody}>
              {modalLoading ? (
                <div className={styles.modalLoading}>
                  <span className={styles.spinner} />
                  Loading delivery details...
                </div>
              ) : modalError ? (
                <div className={styles.modalError}>{modalError}</div>
              ) : trackingData ? (
                <>
                  {/* Agent Info */}
                  {trackingData.agent && (
                    <div className={styles.agentCard}>
                      <div className={styles.agentAvatar}>
                        {trackingData.agent.name?.charAt(0) || 'A'}
                      </div>
                      <div className={styles.agentInfo}>
                        <h4>{trackingData.agent.name}</h4>
                        <p>
                          <HiOutlinePhone size={14} />
                          {trackingData.agent.phone || 'N/A'}
                        </p>
                      </div>
                      <span className={trackingData.agent.is_available ? styles.agentAvailable : styles.agentBusy}>
                        {trackingData.agent.is_available ? 'Available' : 'Busy'}
                      </span>
                    </div>
                  )}

                  {/* Map */}
                  {agentLocation ? (
                    <div className={styles.mapWrapper}>
                      <div className={styles.mapContainer}>
                        <iframe
                          src={GOOGLE_MAPS_API_KEY
                            ? `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_API_KEY}&q=${agentLocation.lat},${agentLocation.lng}&zoom=15`
                            : `https://www.openstreetmap.org/export/embed.html?bbox=${agentLocation.lng - 0.01},${agentLocation.lat - 0.01},${agentLocation.lng + 0.01},${agentLocation.lat + 0.01}&layer=mapnik&marker=${agentLocation.lat},${agentLocation.lng}`}
                          width="100%"
                          height="300"
                          style={{ border: 0 }}
                          allowFullScreen
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                          title="Delivery Location"
                        />
                        <div className={styles.mapOverlay}>
                          <HiOutlineLocationMarker size={20} />
                          <span>Agent Location</span>
                          <small>{getTimeAgo(agentLocation.lastUpdate)}</small>
                        </div>
                      </div>
                      {agentLocation.address && (
                        <p className={styles.locationAddress}>
                          📮 {agentLocation.address}
                        </p>
                      )}
                      {!GOOGLE_MAPS_API_KEY && (
                        <div className={styles.mapNotice}>
                          Map provided by OpenStreetMap because no Google Maps API key is configured.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className={styles.noLocation}>
                      <HiOutlineLocationMarker size={32} />
                      <p>Waiting for agent location...</p>
                      <span>The agent will share their location once they start the delivery</span>
                    </div>
                  )}

                  {/* Tracking Timeline */}
                  {trackingEvents.length > 0 && (
                    <div className={styles.timelineSection}>
                      <h4>Delivery Timeline</h4>
                      <div className={styles.timeline}>
                        {trackingEvents.map((event) => (
                          <div key={event.id} className={styles.timelineItem}>
                            <div className={styles.timelineDot} />
                            <div className={styles.timelineContent}>
                              <div className={styles.timelineHeader}>
                                <span className={styles.timelineStatus}>
                                  {getStatusIcon(event.status)}
                                  {getStatusLabel(event.status)}
                                </span>
                                <span className={styles.timelineTime}>
                                  {getTimeAgo(event.created_at)}
                                </span>
                              </div>
                              {event.location_address && (
                                <p className={styles.timelineAddress}>
                                  📮 {event.location_address}
                                </p>
                              )}
                              {event.notes && (
                                <p className={styles.timelineNotes}>{event.notes}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Refresh Button */}
                  <button 
                    className={styles.refreshTrackingBtn}
                    onClick={refreshTracking}
                    disabled={refreshing}
                  >
                    <HiOutlineRefresh className={refreshing ? styles.spinning : ''} />
                    {refreshing ? 'Updating...' : 'Refresh Location'}
                  </button>

                  {/* Confirm Delivery Button */}
                  {trackingData.order?.status !== 'delivered' && 
                   trackingData.order?.status !== 'completed' && (
                    <button 
                      className={styles.confirmBtn}
                      onClick={async () => {
                        if (!window.confirm('Have you received your order? Confirm delivery.')) return;
                        try {
                          await api.put(`/delivery/confirm/${selectedOrder.id}`);
                          alert('Order confirmed! Thank you for shopping with us.');
                          closeModal();
                          fetchOrders();
                        } catch {
                          alert('Failed to confirm. Please try again.');
                        }
                      }}
                    >
                      <><HiOutlineCheckCircle aria-hidden="true" /> I have received my order</>
                    </button>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </BuyerLayout>
  );
}