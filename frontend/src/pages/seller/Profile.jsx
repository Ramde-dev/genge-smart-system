import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';
import styles from './Profile.module.css';
import {
  HiOutlineMenu,
  HiOutlineX,
  HiOutlineHome,
  HiOutlineShoppingBag,
  HiOutlinePlusCircle,
  HiOutlineArchive,
  HiOutlineLogout,
  HiOutlineUserCircle,
  HiOutlineTrendingUp,
  HiOutlineShieldCheck,
  HiOutlineCamera,
  HiOutlineOfficeBuilding,
} from 'react-icons/hi';

export default function Profile() {
  const [activeTab, setActiveTab] = useState('shop');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [profileErrors, setProfileErrors] = useState({});
  const [securityErrors, setSecurityErrors] = useState({});
  const [profile, setProfile] = useState({
    shopName: '',
    email: '',
    phone: '',
    address: '',
    bio: '',
    logo: '',
  });
  const [security, setSecurity] = useState({
    current: '',
    new: '',
    confirm: '',
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await api.get('/auth/profile');
        setProfile(data);
      } catch (err) {
        console.error('Error loading profile', err);
      }
    };
    fetchSettings();
  }, []);

  const validateShopProfile = () => {
    const nextErrors = {};
    if (!profile.shopName?.trim()) nextErrors.shopName = 'Shop name is required';
    else if (profile.shopName.trim().length < 2) nextErrors.shopName = 'Shop name must be at least 2 characters';

    if (!profile.email?.trim()) nextErrors.email = 'Business email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim())) nextErrors.email = 'Enter a valid business email';

    if (!profile.phone?.trim()) nextErrors.phone = 'Phone number is required';
    else if (!/^\+?[0-9\s\-()]{7,}$/.test(profile.phone.trim())) nextErrors.phone = 'Enter a valid phone number';

    if (!profile.address?.trim()) nextErrors.address = 'Physical address is required';
    else if (profile.address.trim().length < 5) nextErrors.address = 'Address must be at least 5 characters';

    if (profile.bio?.trim() && profile.bio.trim().length < 10) nextErrors.bio = 'Shop bio must be at least 10 characters';

    setProfileErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateSecurity = () => {
    const nextErrors = {};
    if (!security.current?.trim()) nextErrors.current = 'Current password is required';
    if (!security.new?.trim()) nextErrors.new = 'New password is required';
    else if (security.new.length < 6) nextErrors.new = 'New password must be at least 6 characters';
    if (!security.confirm?.trim()) nextErrors.confirm = 'Please confirm your new password';
    else if (security.new !== security.confirm) nextErrors.confirm = 'Passwords do not match';

    setSecurityErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = async () => {
    setLoading(true);
    setFeedback({ type: '', message: '' });
    try {
      if (activeTab === 'shop') {
        if (!validateShopProfile()) {
          setLoading(false);
          return;
        }
        await api.put('/auth/profile', profile);
        setFeedback({ type: 'success', message: 'Shop profile updated successfully.' });
      } else {
        if (!validateSecurity()) {
          setLoading(false);
          return;
        }
        await api.put('/auth/security', security);
        setFeedback({ type: 'success', message: 'Password updated successfully.' });
        setSecurity({ current: '', new: '', confirm: '' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Failed to update profile.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.pageContainer}>
      {mobileOpen && <div className={styles.overlay} onClick={() => setMobileOpen(false)} />}
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        location={location}
        navigate={navigate}
      />

      <main className={styles.mainContent}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <button
              className={styles.menuToggle}
              onClick={() => setMobileOpen(true)}
            >
              <HiOutlineMenu size={28} />
            </button>
            <h2 className={styles.title}>Account Settings</h2>
          </div>
          <button
            onClick={handleSave}
            disabled={loading}
            className={styles.saveBtn}
          >
            {loading ? (
              <span className={styles.spinner} />
            ) : (
              'Save Changes'
            )}
          </button>
        </header>

        <div className={styles.tabContainer}>
          <TabButton
            active={activeTab === 'shop'}
            onClick={() => setActiveTab('shop')}
            icon={<HiOutlineOfficeBuilding size={20} />}
            label="Shop Profile"
          />
          <TabButton
            active={activeTab === 'security'}
            onClick={() => setActiveTab('security')}
            icon={<HiOutlineShieldCheck size={20} />}
            label="Security"
          />
        </div>

        {feedback.message && (
          <div className={feedback.type === 'success' ? styles.successBanner : styles.errorBanner}>
            {feedback.message}
          </div>
        )}

        <div className={styles.profileCard}>
          {activeTab === 'shop' ? (
            <ShopForm
              profile={profile}
              setProfile={setProfile}
              profileErrors={profileErrors}
              setProfileErrors={setProfileErrors}
            />
          ) : (
            <SecurityForm
              security={security}
              setSecurity={setSecurity}
              securityErrors={securityErrors}
              setSecurityErrors={setSecurityErrors}
            />
          )}
        </div>
      </main>
    </div>
  );
}

// ── Shop Form ──
function ShopForm({ profile, setProfile, profileErrors, setProfileErrors }) {
  const updateField = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
    if (profileErrors[field]) setProfileErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const fileSizeLimit = 5 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      setProfileErrors((prev) => ({ ...prev, logo: 'Please upload a JPG, PNG, or WEBP image' }));
      return;
    }

    if (file.size > fileSizeLimit) {
      setProfileErrors((prev) => ({ ...prev, logo: 'Logo must be 5MB or smaller' }));
      return;
    }

    const formData = new FormData();
    formData.append('logo', file);

    try {
      const { data } = await api.post('/auth/upload-logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setProfile({ ...profile, logo: data.logoPath });
      setProfileErrors((prev) => ({ ...prev, logo: '' }));
    } catch (err) {
      setProfileErrors((prev) => ({ ...prev, logo: err.response?.data?.message || 'Upload failed' }));
    }
  };

  return (
    <div className={styles.formContainer}>
      {/* Logo Upload */}
      <div className={styles.logoSection}>
        <div className={styles.logoPreview}>
          {profile.logo ? (
            <img
              src={`http://localhost:5000${profile.logo}`}
              alt="Logo"
              className={styles.logoImage}
            />
          ) : (
            <HiOutlineCamera size={40} className={styles.logoPlaceholderIcon} />
          )}
        </div>
        <div className={styles.logoUploadArea}>
          <h4 className={styles.logoHeading}>Store Logo</h4>
          <p className={styles.logoHint}>JPG, PNG or WEBP (max 5MB)</p>
          <input
            type="file"
            id="logoUpload"
            className={styles.fileInput}
            onChange={handleFileChange}
          />
          <label htmlFor="logoUpload" className={styles.uploadLabel}>
            Upload New Logo
          </label>
        </div>
      </div>

      {/* Form Fields */}
      <div className={styles.grid}>
        <div className={styles.inputGroup}>
          <label className={styles.label}>Shop Name</label>
          <input
            className={`${styles.input} ${profileErrors.shopName ? styles.inputError : ''}`}
            value={profile.shopName || ''}
            onChange={(e) => updateField('shopName', e.target.value)}
            placeholder="Your shop name"
          />
          {profileErrors.shopName && <p className={styles.errorText}>{profileErrors.shopName}</p>}
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label}>Business Email</label>
          <input
            className={`${styles.input} ${profileErrors.email ? styles.inputError : ''}`}
            type="email"
            value={profile.email || ''}
            onChange={(e) => updateField('email', e.target.value)}
            placeholder="business@example.com"
          />
          {profileErrors.email && <p className={styles.errorText}>{profileErrors.email}</p>}
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label}>Phone Number</label>
          <input
            className={`${styles.input} ${profileErrors.phone ? styles.inputError : ''}`}
            value={profile.phone || ''}
            onChange={(e) => updateField('phone', e.target.value)}
            placeholder="+255 700 000 000"
          />
          {profileErrors.phone && <p className={styles.errorText}>{profileErrors.phone}</p>}
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label}>Physical Address</label>
          <input
            className={`${styles.input} ${profileErrors.address ? styles.inputError : ''}`}
            value={profile.address || ''}
            onChange={(e) => updateField('address', e.target.value)}
            placeholder="Street, City, Region"
          />
          {profileErrors.address && <p className={styles.errorText}>{profileErrors.address}</p>}
        </div>

        <div className={styles.inputGroupFull}>
          <label className={styles.label}>Shop Bio</label>
          <textarea
            className={`${styles.input} ${styles.textarea} ${profileErrors.bio ? styles.inputError : ''}`}
            value={profile.bio || ''}
            onChange={(e) => updateField('bio', e.target.value)}
            placeholder="Tell customers about your shop..."
          />
          {profileErrors.bio && <p className={styles.errorText}>{profileErrors.bio}</p>}
        </div>
      </div>
    </div>
  );
}

// ── Security Form ──
function SecurityForm({ security, setSecurity, securityErrors, setSecurityErrors }) {
  const updateField = (field, value) => {
    setSecurity((prev) => ({ ...prev, [field]: value }));
    if (securityErrors[field]) setSecurityErrors((prev) => ({ ...prev, [field]: '' }));
  };

  return (
    <div className={styles.formContainer}>
      <div className={styles.grid}>
        <div className={styles.inputGroupFull}>
          <label className={styles.label}>Current Password</label>
          <input
            className={`${styles.input} ${securityErrors.current ? styles.inputError : ''}`}
            type="password"
            value={security.current}
            onChange={(e) => updateField('current', e.target.value)}
            placeholder="Enter current password"
          />
          {securityErrors.current && <p className={styles.errorText}>{securityErrors.current}</p>}
        </div>

        <div className={styles.inputGroupFull}>
          <label className={styles.label}>New Password</label>
          <input
            className={`${styles.input} ${securityErrors.new ? styles.inputError : ''}`}
            type="password"
            value={security.new}
            onChange={(e) => updateField('new', e.target.value)}
            placeholder="Enter new password"
          />
          {securityErrors.new && <p className={styles.errorText}>{securityErrors.new}</p>}
        </div>

        <div className={styles.inputGroupFull}>
          <label className={styles.label}>Confirm New Password</label>
          <input
            className={`${styles.input} ${securityErrors.confirm ? styles.inputError : ''}`}
            type="password"
            value={security.confirm}
            onChange={(e) => updateField('confirm', e.target.value)}
            placeholder="Confirm new password"
          />
          {securityErrors.confirm && <p className={styles.errorText}>{securityErrors.confirm}</p>}
        </div>
      </div>
    </div>
  );
}

// ── Tab Button ──
function TabButton({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`${styles.tabButton} ${active ? styles.tabActive : ''}`}
    >
      {icon}
      {label}
    </button>
  );
}

// ── Sidebar ──
function Sidebar({ sidebarOpen, setSidebarOpen, mobileOpen, setMobileOpen, location, navigate }) {
  const links = [
    { label: 'Dashboard', path: '/seller/dashboard', icon: <HiOutlineHome size={22} /> },
    { label: 'Analytics', path: '/seller/analytics', icon: <HiOutlineTrendingUp size={22} /> },
    { label: 'My Orders', path: '/seller/orders', icon: <HiOutlineShoppingBag size={22} /> },
    { label: 'Inventory', path: '/seller/inventory', icon: <HiOutlineArchive size={22} /> },
    { label: 'Add Product', path: '/seller/add-product', icon: <HiOutlinePlusCircle size={22} /> },
  ];

  return (
    <aside
      className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarExpanded : styles.sidebarCollapsed} ${mobileOpen ? styles.mobileOpen : ''}`}
    >
      <div className={styles.sidebarHeader}>
        <h1 className={styles.brand}>GengeSmart</h1>
        <button
          className={styles.closeSidebar}
          onClick={() => {
            setSidebarOpen(false);
            setMobileOpen(false);
          }}
        >
          <HiOutlineX size={24} />
        </button>
      </div>

      <nav className={styles.nav}>
        {links.map((link) => (
          <button
            key={link.path}
            onClick={() => {
              navigate(link.path);
              setSidebarOpen(false);
              setMobileOpen(false);
            }}
            title={link.label}
            data-label={link.label}
            aria-label={link.label}
            className={`${styles.navLink} ${
              location.pathname === link.path ? styles.activeNavLink : ''
            }`}
          >
            {link.icon}
            <span>{link.label}</span>
          </button>
        ))}
      </nav>

      <div className={styles.sidebarFooter}>
        <button
          onClick={() => {
            navigate('/seller/profile');
            setSidebarOpen(false);
            setMobileOpen(false);
          }}
          title="Profile"
          data-label="Profile"
          aria-label="Profile"
          className={`${styles.navLink} ${styles.activeNavLink}`}
        >
          <HiOutlineUserCircle size={22} />
          <span>Profile</span>
        </button>
        <button
          onClick={() => {
            localStorage.clear();
            setMobileOpen(false);
            navigate('/login');
          }}
          title="Sign Out"
          data-label="Sign Out"
          aria-label="Sign Out"
          className={styles.navLink}
        >
          <HiOutlineLogout size={22} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}