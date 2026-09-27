import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';
import AgentLayout from '../../components/agent/AgentLayout';
import { 
  HiOutlineLocationMarker, 
  HiOutlineRefresh, 
  HiOutlineMap,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineInformationCircle
} from 'react-icons/hi';
import styles from './UpdateLocation.module.css';

export default function UpdateLocation() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const deliveryIdFromUrl = queryParams.get('deliveryId');

  const [deliveryId, setDeliveryId] = useState(deliveryIdFromUrl || '');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [address, setAddress] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [message, setMessage] = useState(null);
  const [deliveryDetails, setDeliveryDetails] = useState(null);
  const [orderStatus, setOrderStatus] = useState('');
  const [statusOptions] = useState([
    'assigned',
    'picked_up',
    'in_transit',
    'arrived',
    'delivered'
  ]);

  const fetchDeliveryDetails = async (id) => {
    try {
      const res = await api.get(`/agent/deliveries/${id}`);
      if (res.data.success) {
        setDeliveryDetails(res.data.delivery);
        setOrderStatus(res.data.delivery.order_status || 'assigned');
        // If there's a last location, show it
        if (res.data.delivery.last_location) {
          setAddress(res.data.delivery.last_location);
        }
      }
    } catch (err) {
      console.error('Error fetching delivery:', err);
      setMessage({ 
        type: 'error', 
        text: 'Failed to fetch delivery details. Please check the Delivery ID.' 
      });
    }
  };

  // Fetch delivery details if deliveryId is provided
  useEffect(() => {
    if (deliveryIdFromUrl) {
      const numericDeliveryId = Number(deliveryIdFromUrl);
      if (!Number.isInteger(numericDeliveryId) || numericDeliveryId <= 0) {
        setFieldErrors({ deliveryId: 'Delivery ID must be a positive whole number.' });
        setMessage({ type: 'error', text: 'The delivery link contains an invalid Delivery ID.' });
        return undefined;
      }
      const request = setTimeout(() => fetchDeliveryDetails(deliveryIdFromUrl), 0);
      return () => clearTimeout(request);
    }
    return undefined;
  }, [deliveryIdFromUrl]);

  // Get current location from browser
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMessage({ 
        type: 'error', 
        text: 'Geolocation is not supported by your browser.' 
      });
      return;
    }

    setFetchingLocation(true);
    setMessage(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const latitude = pos.coords.latitude;
        const longitude = pos.coords.longitude;
        
        setLat(latitude.toString());
        setLng(longitude.toString());
        
        // Get address from coordinates
        await getAddressFromCoords(latitude, longitude);
        
        setFetchingLocation(false);
        setMessage({ 
          type: 'success', 
          text: 'Location captured successfully!' 
        });
      },
      (err) => {
        console.error('Geolocation error:', err);
        setFetchingLocation(false);
        setMessage({ 
          type: 'error', 
          text: 'Unable to retrieve location. Please enter coordinates manually.' 
        });
      },
      { 
        enableHighAccuracy: true, 
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // Get address from coordinates using OpenStreetMap Nominatim
  const getAddressFromCoords = async (latitude, longitude) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'GengeSmartSystem/1.0'
          }
        }
      );
      const data = await response.json();
      if (data.display_name) {
        setAddress(data.display_name);
      }
    } catch (err) {
      console.error('Error getting address:', err);
    }
  };

  const validateLocationForm = () => {
    const nextErrors = {};
    const numericDeliveryId = Number(deliveryId);
    const numericLat = Number(lat);
    const numericLng = Number(lng);

    if (!deliveryId) nextErrors.deliveryId = 'Please enter a Delivery ID.';
    else if (!Number.isInteger(numericDeliveryId) || numericDeliveryId <= 0) nextErrors.deliveryId = 'Delivery ID must be a positive whole number.';

    if (!lat) nextErrors.lat = 'Latitude is required.';
    else if (Number.isNaN(numericLat) || numericLat < -90 || numericLat > 90) nextErrors.lat = 'Latitude must be between -90 and 90.';

    if (!lng) nextErrors.lng = 'Longitude is required.';
    else if (Number.isNaN(numericLng) || numericLng < -180 || numericLng > 180) nextErrors.lng = 'Longitude must be between -180 and 180.';

    if (address && address.trim().length < 3) nextErrors.address = 'Address must be at least 3 characters.';

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateLocationForm()) {
      setMessage({ type: 'error', text: 'Please fix the highlighted input values.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // Update location
      await api.post('/agent/update-location', {
        deliveryId: parseInt(deliveryId),
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
        address: address || null
      });

      // If status is provided and different from current, update status too
      if (orderStatus && orderStatus !== deliveryDetails?.order_status) {
        await api.put(`/agent/deliveries/${deliveryId}/status`, {
          status: orderStatus,
          notes: `Location updated: ${address || `Lat: ${lat}, Lng: ${lng}`}`
        });
      }

      setMessage({ 
        type: 'success', 
        text: 'Location updated successfully! Buyer can now track your location.' 
      });

      // Refresh delivery details
      await fetchDeliveryDetails(deliveryId);

      // Auto redirect after 3 seconds
      setTimeout(() => {
        navigate('/agent/dashboard');
      }, 3000);

    } catch (err) {
      console.error('Update error:', err);
      setMessage({ 
        type: 'error', 
        text: err.response?.data?.message || 'Failed to update location. Please try again.' 
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      'assigned': 'Assigned',
      'picked_up': 'Picked Up',
      'in_transit': 'In Transit',
      'arrived': 'Arrived',
      'delivered': 'Delivered'
    };
    return labels[status] || status;
  };

  return (
    <AgentLayout>
      <div className={styles.container}>
        <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            <HiOutlineLocationMarker className={styles.titleIcon} />
            Update Location
          </h1>
          <p className={styles.subtitle}>
            Update your current location to keep buyers informed about their delivery
          </p>
        </div>

        {/* Delivery Info */}
        {deliveryDetails && (
          <div className={styles.deliveryInfo}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Order #:</span>
              <span className={styles.infoValue}>{deliveryDetails.order_id}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Buyer:</span>
              <span className={styles.infoValue}>{deliveryDetails.buyer_name}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Status:</span>
              <span className={`${styles.statusBadge} ${styles[`status${deliveryDetails.order_status}`]}`}>
                {getStatusLabel(deliveryDetails.order_status)}
              </span>
            </div>
            {deliveryDetails.buyer_address && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Delivery Address:</span>
                <span className={styles.infoValue}>{deliveryDetails.buyer_address}</span>
              </div>
            )}
          </div>
        )}

        {/* Message */}
        {message && (
          <div className={`${styles.message} ${styles[message.type]}`}>
            {message.type === 'success' ? (
              <HiOutlineCheckCircle size={20} />
            ) : (
              <HiOutlineXCircle size={20} />
            )}
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Delivery ID */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Delivery ID *
              <span className={styles.required}>required</span>
            </label>
            <input
              type="number"
              className={`${styles.input} ${fieldErrors.deliveryId ? styles.inputError : ''}`}
              placeholder="Enter delivery ID"
              value={deliveryId}
              onChange={(e) => {
                setDeliveryId(e.target.value);
                if (fieldErrors.deliveryId) setFieldErrors(prev => ({ ...prev, deliveryId: '' }));
                if (e.target.value) {
                  fetchDeliveryDetails(e.target.value);
                }
              }}
              required
              disabled={loading || !!deliveryIdFromUrl}
            />
            {fieldErrors.deliveryId && <p className={styles.errorText}>{fieldErrors.deliveryId}</p>}
          </div>

          {/* Status Update */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Update Status
              <span className={styles.optional}>optional</span>
            </label>
            <select
              className={styles.select}
              value={orderStatus}
              onChange={(e) => setOrderStatus(e.target.value)}
              disabled={loading}
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {getStatusLabel(status)}
                </option>
              ))}
            </select>
          </div>

          {/* Location Section */}
          <div className={styles.locationSection}>
            <div className={styles.locationHeader}>
              <span className={styles.locationTitle}>
                <HiOutlineMap size={18} />
                Current Location
              </span>
              <button
                type="button"
                className={styles.gpsBtn}
                onClick={getCurrentLocation}
                disabled={fetchingLocation || loading}
              >
                <HiOutlineRefresh className={fetchingLocation ? styles.spinning : ''} />
                {fetchingLocation ? 'Getting Location...' : <><HiOutlineLocationMarker aria-hidden="true" /> Use Current Location</>}
              </button>
            </div>

            <div className={styles.coordsGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Latitude *</label>
                <input
                  type="text"
                  className={`${styles.input} ${fieldErrors.lat ? styles.inputError : ''}`}
                  placeholder="e.g., -6.800000"
                  value={lat}
                  onChange={(e) => {
                    setLat(e.target.value);
                    if (fieldErrors.lat) setFieldErrors(prev => ({ ...prev, lat: '' }));
                  }}
                  required
                  disabled={loading}
                />
                {fieldErrors.lat && <p className={styles.errorText}>{fieldErrors.lat}</p>}
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Longitude *</label>
                <input
                  type="text"
                  className={`${styles.input} ${fieldErrors.lng ? styles.inputError : ''}`}
                  placeholder="e.g., 39.200000"
                  value={lng}
                  onChange={(e) => {
                    setLng(e.target.value);
                    if (fieldErrors.lng) setFieldErrors(prev => ({ ...prev, lng: '' }));
                  }}
                  required
                  disabled={loading}
                />
                {fieldErrors.lng && <p className={styles.errorText}>{fieldErrors.lng}</p>}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Address</label>
              <input
                type="text"
                className={styles.input}
                placeholder="Auto-detected address or enter manually"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={() => navigate('/agent/dashboard')}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loading || !lat || !lng}
            >
              {loading ? (
                <>
                  <span className={styles.spinner} />
                  Updating...
                </>
              ) : (
                'Update Location'
              )}
            </button>
          </div>
        </form>

        {/* Info Footer */}
        <div className={styles.footer}>
          <HiOutlineInformationCircle size={16} />
          <span>
            Your location will be shared with the buyer in real-time.
            Make sure GPS is enabled for accurate tracking.
          </span>
        </div>
        </div>
      </div>
    </AgentLayout>
  );
}