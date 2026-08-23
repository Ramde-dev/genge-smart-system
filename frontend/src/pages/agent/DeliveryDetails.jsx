import { useEffect, useState } from 'react';
import AgentLayout from '../../components/agent/AgentLayout';
import { useParams } from 'react-router-dom';
import api from '../../services/api';

export default function DeliveryDetails() {
  const { id } = useParams();
  const [delivery, setDelivery] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const fetchDelivery = async () => {
      try {
        const response = await api.get(`/agent/deliveries/${id}`);
        setDelivery(response.data.delivery);
        setEvents(response.data.events || []);
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Failed to load delivery details.');
      } finally {
        setLoading(false);
      }
    };
    fetchDelivery();
  }, [id]);

  const updateStatus = async (status) => {
    setUpdating(true);
    try {
      await api.put(`/agent/deliveries/${id}/status`, { status });
      setDelivery((current) => ({ ...current, status, order_status: status }));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to update delivery status.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <AgentLayout>
      <div style={{ padding: '2rem' }}>
        <h1>Delivery Details</h1>
        {loading ? <p>Loading delivery...</p> : error ? <p>{error}</p> : (
          <>
            <p><strong>Delivery ID:</strong> {delivery.id}</p>
            <p><strong>Order ID:</strong> {delivery.order_id}</p>
            <p><strong>Buyer:</strong> {delivery.buyer_name}</p>
            <p><strong>Phone:</strong> {delivery.buyer_phone || 'N/A'}</p>
            <p><strong>Address:</strong> {delivery.buyer_address || 'N/A'}</p>
            <p><strong>Status:</strong> {delivery.status}</p>
            {delivery.status !== 'delivered' && delivery.status !== 'cancelled' && (
              <button disabled={updating} onClick={() => updateStatus('in_transit')}>
                {updating ? 'Updating...' : 'Mark In Transit'}
              </button>
            )}
            <h2>Tracking History</h2>
            {events.length === 0 ? <p>No tracking updates yet.</p> : (
              <ul>
                {events.map((event) => (
                  <li key={event.id}>{event.status} - {new Date(event.created_at).toLocaleString()}</li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </AgentLayout>
  );
}