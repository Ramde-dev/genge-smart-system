import React, { useState, useEffect } from 'react';
import AgentLayout from '../../components/agent/AgentLayout';
import api from '../../services/api';

export default function AgentProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/agent/profile');
        setProfile(res.data.profile);
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  return (
    <AgentLayout>
      <div style={{ padding: '2rem' }}>
        <h1>Agent Profile</h1>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <div>
            <p><strong>Name:</strong> {profile?.name}</p>
            <p><strong>Email:</strong> {profile?.email}</p>
            <p><strong>Agent ID:</strong> {profile?.agent_id}</p>
            <p><strong>Status:</strong> {profile?.status}</p>
            <p><strong>Phone:</strong> {profile?.phone || 'N/A'}</p>
          </div>
        )}
      </div>
    </AgentLayout>
  );
}