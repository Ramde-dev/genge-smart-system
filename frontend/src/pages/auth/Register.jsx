import { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { HiEye, HiEyeOff, HiLockClosed, HiMail, HiPhone, HiUser, HiCheck } from 'react-icons/hi';
import styles from './Register.module.css';

export default function Register() {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '', role: 'Buyer' });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validateEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const validateForm = () => {
    const nextErrors = {};
    const name = formData.name.trim();
    const email = formData.email.trim();
    const phone = formData.phone.trim();
    const password = formData.password.trim();

    if (!name) nextErrors.name = 'Full name is required';
    else if (name.length < 2) nextErrors.name = 'Full name must be at least 2 characters';

    if (!email) nextErrors.email = 'Email is required';
    else if (!validateEmail(email)) nextErrors.email = 'Enter a valid email address';

    if (formData.role === 'Seller') {
      if (!phone) nextErrors.phone = 'Phone number is required for sellers';
      else if (!/^\+?[0-9\s\-()]{7,}$/.test(phone)) nextErrors.phone = 'Enter a valid phone number';
    }

    if (!password) nextErrors.password = 'Password is required';
    else if (password.length < 6) nextErrors.password = 'Password must be at least 6 characters';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setErrors({});
    
    try {
      await axios.post('http://localhost:5000/api/auth/register', {
        ...formData,
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password.trim(),
      });
      navigate('/login');
    } catch (err) {
      if (err.response?.data?.errors) {
        const validationErrors = {};
        err.response.data.errors.forEach(e => validationErrors[e.path] = e.msg);
        setErrors(validationErrors);
      } else {
        setErrors({ general: err.response?.data?.message || 'Registration failed. Please try again.' });
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
          <h2 className={styles.title}>Create Account</h2>
          <p className={styles.subtitle}>Join the Genge Smart System</p>
          {errors.general && <div className={styles.errorBanner}>{errors.general}</div>}
        </div>

        {/* Role Toggle – only Buyer and Seller (Admin is created manually for security) */}
        <div className={styles.roleToggle}>
          {['Buyer', 'Seller'].map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => setFormData({ ...formData, role })}
              className={`${styles.roleBtn} ${formData.role === role ? styles.roleBtnActive : ''}`}
            >
              {role === formData.role && <HiCheck size={16} className={styles.roleCheck} />}
              {role}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {/* Name */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>Full Name</label>
            <div className={styles.inputWrapper}>
              <HiUser className={styles.inputIcon} size={20} />
              <input
                className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
                }}
                placeholder="Enter your full name"
                disabled={loading}
                required
              />
            </div>
            {errors.name && <p className={styles.errorText}>{errors.name}</p>}
          </div>

          {/* Email */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>Email Address</label>
            <div className={styles.inputWrapper}>
              <HiMail className={styles.inputIcon} size={20} />
              <input
                type="email"
                className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                }}
                placeholder="Enter your email"
                disabled={loading}
                required
              />
            </div>
            {errors.email && <p className={styles.errorText}>{errors.email}</p>}
          </div>

          {formData.role === 'Seller' && (
            <div className={styles.inputGroup}>
              <label className={styles.label}>Phone Number</label>
              <div className={styles.inputWrapper}>
                <HiPhone className={styles.inputIcon} size={20} />
                <input
                  type="tel"
                  className={`${styles.input} ${errors.phone ? styles.inputError : ''}`}
                  value={formData.phone}
                  onChange={(e) => {
                    setFormData({ ...formData, phone: e.target.value });
                    if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }));
                  }}
                  placeholder="+255 700 000 000"
                  disabled={loading}
                  required
                />
              </div>
              {errors.phone && <p className={styles.errorText}>{errors.phone}</p>}
            </div>
          )}

          {/* Password */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>Password</label>
            <div className={styles.inputWrapper}>
              <HiLockClosed className={styles.inputIcon} size={20} />
              <input
                type={showPassword ? 'text' : 'password'}
                className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
                value={formData.password}
                onChange={(e) => {
                  setFormData({ ...formData, password: e.target.value });
                  if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
                }}
                placeholder="Minimum 6 characters"
                disabled={loading}
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={styles.eyeToggle}
                disabled={loading}
              >
                {showPassword ? <HiEyeOff size={20} /> : <HiEye size={20} />}
              </button>
            </div>
            {errors.password && <p className={styles.errorText}>{errors.password}</p>}
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? <span className={styles.spinner} /> : 'Sign Up'}
          </button>
        </form>

        <div className={styles.footer}>
          Already have an account? <Link to="/login" className={styles.link}>Sign In</Link>
        </div>
      </div>
    </div>
  );
}