import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';
import styles from './AddProduct.module.css';
import {
  HiOutlineMenu,
  HiOutlineX,
  HiOutlineHome,
  HiOutlineShoppingBag,
  HiOutlinePlusCircle,
  HiOutlineArchive,
  HiOutlineLogout,
  HiOutlineArrowLeft,
  HiOutlineTrendingUp,
  HiOutlineUserCircle,
  HiOutlinePhotograph,
  HiOutlineUpload,
} from 'react-icons/hi';

export default function AddProduct() {
  const [product, setProduct] = useState({
    name: '',
    price: '',
    stock: '',
    description: '',
    category: 'Vegetables',
    unit: 'Piece',
  });
  const [errors, setErrors] = useState({});
  const [serverMessage, setServerMessage] = useState('');
  const [image, setImage] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const unitOptions = [
    'Kilogram',
    'Gram',
    'Bunch',
    'Piece',
    'Dozen',
    'Bag',
    'Sack',
    'Crate',
    'Ton',
    'Bucket',
  ];

  const validate = () => {
    const newErrors = {};
    if (!product.name.trim()) newErrors.name = 'Product name is required';
    else if (product.name.trim().length < 2) newErrors.name = 'Product name must be at least 2 characters';

    if (!product.price || Number(product.price) <= 0)
      newErrors.price = 'Enter a valid price';
    if (product.stock === '' || Number(product.stock) < 0 || !Number.isInteger(Number(product.stock)))
      newErrors.stock = 'Enter a valid stock quantity';
    if (!product.description.trim())
      newErrors.description = 'Description is required';
    else if (product.description.trim().length < 10)
      newErrors.description = 'Description must be at least 10 characters';

    if (image) {
      const fileSize = image.size / 1024 / 1024;
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(image.type)) {
        newErrors.image = 'Please upload a JPG, PNG, or WEBP image';
      } else if (fileSize > 5) {
        newErrors.image = 'Image must be 5MB or smaller';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerMessage('');
    if (!validate()) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('name', product.name);
    formData.append('price', product.price);
    formData.append('stock', product.stock);
    formData.append('description', product.description);
    formData.append('category', product.category);
    formData.append('unit', product.unit);
    if (image) formData.append('image', image);

    try {
      await api.post('/seller/products', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setServerMessage('Product published successfully.');
      navigate('/seller/inventory');
    } catch (err) {
      setServerMessage(err.response?.data?.message || 'Error publishing product');
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
          <button
            className={styles.menuToggle}
            onClick={() => setMobileOpen(true)}
          >
            <HiOutlineMenu size={28} />
          </button>
          <button
            onClick={() => navigate(-1)}
            className={styles.backButton}
          >
            <HiOutlineArrowLeft size={28} />
          </button>
          <h2 className={styles.title}>Add Product</h2>
        </header>

        <form onSubmit={handleSubmit} className={styles.formCard}>
          {serverMessage && <div className={styles.serverMessage}>{serverMessage}</div>}
          <div className={styles.imageSection}>
            <div className={styles.imagePreview}>
              {image ? (
                <img
                  src={URL.createObjectURL(image)}
                  alt="Preview"
                  className={styles.previewImage}
                />
              ) : (
                <HiOutlinePhotograph size={48} className={styles.placeholderIcon} />
              )}
            </div>
            <div className={styles.uploadArea}>
              <h4 className={styles.uploadHeading}>Product Image</h4>
              <p className={styles.uploadHint}>JPG, PNG or WEBP (max 5MB)</p>
              <input
                type="file"
                id="fileUpload"
                className={styles.fileInput}
                accept="image/*"
                onChange={(e) => {
                  setImage(e.target.files[0]);
                  if (errors.image) setErrors((prev) => ({ ...prev, image: '' }));
                }}
              />
              <label htmlFor="fileUpload" className={styles.uploadLabel}>
                <HiOutlineUpload className={styles.uploadIcon} />
                {image ? 'Change Image' : 'Upload Image'}
              </label>
            </div>
          </div>

          <div className={styles.grid}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Product Name</label>
              <input
                className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
                value={product.name}
                onChange={(e) =>
                  setProduct({ ...product, name: e.target.value })
                }
                placeholder="e.g. Fresh Tomatoes"
              />
              {errors.name && <p className={styles.errorText}>{errors.name}</p>}
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Price (TSh)</label>
              <input
                type="number"
                className={`${styles.input} ${errors.price ? styles.inputError : ''}`}
                value={product.price}
                onChange={(e) =>
                  setProduct({ ...product, price: e.target.value })
                }
                placeholder="0.00"
              />
              {errors.price && <p className={styles.errorText}>{errors.price}</p>}
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Stock Quantity</label>
              <input
                type="number"
                min="0"
                step="1"
                className={`${styles.input} ${errors.stock ? styles.inputError : ''}`}
                value={product.stock}
                onChange={(e) =>
                  setProduct({ ...product, stock: e.target.value })
                }
                placeholder="0"
              />
              {errors.stock && <p className={styles.errorText}>{errors.stock}</p>}
            </div>

            <div className={styles.inputGroupFull}>
              <label className={styles.label}>Category</label>
              <select
                className={styles.input}
                value={product.category}
                onChange={(e) =>
                  setProduct({ ...product, category: e.target.value })
                }
              >
                <option>Vegetables</option>
                <option>Fruits</option>
                <option>Grains</option>
              </select>
            </div>

            <div className={styles.inputGroupFull}>
              <label className={styles.label}>Unit of Measurement</label>
              <select
                className={styles.input}
                value={product.unit}
                onChange={(e) =>
                  setProduct({ ...product, unit: e.target.value })
                }
              >
                {unitOptions.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.inputGroupFull}>
              <label className={styles.label}>Description</label>
              <textarea
                className={`${styles.input} ${styles.textarea} ${
                  errors.description ? styles.inputError : ''
                }`}
                value={product.description}
                onChange={(e) =>
                  setProduct({ ...product, description: e.target.value })
                }
                placeholder="Describe your product in detail..."
              />
              {errors.description && (
                <p className={styles.errorText}>{errors.description}</p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={styles.submitBtn}
          >
            {loading ? (
              <span className={styles.spinner} />
            ) : (
              'Publish Product'
            )}
          </button>
        </form>
      </main>
    </div>
  );
}

function Sidebar({ sidebarOpen, setSidebarOpen, mobileOpen, setMobileOpen, location, navigate }) {
  const links = [
    { label: 'Dashboard', path: '/seller/dashboard', icon: <HiOutlineHome size={22} /> },
    { label: 'Analytics', path: '/seller/analytics', icon: <HiOutlineTrendingUp size={22} /> },
    { label: 'My Orders', path: '/seller/orders', icon: <HiOutlineShoppingBag size={22} /> },
    { label: 'Inventory', path: '/seller/inventory', icon: <HiOutlineArchive size={22} /> },
    { label: 'Add Product', path: '/seller/add-product', icon: <HiOutlinePlusCircle size={22} /> },
  ];

  return (
    <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarExpanded : styles.sidebarCollapsed} ${mobileOpen ? styles.mobileOpen : ''}`}>
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
            className={`${styles.navLink} ${
              location.pathname === link.path ? styles.activeNavLink : ''
            }`}
            data-label={link.label}
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
            setMobileOpen(false);
          }}
          className={styles.navLink}
          data-label="Profile"
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
          className={styles.navLink}
          data-label="Sign Out"
        >
          <HiOutlineLogout size={22} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}