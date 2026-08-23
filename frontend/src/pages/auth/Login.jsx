import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { HiEye, HiEyeOff, HiLockClosed, HiMail } from 'react-icons/hi';
import { useUser } from '../../context/UserContext';
import styles from './Login.module.css';

export default function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setAuthenticatedUser } = useUser();

  const validateEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const validateLoginForm = () => {
    const nextErrors = {};
    const email = formData.email.trim();
    const password = formData.password.trim();

    if (!email) nextErrors.email = 'Email is required';
    else if (!validateEmail(email)) nextErrors.email = 'Enter a valid email address';

    if (!password) nextErrors.password = 'Password is required';
    else if (password.length < 6) nextErrors.password = 'Password must be at least 6 characters';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    const email = formData.email.trim();
    const password = formData.password.trim();

    if (!validateLoginForm()) {
      setLoading(false);
      return;
    }

    try {
      console.log('Attempting login for:', email);
      
      // First try regular login (for buyers, sellers, admins)
      const res = await axios.post('http://localhost:5000/api/auth/login', {
        email,
        password,
      });

      console.log('Login response:', res.data);

      // Store token and user info
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('userRole', user.role);
      localStorage.setItem('userName', user.name);
      setAuthenticatedUser(user);

      // Store agentId if user is an agent
      if (user.role === 'agent' && user.agentId) {
        localStorage.setItem('agentId', user.agentId);
      }

      // Role-based redirection
      redirectUser(user.role);

    } catch (err) {
      console.error('Login error:', err.response?.data || err.message);
      
      // If regular login fails, try agent login
      if (err.response?.status === 401 || err.response?.status === 400) {
        try {
          console.log('Trying agent login...');
          
          const agentRes = await axios.post('http://localhost:5000/api/auth/agent/login', {
            email,
            password,
          });

          console.log('Agent login response:', agentRes.data);

          // Store agent token and info
          const { token, user } = agentRes.data;
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(user));
          localStorage.setItem('userRole', user.role);
          localStorage.setItem('userName', user.name);
          setAuthenticatedUser(user);
          
          // Store agentId if available
          if (user.agentId) {
            localStorage.setItem('agentId', user.agentId);
          } else {
            const agentId = user.agent_id || user.agentId || null;
            if (agentId) {
              localStorage.setItem('agentId', agentId);
            }
          }

          // Redirect agent
          redirectUser(user.role);

        } catch (agentErr) {
          console.error('Agent login error:', agentErr.response?.data || agentErr.message);
          
          // Both logins failed
          if (agentErr.response?.data?.errors) {
            const validationErrors = {};
            agentErr.response.data.errors.forEach((e) => (validationErrors[e.path] = e.msg));
            setErrors(validationErrors);
          } else {
            setErrors({ 
              general: agentErr.response?.data?.message || 'Invalid email or password. Please try again.' 
            });
          }
        }
      } else if (err.response?.data?.errors) {
        const validationErrors = {};
        err.response.data.errors.forEach((e) => (validationErrors[e.path] = e.msg));
        setErrors(validationErrors);
      } else {
        setErrors({ 
          general: err.response?.data?.message || 'Login failed. Please check your connection and try again.' 
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Role-based redirection function
  const redirectUser = (role) => {
    const roleLower = role.toLowerCase();
    console.log('Redirecting user with role:', roleLower);
    
    const roleRoutes = {
      'admin': '/admin/dashboard',
      'agent': '/agent/dashboard',
      'seller': '/seller/dashboard',
      'buyer': '/buyer/home'
    };

    const route = roleRoutes[roleLower] || '/dashboard';
    console.log('Navigating to:', route);
    navigate(route);
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h2 className={styles.title}>Sign In</h2>
          <p className={styles.subtitle}>Welcome back to GengeSmart</p>
          {errors.general && <div className={styles.errorBanner}>{errors.general}</div>}
        </div>

        <form onSubmit={handleSubmit} autoComplete="off">
          <div className={styles.inputGroup}>
            <label className={styles.label}>Email</label>
            <div className={styles.inputWrapper}>
              <HiMail className={styles.inputIcon} />
              <input
                type="email"
                className={`${styles.input} ${errors.email ? styles.errorInput : ''}`}
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                }}
                disabled={loading}
                required
                placeholder="enter your email"
              />
            </div>
            {errors.email && <p className={styles.errorText}>{errors.email}</p>}
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Password</label>
            <div className={styles.inputWrapper}>
              <HiLockClosed className={styles.inputIcon} />
              <input
                type={showPassword ? 'text' : 'password'}
                className={`${styles.input} ${errors.password ? styles.errorInput : ''}`}
                value={formData.password}
                onChange={(e) => {
                  setFormData({ ...formData, password: e.target.value });
                  if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
                }}
                disabled={loading}
                required
                placeholder="Enter your password"
              />
              <button
                type="button"
                className={styles.eyeButton}
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                {showPassword ? <HiEyeOff size={20} /> : <HiEye size={20} />}
              </button>
            </div>
            {errors.password && <p className={styles.errorText}>{errors.password}</p>}
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'SIGNING IN...' : 'SIGN IN'}
          </button>
        </form>

        <div className={styles.footer}>
          <p>
            <Link to="/forgot-password" className={styles.link}>
              Forgot password?
            </Link>
          </p>
          <p>
            Don't have an account? <Link to="/register" className={styles.link}>Sign Up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}