import React from 'react';
import AgentLayout from '../../components/agent/AgentLayout';
import { useParams } from 'react-router-dom';

export default function DeliveryDetails() {
  const { id } = useParams();

  return (
    <AgentLayout>
      <div style={{ padding: '2rem' }}>
        <h1>Delivery Details</h1>
        <p>Delivery ID: {id}</p>
        {/* Add delivery details content here */}
      </div>
    </AgentLayout>
  );
}