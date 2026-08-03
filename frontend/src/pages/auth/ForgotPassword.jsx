import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { HiMail } from 'react-icons/hi';
import styles from './ForgotPassword.module.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  const validateEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    const nextErrors = {};

    if (!trimmedEmail) nextErrors.email = 'Email is required';
    else if (!validateEmail(trimmedEmail)) nextErrors.email = 'Enter a valid email address';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    setSuccessMessage('');

    try {
      await axios.post('http://localhost:5000/api/auth/forgot-password', { email: trimmedEmail });
      setSuccessMessage('Reset link sent to your email.');
    } catch (err) {
      if (err.response?.data?.errors) {
        const validationErrors = {};
        err.response.data.errors.forEach(e => validationErrors[e.path] = e.msg);
        setErrors(validationErrors);
      } else {
        setErrors({ general: err.response?.data?.message || 'Could not process request' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.card}>
        {/* Brand */}
        <div className={styles.brand}>GengeSmart</div>

        <div className={styles.header}>
          <h2 className={styles.title}>Reset Password</h2>
          <p className={styles.subtitle}>Enter your email to receive a reset link.</p>
          {errors.general && <div className={styles.errorBanner}>{errors.general}</div>}
          {successMessage && <div className={styles.successBanner}>{successMessage}</div>}
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Email Address</label>
            <div className={styles.inputWrapper}>
              <HiMail className={styles.inputIcon} size={20} />
              <input
                type="email"
                className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                placeholder="enter your email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                }}
                disabled={loading}
                required
              />
            </div>
            {errors.email && <p className={styles.errorText}>{errors.email}</p>}
          </div>

          <button type="submit" disabled={loading} className={styles.submitBtn}>
            {loading ? (
              <span className={styles.spinner} />
            ) : (
              'Send Reset Link'
            )}
          </button>
        </form>

        <div className={styles.footer}>
          Remembered it? <Link to="/login" className={styles.link}>Sign In</Link>
        </div>
      </div>
    </div>
  );
}