import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AgentLayout from '../../components/agent/AgentLayout';
import api from '../../services/api';
import { 
  HiOutlineTruck, 
  HiOutlineCheckCircle, 
  HiOutlineClock, 
  HiOutlineLocationMarker, 
  HiOutlineEye,
  HiOutlineRefresh,
  HiOutlineSearch,
  HiOutlineFilter,
  HiOutlineUser,
  HiOutlinePhone,
  HiOutlineCalendar,
  HiOutlineArrowRight
} from 'react-icons/hi';
import styles from './Dashboard.module.css';

export default function Dashboard() {
    const navigate = useNavigate();
    const [deliveries, setDeliveries] = useState([]);
    const [filteredDeliveries, setFilteredDeliveries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [stats, setStats] = useState({
        total: 0,
        inProgress: 0,
        completed: 0,
        delayed: 0
    });

    // Fetch deliveries
    const fetchDeliveries = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/agent/deliveries');
            const data = res.data?.deliveries || [];
            setDeliveries(data);
            setFilteredDeliveries(data);
            setLastUpdated(new Date());
            
            const total = data.length;
            const inProgress = data.filter(
                d => d.status !== 'completed' && d.status !== 'delivered'
            ).length;
            const completed = data.filter(
                d => d.status === 'completed' || d.status === 'delivered'
            ).length;
            const delayed = data.filter(
                d => d.status === 'delayed' || d.is_delayed === true
            ).length;
            
            setStats({ total, inProgress, completed, delayed });
        } catch (err) {
            console.error('Error fetching deliveries:', err);
            setError('Failed to load deliveries. Please try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    // Filter and search
    useEffect(() => {
        let filtered = deliveries;

        if (statusFilter !== 'all') {
            filtered = filtered.filter(d => 
                d.status?.toLowerCase() === statusFilter.toLowerCase()
            );
        }

        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(d => 
                d.order_id?.toString().includes(term) ||
                d.buyer_name?.toLowerCase().includes(term) ||
                d.buyer_address?.toLowerCase().includes(term)
            );
        }

        setFilteredDeliveries(filtered);
    }, [deliveries, statusFilter, searchTerm]);

    useEffect(() => {
        fetchDeliveries();
        const interval = setInterval(fetchDeliveries, 30000);
        return () => clearInterval(interval);
    }, [fetchDeliveries]);

    const getStatusConfig = (status) => {
        const configs = {
            'assigned': { icon: <HiOutlineClock size={16} />, label: 'Assigned', class: styles.statusAssigned },
            'picked_up': { icon: <HiOutlineTruck size={16} />, label: 'Picked Up', class: styles.statusPickedUp },
            'in_transit': { icon: <HiOutlineTruck size={16} />, label: 'In Transit', class: styles.statusInTransit },
            'arrived': { icon: <HiOutlineCheckCircle size={16} />, label: 'Arrived', class: styles.statusArrived },
            'completed': { icon: <HiOutlineCheckCircle size={16} />, label: 'Completed', class: styles.statusCompleted },
            'delivered': { icon: <HiOutlineCheckCircle size={16} />, label: 'Delivered', class: styles.statusCompleted },
            'delayed': { icon: <HiOutlineClock size={16} />, label: 'Delayed', class: styles.statusDelayed }
        };
        return configs[status?.toLowerCase()] || configs['assigned'];
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const formatTime = (date) => {
        if (!date) return '';
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusSteps = (status) => {
        const steps = ['assigned', 'picked_up', 'in_transit', 'arrived', 'completed'];
        const currentIndex = steps.indexOf(status?.toLowerCase());
        return steps.map((step, index) => ({
            label: step.replace('_', ' ').charAt(0).toUpperCase() + step.replace('_', ' ').slice(1),
            active: index <= currentIndex
        }));
    };

    return (
        <AgentLayout>
            <div className={styles.container}>
                {/* Header */}
                <header className={styles.header}>
                    <div className={styles.headerLeft}>
                        <h1 className={styles.title}>Deliveries</h1>
                        <p className={styles.subtitle}>
                            Manage your assigned deliveries
                            {lastUpdated && (
                                <span className={styles.lastUpdated}>
                                    · Updated {formatTime(lastUpdated)}
                                </span>
                            )}
                        </p>
                    </div>
                    <button 
                        className={styles.refreshBtn} 
                        onClick={fetchDeliveries} 
                        disabled={loading}
                    >
                        <HiOutlineRefresh className={loading ? styles.spinning : ''} />
                        {loading ? 'Loading' : 'Refresh'}
                    </button>
                </header>

                {/* Stats */}
                <div className={styles.statsGrid}>
                    <div className={`${styles.statCard} ${styles.statTotal}`}>
                        <div className={styles.statIcon}><HiOutlineTruck size={20} /></div>
                        <div className={styles.statInfo}>
                            <span className={styles.statValue}>{stats.total}</span>
                            <span className={styles.statLabel}>Total</span>
                        </div>
                    </div>
                    <div className={`${styles.statCard} ${styles.statInProgress}`}>
                        <div className={styles.statIcon}><HiOutlineClock size={20} /></div>
                        <div className={styles.statInfo}>
                            <span className={styles.statValue}>{stats.inProgress}</span>
                            <span className={styles.statLabel}>In Progress</span>
                        </div>
                    </div>
                    <div className={`${styles.statCard} ${styles.statCompleted}`}>
                        <div className={styles.statIcon}><HiOutlineCheckCircle size={20} /></div>
                        <div className={styles.statInfo}>
                            <span className={styles.statValue}>{stats.completed}</span>
                            <span className={styles.statLabel}>Completed</span>
                        </div>
                    </div>
                </div>

                {/* Search & Filter */}
                <div className={styles.toolbar}>
                    <div className={styles.searchWrapper}>
                        <HiOutlineSearch className={styles.searchIcon} />
                        <input
                            type="text"
                            className={styles.searchInput}
                            placeholder="Search orders..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className={styles.filterWrapper}>
                        <HiOutlineFilter className={styles.filterIcon} />
                        <select
                            className={styles.filterSelect}
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">All Status</option>
                            <option value="assigned">Assigned</option>
                            <option value="picked_up">Picked Up</option>
                            <option value="in_transit">In Transit</option>
                            <option value="arrived">Arrived</option>
                            <option value="completed">Completed</option>
                            <option value="delayed">Delayed</option>
                        </select>
                    </div>
                    <span className={styles.resultCount}>
                        {filteredDeliveries.length} delivery{filteredDeliveries.length !== 1 ? 's' : ''}
                    </span>
                </div>

                {/* Content */}
                {loading ? (
                    <div className={styles.loading}>
                        <span className={styles.spinner} />
                        Loading...
                    </div>
                ) : error ? (
                    <div className={styles.error}>{error}</div>
                ) : filteredDeliveries.length === 0 ? (
                    <div className={styles.empty}>
                        <HiOutlineTruck size={48} className={styles.emptyIcon} />
                        <h3>No deliveries</h3>
                        <p>Deliveries will appear here once assigned.</p>
                    </div>
                ) : (
                    <div className={styles.deliveriesList}>
                        {filteredDeliveries.map((delivery) => {
                            const status = getStatusConfig(delivery.status);
                            const steps = getStatusSteps(delivery.status);
                            
                            return (
                                <div key={delivery.id} className={styles.deliveryCard}>
                                    {/* Header */}
                                    <div className={styles.deliveryHeader}>
                                        <div className={styles.orderInfo}>
                                            <span className={styles.orderId}>#{delivery.order_id}</span>
                                            <span className={styles.deliveryId}>Delivery ID: {delivery.id}</span>
                                            <span className={styles.orderDate}>
                                                <HiOutlineCalendar size={14} />
                                                {formatDate(delivery.created_at)}
                                            </span>
                                        </div>
                                        <div className={`${styles.statusBadge} ${status.class}`}>
                                            {status.icon}
                                            {status.label}
                                        </div>
                                    </div>

                                    {/* Body */}
                                    <div className={styles.deliveryBody}>
                                        <div className={styles.deliveryInfo}>
                                            <div className={styles.infoRow}>
                                                <HiOutlineUser size={14} className={styles.infoIcon} />
                                                <span>{delivery.buyer_name || 'N/A'}</span>
                                            </div>
                                            <div className={styles.infoRow}>
                                                <HiOutlineLocationMarker size={14} className={styles.infoIcon} />
                                                <span>{delivery.buyer_address || 'N/A'}</span>
                                            </div>
                                            <div className={styles.infoRow}>
                                                <HiOutlinePhone size={14} className={styles.infoIcon} />
                                                <span>{delivery.buyer_phone || 'N/A'}</span>
                                            </div>
                                        </div>

                                        <div className={styles.deliveryActions}>
                                            <button
                                                className={styles.locationBtn}
                                                onClick={() => navigate(`/agent/update-location?deliveryId=${delivery.id}`)}
                                            >
                                                <HiOutlineLocationMarker size={16} />
                                                Update
                                            </button>
                                            <button
                                                className={styles.viewBtn}
                                                onClick={() => navigate(`/agent/delivery/${delivery.id}`)}
                                            >
                                                <HiOutlineEye size={16} />
                                                Details
                                                <HiOutlineArrowRight size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Timeline */}
                                    <div className={styles.timeline}>
                                        {steps.map((step, index) => (
                                            <div 
                                                key={index}
                                                className={`${styles.timelineStep} ${step.active ? styles.timelineActive : ''}`}
                                            >
                                                <span className={styles.timelineDot} />
                                                <span className={styles.timelineLabel}>{step.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </AgentLayout>
    );
}