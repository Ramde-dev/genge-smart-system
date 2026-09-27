import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';
import styles from './OrderDetails.module.css';
import {
  HiOutlineArrowLeft,
  HiOutlinePrinter,
  HiOutlineHome,
  HiOutlineShoppingBag,
  HiOutlinePlusCircle,
  HiOutlineArchive,
  HiOutlineLogout,
  HiOutlineTrendingUp,
  HiOutlineUserCircle,
  HiOutlineMenu,
  HiOutlineX,
  HiOutlineTruck,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineXCircle,
  HiOutlinePencil,
  HiOutlinePlus,
} from 'react-icons/hi';

export default function OrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [tracking, setTracking] = useState({
    tracking_number: '',
    estimated_delivery: '',
    events: [],
  });
  const [editingTracking, setEditingTracking] = useState(false);
  const [newEvent, setNewEvent] = useState({ status: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [trackingErrors, setTrackingErrors] = useState({});
  const [eventErrors, setEventErrors] = useState({});
  const [serverMessage, setServerMessage] = useState({ type: '', text: '' });
  
  // ── Agent assignment state ──
  const [agents, setAgents] = useState([]);
  const [delivery, setDelivery] = useState(null);
  const [assigning, setAssigning] = useState(false);

  // ── Fetch order details ──
  const fetchOrder = async () => {
    try {
      const { data } = await api.get(`/seller/orders/${id}`);
      const orderData = data?.order || data;
      setOrder(orderData);

      if (orderData) {
        setTracking({
          tracking_number: orderData.tracking_number || '',
          estimated_delivery: orderData.estimated_delivery
            ? new Date(orderData.estimated_delivery).toISOString().split('T')[0]
            : '',
          events: orderData.tracking_events || data.tracking_events || [],
        });
      }
    } catch (error) {
      console.error('Error fetching order:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  // ── Fetch available agents and delivery status ──
  useEffect(() => {
    if (!order) return;

    if (order.status === 'pending') {
      api.get('/delivery/agents')
        .then(res => {
          const agentsResponse = res.data?.agents ?? res.data ?? [];
          const availableAgents = Array.isArray(agentsResponse) ? agentsResponse : [];
          setAgents(availableAgents.filter(a => a.is_available));
        })
        .catch(err => console.error('Error fetching agents:', err));
    } else {
      setAgents([]);
    }

    api.get(`/delivery/status/${id}`)
      .then(res => setDelivery(res.data))
      .catch(() => setDelivery(null));
  }, [order, id]);

  const validateTrackingForm = () => {
    const nextErrors = {};
    const trackingNumber = tracking.tracking_number.trim();
    const estimatedDelivery = tracking.estimated_delivery;

    if (!trackingNumber) nextErrors.tracking_number = 'Tracking number is required';
    else if (!/^[A-Za-z0-9\-]{4,}$/.test(trackingNumber)) nextErrors.tracking_number = 'Tracking number must contain letters/numbers/dashes only';

    if (!estimatedDelivery) nextErrors.estimated_delivery = 'Estimated delivery date is required';
    else if (new Date(estimatedDelivery) < new Date(new Date().toDateString())) nextErrors.estimated_delivery = 'Estimated delivery cannot be in the past';

    setTrackingErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateEventForm = () => {
    const nextErrors = {};
    if (!newEvent.status) nextErrors.status = 'Status is required';
    if (!newEvent.description.trim()) nextErrors.description = 'Description is required';
    else if (newEvent.description.trim().length < 5) nextErrors.description = 'Description must be at least 5 characters';

    setEventErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  // ── Assign agent ──
  const assignAgent = async (agentId) => {
    if (!agentId) return;
    setAssigning(true);
    try {
      await api.post('/delivery/assign', { orderId: order.id, agentId });
      setServerMessage({ type: 'success', text: 'Agent assigned successfully.' });
      const res = await api.get(`/delivery/status/${id}`);
      setDelivery(res.data);
      fetchOrder();
    } catch (err) {
      setServerMessage({ type: 'error', text: 'Failed to assign agent.' });
    } finally {
      setAssigning(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':   return styles.statusPending;
      case 'shipped':   return styles.statusShipped;
      case 'delivered': return styles.statusDelivered;
      case 'cancelled': return styles.statusCancelled;
      default:          return styles.statusDefault;
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':   return <HiOutlineClock className={styles.statusIcon} />;
      case 'shipped':   return <HiOutlineTruck className={styles.statusIcon} />;
      case 'delivered': return <HiOutlineCheckCircle className={styles.statusIcon} />;
      case 'cancelled': return <HiOutlineXCircle className={styles.statusIcon} />;
      default:          return <HiOutlineClock className={styles.statusIcon} />;
    }
  };

  // ── Update tracking number / estimated delivery ──
  const handleTrackingUpdate = async (e) => {
    e.preventDefault();
    if (!validateTrackingForm()) return;
    setSubmitting(true);
    try {
      await api.put(`/seller/orders/${order.id}/tracking`, {
        trackingNumber: tracking.tracking_number,
        estimatedDelivery: tracking.estimated_delivery,
      });
      setServerMessage({ type: 'success', text: 'Tracking updated successfully.' });
      setEditingTracking(false);
      const { data } = await api.get(`/seller/orders/${id}`);
      const updatedOrder = data?.order || data;
      setOrder(updatedOrder);
      setTracking({
        tracking_number: updatedOrder.tracking_number || '',
        estimated_delivery: updatedOrder.estimated_delivery
          ? new Date(updatedOrder.estimated_delivery).toISOString().split('T')[0]
          : '',
        events: updatedOrder.tracking_events || [],
      });
    } catch (error) {
      setServerMessage({ type: 'error', text: 'Failed to update tracking.' });
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Add tracking event ──
  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!validateEventForm()) return;
    setSubmitting(true);
    try {
      await api.post(`/seller/orders/${order.id}/tracking/event`, {
        status: newEvent.status,
        description: newEvent.description,
      });
      setServerMessage({ type: 'success', text: 'Event added successfully.' });
      setNewEvent({ status: '', description: '' });
      const { data } = await api.get(`/seller/orders/${id}`);
      const updatedOrder = data?.order || data;
      setOrder(updatedOrder);
      setTracking({
        tracking_number: updatedOrder.tracking_number || '',
        estimated_delivery: updatedOrder.estimated_delivery
          ? new Date(updatedOrder.estimated_delivery).toISOString().split('T')[0]
          : '',
        events: updatedOrder.tracking_events || [],
      });
    } catch (error) {
      setServerMessage({ type: 'error', text: 'Failed to add event.' });
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
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
          <div className={styles.loadingState}>
            <span className={styles.spinner} />
            Loading order details...
          </div>
        </main>
      </div>
    );
  }

  if (!order) {
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
          <div className={styles.emptyState}>
            <p>Order not found.</p>
          </div>
        </main>
      </div>
    );
  }

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
        {/* Top Bar */}
        <div className={styles.topBar}>
          <button onClick={() => navigate(-1)} className={styles.backBtn}>
            <HiOutlineArrowLeft size={20} />
            Back to Orders
          </button>
          <button onClick={() => window.print()} className={styles.printBtn}>
            <HiOutlinePrinter size={18} />
            Print Invoice
          </button>
        </div>

        {/* Invoice Card */}
        {serverMessage.text && (
          <div className={serverMessage.type === 'success' ? styles.successBanner : styles.errorBanner}>
            {serverMessage.text}
          </div>
        )}

        <div className={styles.invoiceCard}>
          {/* Header */}
          <div className={styles.invoiceHeader}>
            <div>
              <h1 className={styles.orderId}>Order #{order.id}</h1>
              <p className={styles.orderDate}>
                {new Date(order.created_at).toLocaleString()}
              </p>
            </div>
            <span className={`${styles.statusBadge} ${getStatusColor(order.status)}`}>
              {getStatusIcon(order.status)} {order.status}
            </span>
          </div>

          {/* Customer Details */}
          <div className={styles.customerSection}>
            <h3 className={styles.sectionLabel}>Customer Details</h3>
            <div className={styles.customerInfo}>
              <p className={styles.customerName}>{order.buyer_name}</p>
              <p className={styles.customerContact}>{order.buyer_email}</p>
              <p className={styles.customerContact}>{order.buyer_phone}</p>
              <p className={styles.customerAddress}>{order.buyer_address}</p>
            </div>
          </div>

          {(order.agent_name || delivery?.agent_name) && (
            <div className={styles.agentSection}>
              <h3 className={styles.sectionLabel}>Assigned Delivery Agent</h3>
              <div className={styles.agentInfoRow}>
                <span className={styles.agentLabel}>Agent</span>
                <span className={styles.agentValue}>
                  {delivery?.agent_name || order.agent_name}
                </span>
              </div>
              <div className={styles.agentInfoRow}>
                <span className={styles.agentLabel}>Phone</span>
                <span className={styles.agentValue}>
                  {delivery?.agent_phone || order.agent_phone || 'N/A'}
                </span>
              </div>
              <div className={styles.agentInfoRow}>
                <span className={styles.agentLabel}>Delivery Status</span>
                <span className={styles.agentValue}>
                  {delivery?.status || (order.agent_name ? 'assigned' : order.status)}
                </span>
              </div>
            </div>
          )}

          {/* Order Items */}
          <div className={styles.itemsSection}>
            <h3 className={styles.sectionLabel}>Items Purchased</h3>
            {order.items && order.items.length > 0 ? (
              order.items.map((item) => (
                <div key={item.id} className={styles.itemRow}>
                  <div>
                    <span className={styles.itemName}>{item.product_name}</span>
                    <span className={styles.itemQuantity}>× {item.quantity}</span>
                  </div>
                  <span className={styles.itemPrice}>
                    TSh {Number(item.subtotal).toLocaleString()}
                  </span>
                </div>
              ))
            ) : (
              <div className={styles.itemRow}>
                <span>No items found for this order.</span>
              </div>
            )}
            <div className={styles.totalSection}>
              <p className={styles.totalLabel}>Total Amount</p>
              <p className={styles.totalAmount}>
                TSh {Number(order.total_price).toLocaleString()}
              </p>
            </div>
          </div>

          {/* ── Assign Delivery Agent Section ── */}
          {order && !order.agent_name && order.status === 'pending' && (
            <div className={styles.assignSection}>
              <h4 className={styles.assignTitle}>
                <HiOutlineTruck /> Assign Delivery Agent
              </h4>
              <div className={styles.assignRow}>
                <select
                  onChange={(e) => assignAgent(e.target.value)}
                  className={styles.select}
                  defaultValue=""
                  disabled={assigning}
                >
                  <option value="">Select an agent...</option>
                  {agents.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.phone})
                    </option>
                  ))}
                </select>
                {assigning && <span className={styles.spinnerSmall} />}
              </div>
              {delivery && (
                <p className={styles.agentInfo}>
                  Current agent: <strong>{delivery.agent_name}</strong> ({delivery.agent_phone})
                  <br />
                  Status: <span className={styles.agentStatus}>{delivery.status}</span>
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Tracking Section ── */}
        <div className={styles.trackingCard}>
          <div className={styles.trackingHeader}>
            <h3 className={styles.sectionLabel}>
              <HiOutlineTruck /> Tracking Information
            </h3>
            {!editingTracking && (
              <button
                className={styles.editTrackingBtn}
                onClick={() => setEditingTracking(true)}
              >
                <HiOutlinePencil /> Edit
              </button>
            )}
          </div>

          {editingTracking ? (
            <form onSubmit={handleTrackingUpdate} className={styles.trackingForm}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Tracking Number</label>
                  <input
                    type="text"
                    className={`${styles.input} ${trackingErrors.tracking_number ? styles.inputError : ''}`}
                    value={tracking.tracking_number}
                    onChange={(e) => {
                      setTracking({ ...tracking, tracking_number: e.target.value });
                      if (trackingErrors.tracking_number) setTrackingErrors(prev => ({ ...prev, tracking_number: '' }));
                    }}
                    placeholder="e.g. TRK-1234-5678"
                  />
                  {trackingErrors.tracking_number && <p className={styles.errorText}>{trackingErrors.tracking_number}</p>}
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Estimated Delivery</label>
                  <input
                    type="date"
                    className={`${styles.input} ${trackingErrors.estimated_delivery ? styles.inputError : ''}`}
                    value={tracking.estimated_delivery}
                    onChange={(e) => {
                      setTracking({ ...tracking, estimated_delivery: e.target.value });
                      if (trackingErrors.estimated_delivery) setTrackingErrors(prev => ({ ...prev, estimated_delivery: '' }));
                    }}
                  />
                  {trackingErrors.estimated_delivery && <p className={styles.errorText}>{trackingErrors.estimated_delivery}</p>}
                </div>
              </div>
              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setEditingTracking(false)}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.saveBtn} disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Tracking'}
                </button>
              </div>
            </form>
          ) : (
            <div className={styles.trackingInfo}>
              <p>
                <strong>Tracking Number:</strong>{' '}
                {order.tracking_number || 'Not provided'}
              </p>
              <p>
                <strong>Estimated Delivery:</strong>{' '}
                {order.estimated_delivery
                  ? new Date(order.estimated_delivery).toLocaleDateString()
                  : 'Not set'}
              </p>
            </div>
          )}

          {/* Tracking Timeline */}
          <div className={styles.timeline}>
            <h4 className={styles.timelineTitle}>Tracking History</h4>
            {tracking.events && tracking.events.length > 0 ? (
              <div className={styles.timelineList}>
                {tracking.events.map((event, idx) => (
                  <div key={idx} className={styles.timelineItem}>
                    <div
                      className={styles.timelineDot}
                      style={{
                        background:
                          event.status === 'delivered'
                            ? '#10b981'
                            : event.status === 'shipped'
                            ? '#3b82f6'
                            : event.status === 'cancelled'
                            ? '#ef4444'
                            : '#f59e0b',
                      }}
                    />
                    {idx < tracking.events.length - 1 && (
                      <div className={styles.timelineLine} />
                    )}
                    <div className={styles.timelineContent}>
                      <div className={styles.timelineHeader}>
                        <span className={styles.timelineStatus}>
                          {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                        </span>
                        <span className={styles.timelineDate}>
                          {new Date(event.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className={styles.timelineDesc}>{event.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.noEvents}>No tracking events yet.</p>
            )}
          </div>

          {/* Add Event Form */}
          <div className={styles.addEventSection}>
            <h4 className={styles.timelineTitle}>
              <HiOutlinePlus /> Add Tracking Event
            </h4>
            <form onSubmit={handleAddEvent} className={styles.eventForm}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Status</label>
                  <select
                    className={`${styles.input} ${eventErrors.status ? styles.inputError : ''}`}
                    value={newEvent.status}
                    onChange={(e) => {
                      setNewEvent({ ...newEvent, status: e.target.value });
                      if (eventErrors.status) setEventErrors(prev => ({ ...prev, status: '' }));
                    }}
                    required
                  >
                    <option value="">Select status...</option>
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="in transit">In Transit</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  {eventErrors.status && <p className={styles.errorText}>{eventErrors.status}</p>}
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Description</label>
                  <input
                    type="text"
                    className={`${styles.input} ${eventErrors.description ? styles.inputError : ''}`}
                    placeholder="e.g. Package left warehouse"
                    value={newEvent.description}
                    onChange={(e) => {
                      setNewEvent({ ...newEvent, description: e.target.value });
                      if (eventErrors.description) setEventErrors(prev => ({ ...prev, description: '' }));
                    }}
                    required
                  />
                  {eventErrors.description && <p className={styles.errorText}>{eventErrors.description}</p>}
                </div>
              </div>
              <button type="submit" className={styles.addEventBtn} disabled={submitting}>
                {submitting ? 'Adding...' : 'Add Event'}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

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