import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';
import styles from './EditProduct.module.css';
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

export default function EditProduct() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [product, setProduct] = useState({
    name: '',
    price: '',
    description: '',
    category: 'Vegetables',
    unit: 'Piece',
    image_url: '',
  });
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [errors, setErrors] = useState({});
  const [serverMessage, setServerMessage] = useState('');

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

  const validateProductForm = () => {
    const nextErrors = {};

    if (!product.name.trim()) nextErrors.name = 'Product name is required';
    else if (product.name.trim().length < 2) nextErrors.name = 'Product name must be at least 2 characters';

    if (!product.price || Number(product.price) <= 0) nextErrors.price = 'Enter a valid price';

    if (!product.description.trim()) nextErrors.description = 'Description is required';
    else if (product.description.trim().length < 10) nextErrors.description = 'Description must be at least 10 characters';

    if (image) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(image.type)) nextErrors.image = 'Please upload a JPG, PNG, or WEBP image';
      else if (image.size > 5 * 1024 * 1024) nextErrors.image = 'Image must be 5MB or smaller';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await api.get('/seller/my-products');
        const products = res.data.products || [];
        const foundProduct = products.find((p) => p.id === parseInt(id));
        if (foundProduct) {
          setProduct(foundProduct);
        } else {
          setServerMessage('Product not found.');
          navigate('/seller/inventory');
        }
      } catch (err) {
        console.error('Error loading product:', err);
        setServerMessage('Error loading product.');
      } finally {
        setFetching(false);
      }
    };
    fetchProduct();
  }, [id, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerMessage('');
    if (!validateProductForm()) return;
    setLoading(true);

    const formData = new FormData();
    formData.append('name', product.name);
    formData.append('price', product.price);
    formData.append('description', product.description);
    formData.append('category', product.category);
    formData.append('unit', product.unit);
    if (image) formData.append('image', image);

    try {
      await api.put(`/seller/products/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setServerMessage('Product updated successfully.');
      navigate('/seller/inventory');
    } catch (err) {
      setServerMessage(err.response?.data?.message || 'Error updating product');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
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
          <div className={styles.loadingState}>
            <span className={styles.spinner} />
            Loading product...
          </div>
        </main>
      </div>
    );
  }

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
            <button
              onClick={() => navigate(-1)}
              className={styles.backButton}
            >
              <HiOutlineArrowLeft size={28} />
            </button>
            <h2 className={styles.title}>Edit Product</h2>
          </div>
        </header>

        <form onSubmit={handleSubmit} className={styles.formCard}>
          {serverMessage && <div className={styles.serverMessage}>{serverMessage}</div>}
          {/* Image Upload */}
          <div className={styles.imageSection}>
            <div className={styles.imagePreview}>
              {image ? (
                <img
                  src={URL.createObjectURL(image)}
                  alt="Preview"
                  className={styles.previewImage}
                />
              ) : product.image_url ? (
                <img
                  src={`http://localhost:5000${product.image_url}`}
                  alt="Product"
                  className={styles.previewImage}
                />
              ) : (
                <HiOutlinePhotograph size={48} className={styles.placeholderIcon} />
              )}
            </div>
            <div className={styles.uploadArea}>
              <h4 className={styles.uploadHeading}>Product Image</h4>
              <p className={styles.uploadHint}>
                JPG, PNG or WEBP (max 5MB)
              </p>
              <input
                type="file"
                id="fileUpload"
                className={styles.fileInput}
                accept="image/*"
                onChange={(e) => {
                  setImage(e.target.files[0]);
                  if (errors.image) setErrors(prev => ({ ...prev, image: '' }));
                }}
              />
              {errors.image && <p className={styles.errorText}>{errors.image}</p>}
              <label htmlFor="fileUpload" className={styles.uploadLabel}>
                <HiOutlineUpload className={styles.uploadIcon} />
                {image ? 'Change Image' : 'Replace Image'}
              </label>
            </div>
          </div>

          {/* Form Fields */}
          <div className={styles.grid}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Product Name</label>
              <input
                type="text"
                className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
                value={product.name}
                onChange={(e) => {
                  setProduct({ ...product, name: e.target.value });
                  if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
                }}
                placeholder="e.g. Fresh Tomatoes"
                required
              />
              {errors.name && <p className={styles.errorText}>{errors.name}</p>}
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Price (TSh)</label>
              <input
                type="number"
                className={`${styles.input} ${errors.price ? styles.inputError : ''}`}
                value={product.price}
                onChange={(e) => {
                  setProduct({ ...product, price: e.target.value });
                  if (errors.price) setErrors(prev => ({ ...prev, price: '' }));
                }}
                placeholder="0.00"
                required
              />
              {errors.price && <p className={styles.errorText}>{errors.price}</p>}
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
                value={product.unit || 'Piece'}
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
                className={`${styles.input} ${styles.textarea} ${errors.description ? styles.inputError : ''}`}
                value={product.description}
                onChange={(e) => {
                  setProduct({ ...product, description: e.target.value });
                  if (errors.description) setErrors(prev => ({ ...prev, description: '' }));
                }}
                placeholder="Describe your product in detail..."
              />
              {errors.description && <p className={styles.errorText}>{errors.description}</p>}
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
              'Save Changes'
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
            setSidebarOpen(false);
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