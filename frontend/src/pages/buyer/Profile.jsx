import { useState, useEffect } from 'react';
import BuyerLayout from './BuyerLayout';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useUser } from '../../context/UserContext';
import {
  FaUser,
  FaBox,
  FaMapMarkerAlt,
  FaSignOutAlt,
  FaCamera,
  FaEdit,
} from 'react-icons/fa';
import styles from './Profile.module.css';

export default function Profile() {
  const { user: contextUser, updateUser } = useUser();
  const [localUser, setLocalUser] = useState({ name: '', email: '', phone: '', address: '' });
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    if (contextUser) {
      setLocalUser({
        name: contextUser.name || '',
        email: contextUser.email || '',
        phone: contextUser.phone || '',
        address: contextUser.address || '',
      });
      if (contextUser.avatar_url) {
        setAvatarUrl(`http://localhost:5000${contextUser.avatar_url}`);
      } else {
        setAvatarUrl(null);
      }
    }
  }, [contextUser]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setAvatarUrl(URL.createObjectURL(selectedFile));
    }
  };

  const validateProfile = () => {
    const nextErrors = {};
    const phonePattern = /^\+?[0-9\s\-()]{7,}$/;
    const name = localUser.name.trim();
    const phone = localUser.phone.trim();
    const address = localUser.address.trim();

    if (!name) nextErrors.name = 'Full name is required';
    else if (name.length < 2) nextErrors.name = 'Full name must be at least 2 characters';

    if (phone && !phonePattern.test(phone)) nextErrors.phone = 'Enter a valid phone number';
    if (address && address.length < 6) nextErrors.address = 'Address must be at least 6 characters';

    if (file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) nextErrors.avatar = 'Please upload a JPG, PNG, or WEBP image';
      if (file.size > 5 * 1024 * 1024) nextErrors.avatar = 'Avatar must be 5MB or smaller';
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFeedback({ type: '', message: '' });
    if (!validateProfile()) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('name', localUser.name.trim());
    formData.append('phone', localUser.phone.trim());
    formData.append('address', localUser.address.trim());
    if (file) formData.append('avatar', file);
    try {
      const res = await api.put('/buyer/profile', formData);
      setLocalUser((prev) => ({ ...prev, ...res.data }));
      if (res.data.avatar_url) {
        setAvatarUrl(`http://localhost:5000${res.data.avatar_url}`);
      }
      updateUser(res.data);
      setFeedback({ type: 'success', message: 'Profile updated successfully!' });
      setFile(null);
    } catch (err) {
      console.error('Update error:', err);
      setFeedback({ type: 'error', message: 'Failed to update profile. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const getInitials = () => {
    if (!localUser.name) return '??';
    const parts = localUser.name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return localUser.name.substring(0, 2).toUpperCase();
  };

  return (
    <BuyerLayout>
      <div className={styles.container}>
        <aside className={styles.sidebar}>
          <div className={styles.avatarSection}>
            <div className={styles.avatarWrapper}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className={styles.avatar} />
              ) : (
                <span className={styles.avatarInitials}>{getInitials()}</span>
              )}
              <label htmlFor="avatarUpload" className={styles.avatarUpload}>
                <FaCamera />
              </label>
              <input
                id="avatarUpload"
                type="file"
                hidden
                onChange={handleFileChange}
                accept="image/*"
              />
            </div>
            <h3 className={styles.avatarName}>{localUser.name || 'Guest'}</h3>
            <p className={styles.avatarEmail}>{localUser.email || 'No email'}</p>
          </div>

          <nav className={styles.sidebarNav}>
            <Link to="/buyer/profile" className={`${styles.navLink} ${styles.active}`}>
              <FaUser /> Personal Info
            </Link>
            <Link to="/buyer/orders" className={styles.navLink}>
              <FaBox /> My Orders
            </Link>
            <Link to="/buyer/addresses" className={styles.navLink}>
              <FaMapMarkerAlt /> Addresses
            </Link>
            <button onClick={handleLogout} className={styles.logoutBtn}>
              <FaSignOutAlt /> Log Out
            </button>
          </nav>
        </aside>

        <main className={styles.main}>
          <div className={styles.header}>
            <h1 className={styles.title}>My Profile</h1>
          </div>

          <form onSubmit={handleSave} className={styles.form}>
            {feedback.message && (
              <div className={feedback.type === 'success' ? styles.successBanner : styles.errorBanner}>
                {feedback.message}
              </div>
            )}
            <div className={styles.formGrid}>
              <div className={styles.inputGroup}>
                <label htmlFor="name" className={styles.label}>Full Name</label>
                <input
                  id="name"
                  type="text"
                  className={`${styles.input} ${fieldErrors.name ? styles.inputError : ''}`}
                  value={localUser.name}
                  onChange={(e) => {
                    setLocalUser({ ...localUser, name: e.target.value });
                    if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: '' }));
                  }}
                  required
                  placeholder="Your full name"
                />
                {fieldErrors.name && <p className={styles.errorText}>{fieldErrors.name}</p>}
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="phone" className={styles.label}>Phone Number</label>
                <input
                  id="phone"
                  type="tel"
                  className={`${styles.input} ${fieldErrors.phone ? styles.inputError : ''}`}
                  value={localUser.phone}
                  onChange={(e) => {
                    setLocalUser({ ...localUser, phone: e.target.value });
                    if (fieldErrors.phone) setFieldErrors((prev) => ({ ...prev, phone: '' }));
                  }}
                  placeholder="+255 700 000 000"
                />
                {fieldErrors.phone && <p className={styles.errorText}>{fieldErrors.phone}</p>}
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="email" className={styles.label}>Email Address</label>
              <input
                id="email"
                type="email"
                className={`${styles.input} ${styles.inputDisabled}`}
                value={localUser.email}
                disabled
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="address" className={styles.label}>Default Address</label>
              <textarea
                id="address"
                className={`${styles.input} ${styles.textarea} ${fieldErrors.address ? styles.inputError : ''}`}
                value={localUser.address}
                onChange={(e) => {
                  setLocalUser({ ...localUser, address: e.target.value });
                  if (fieldErrors.address) setFieldErrors((prev) => ({ ...prev, address: '' }));
                }}
                placeholder="Street, City, Region, Postal Code"
              />
              {fieldErrors.address && <p className={styles.errorText}>{fieldErrors.address}</p>}
            </div>

            <button type="submit" className={styles.saveBtn} disabled={loading}>
              {loading ? <span className={styles.spinner} /> : <><FaEdit /> Save Changes</>}
            </button>
          </form>
        </main>
      </div>
    </BuyerLayout>
  );
}