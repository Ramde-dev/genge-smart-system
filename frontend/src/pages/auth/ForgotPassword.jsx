import { useState } from 'react';
import { Link } from 'react-router-dom';
import { HiMail } from 'react-icons/hi';
import styles from './ForgotPassword.module.css';
import api from '../../services/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [step, setStep] = useState('request');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

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
      await api.post('/auth/forgot-password', { email: trimmedEmail });
      setStep('verify');
      setSuccessMessage('A 6-digit reset code was sent to your email.');
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

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setErrors({});
    setSuccessMessage('');
    setLoading(true);
    try {
      const response = await api.post('/auth/verify-reset-code', {
        email: email.trim().toLowerCase(),
        code: code.trim(),
      });
      setStep('reset');
      setSuccessMessage(response.data.message);
    } catch (err) {
      setErrors({ general: err.response?.data?.message || 'Invalid or expired reset code.' });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setErrors({ general: 'Password must be at least 6 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrors({ general: 'Passwords do not match.' });
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const response = await api.post('/auth/reset-password', {
        email: email.trim().toLowerCase(),
        code: code.trim(),
        password: newPassword,
      });
      setSuccessMessage(response.data.message);
      setTimeout(() => window.location.assign('/login'), 900);
    } catch (err) {
      setErrors({ general: err.response?.data?.message || 'Could not reset your password.' });
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    setLoading(true);
    setErrors({});
    try {
      const response = await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      setSuccessMessage(response.data.message);
    } catch (err) {
      setErrors({ general: err.response?.data?.message || 'Could not resend the reset code.' });
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
          <p className={styles.subtitle}>Enter your email to receive a password reset code.</p>
          {errors.general && <div className={styles.errorBanner}>{errors.general}</div>}
          {successMessage && <div className={styles.successBanner}>{successMessage}</div>}
        </div>

        {step === 'request' && <form onSubmit={handleSubmit} noValidate>
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
              'Send Reset Code'
            )}
          </button>
        </form>}

        {step === 'verify' && <form onSubmit={handleVerifyCode} noValidate>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Reset Code</label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              className={styles.input}
              placeholder="Enter 6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              disabled={loading}
              required
            />
          </div>
          <button type="submit" disabled={loading || code.length !== 6} className={styles.submitBtn}>
            {loading ? <span className={styles.spinner} /> : 'Verify Code'}
          </button>
          <button type="button" onClick={resendCode} disabled={loading} className={styles.link}>
            Resend code
          </button>
        </form>}

        {step === 'reset' && <form onSubmit={handleResetPassword} noValidate>
          <div className={styles.inputGroup}>
            <label className={styles.label}>New Password</label>
            <input type="password" className={styles.input} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={loading} minLength={6} required />
          </div>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Confirm New Password</label>
            <input type="password" className={styles.input} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={loading} minLength={6} required />
          </div>
          <button type="submit" disabled={loading} className={styles.submitBtn}>
            {loading ? <span className={styles.spinner} /> : 'Reset Password'}
          </button>
        </form>}

        <div className={styles.footer}>
          Remembered it? <Link to="/login" className={styles.link}>Sign In</Link>
        </div>
      </div>
    </div>
  );
}