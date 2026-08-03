import React from 'react';
import { Link } from 'react-router-dom';

export default function Unauthorized() {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      padding: '2rem',
      textAlign: 'center'
    }}>
      <h1 style={{ fontSize: '4rem', color: '#dc2626' }}>403</h1>
      <h2>Access Denied</h2>
      <p>You don't have permission to access this page.</p>
      <Link to="/login" style={{ 
        marginTop: '1rem', 
        padding: '0.5rem 1.5rem',
        backgroundColor: '#3b82f6',
        color: 'white',
        textDecoration: 'none',
        borderRadius: '8px'
      }}>
        Go to Login
      </Link>
    </div>
  );
}