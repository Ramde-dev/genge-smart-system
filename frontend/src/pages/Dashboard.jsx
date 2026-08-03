import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Dashboard.module.css'; // <-- We'll create this CSS module

export default function Dashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    const userRole = localStorage.getItem('userRole');

    if (userRole === 'seller') {
      navigate('/seller/dashboard', { replace: true });
    } else if (userRole === 'buyer') {
      navigate('/buyer/home', { replace: true });
    } else if (userRole === 'admin') {
      navigate('/admin/dashboard', { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>GengeSmart</div>
        <div className={styles.spinner}></div>
        <h2 className={styles.title}>Authenticating...</h2>
        <p className={styles.subtitle}>Redirecting to your dashboard</p>
      </div>
    </div>
  );
}