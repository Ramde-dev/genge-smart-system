import React, { useState, useEffect } from 'react';
import AgentLayout from '../../components/agent/AgentLayout';
import api from '../../services/api';

export default function AgentProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/agent/profile');
        setProfile(res.data.profile);
      } catch (error) {
        console.error('Error fetching profile:', error);
        setError(error.response?.data?.message || 'Failed to load profile.');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const toggleAvailability = async () => {
    setUpdating(true);
    setError('');
    try {
      const res = await api.put('/agent/toggle-availability');
      setProfile((current) => ({ ...current, is_available: res.data.is_available }));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to update availability.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <AgentLayout>
      <div style={{ padding: '2rem' }}>
        <h1>Agent Profile</h1>
        {loading ? (
          <p>Loading...</p>
        ) : error ? (
          <p role="alert">{error}</p>
        ) : (
          <div>
            <p><strong>Name:</strong> {profile?.name}</p>
            <p><strong>Email:</strong> {profile?.email}</p>
            <p><strong>Agent ID:</strong> {profile?.agent_id}</p>
            <p><strong>Status:</strong> {profile?.status}</p>
            <p><strong>Phone:</strong> {profile?.phone || 'N/A'}</p>
            <p><strong>Availability:</strong> {profile?.is_available ? 'Available' : 'Unavailable'}</p>
            <button type="button" onClick={toggleAvailability} disabled={updating}>
              {updating ? 'Updating...' : profile?.is_available ? 'Set Unavailable' : 'Set Available'}
            </button>
          </div>
        )}
      </div>
    </AgentLayout>
  );
}