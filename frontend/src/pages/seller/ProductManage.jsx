import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';
import styles from './ProductManage.module.css';
import {
  HiOutlinePlus,
  HiOutlineMenu,
  HiOutlineX,
  HiOutlineHome,
  HiOutlineShoppingBag,
  HiOutlinePlusCircle,
  HiOutlineArchive,
  HiOutlineLogout,
  HiOutlineTrendingUp,
  HiOutlineUserCircle,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineRefresh,
} from 'react-icons/hi';
import SearchFilterBar from '../../components/seller/SearchFilterBar';

export default function ProductManage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ search: '', category: '' });
  const [deletingId, setDeletingId] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Use the correct endpoint for seller's products
      const response = await api.get('/seller/my-products', {
        params: { 
          search: filters.search, 
          category: filters.category 
        },
      });
      
      // Handle different response formats
      let productsData = [];
      if (response.data.products) {
        productsData = response.data.products;
      } else if (Array.isArray(response.data)) {
        productsData = response.data;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        productsData = response.data.data;
      }
      
      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching products:', error);
      // Treat 404 (no products) as an empty list instead of an error
      if (error.response?.status === 404) {
        setProducts([]);
        setError(null);
      } else {
        setError(error.response?.data?.message || 'Failed to load products.');
      }

      // If 403, user might not be authenticated or not a seller
      if (error.response?.status === 403) {
        setError('You need to be logged in as a seller to view products. Please login again.');
        // Optional: redirect to login after 3 seconds
        // setTimeout(() => navigate('/login'), 3000);
      }
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const handler = setTimeout(fetchProducts, 300);
    return () => clearTimeout(handler);
  }, [fetchProducts]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to archive this product?')) return;

    setDeletingId(id);
    setError(null);
    try {
      const response = await api.delete(`/seller/products/${id}`);
      alert(response.data.message || 'Product archived successfully.');
      // Remove the product from the list immediately
      setProducts(products.filter((p) => p.id !== id));
    } catch (error) {
      console.error('Delete error:', error);
      const message = error.response?.data?.message || 'Failed to delete product.';
      alert(message);
      setError(message);
    } finally {
      setDeletingId(null);
    }
  };

  const getImageUrl = (product) => {
    if (product.image_url) {
      return `http://localhost:5000${product.image_url}`;
    }
    return '/images/placeholder.png';
  };

  const handleRefresh = () => {
    fetchProducts();
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
            <h2 className={styles.title}>Inventory</h2>
            <span className={styles.productCount}>
              {products.length} {products.length === 1 ? 'product' : 'products'}
            </span>
          </div>
          <div className={styles.headerRight}>
            <button
              onClick={handleRefresh}
              className={styles.refreshBtn}
              disabled={loading}
            >
              <HiOutlineRefresh className={loading ? styles.spinning : ''} />
              Refresh
            </button>
            <button
              onClick={() => navigate('/seller/add-product')}
              className={styles.addBtn}
            >
              <HiOutlinePlus size={20} />
              Add Product
            </button>
          </div>
        </header>

        <div className={styles.filterWrapper}>
          <SearchFilterBar
            onSearch={(v) => setFilters((p) => ({ ...p, search: v }))}
            onCategoryChange={(v) => setFilters((p) => ({ ...p, category: v }))}
          />
        </div>

        {error && (
          <div className={styles.errorBanner}>
            <span>❌ {error}</span>
            <button onClick={() => setError(null)} className={styles.closeError}>×</button>
          </div>
        )}

        <div className={styles.tableCard}>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Image</th>
                  <th className={styles.th}>Product</th>
                  <th className={styles.th}>Price</th>
                  <th className={styles.th}>Stock</th>
                  <th className={styles.th}>Status</th>
                  <th className={`${styles.th} ${styles.thActions}`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className={styles.loadingState}>
                      <span className={styles.spinner} />
                      Loading your inventory...
                    </td>
                  </tr>
                ) : products.length > 0 ? (
                  products.map((p) => (
                    <tr key={p.id} className={styles.row}>
                      <td className={styles.td}>
                        <img
                          src={getImageUrl(p)}
                          alt={p.name}
                          className={styles.productImage}
                          onError={(e) => {
                            e.target.src = '/images/placeholder.png';
                          }}
                        />
                      </td>
                      <td className={`${styles.td} ${styles.productName}`}>
                        <div className={styles.productInfo}>
                          <span className={styles.productTitle}>{p.name}</span>
                          {p.category && (
                            <span className={styles.productCategory}>{p.category}</span>
                          )}
                        </div>
                      </td>
                      <td className={styles.td}>
                        <span className={styles.price}>
                          TSh {Number(p.price).toLocaleString()}
                        </span>
                      </td>
                      <td className={styles.td}>
                        <span className={`${styles.stockBadge} ${p.stock <= 10 ? styles.lowStock : ''}`}>
                          {p.stock || 0}
                        </span>
                      </td>
                      <td className={styles.td}>
                        <span className={`${styles.statusBadge} ${p.status === 'active' ? styles.statusActive : styles.statusInactive}`}>
                          {p.status || 'active'}
                        </span>
                      </td>
                      <td className={`${styles.td} ${styles.actions}`}>
                        <button
                          onClick={() =>
                            navigate(`/seller/edit-product/${p.id}`)
                          }
                          className={styles.editBtn}
                        >
                          <HiOutlinePencil size={16} />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className={styles.deleteBtn}
                          disabled={deletingId === p.id}
                        >
                          {deletingId === p.id ? (
                            <span className={styles.spinnerSmall} />
                          ) : (
                            <>
                              <HiOutlineTrash size={16} />
                              Archive
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className={styles.emptyState}>
                      <HiOutlineArchive size={48} className={styles.emptyIcon} />
                      <p>No products found</p>
                      <span>
                        {filters.search || filters.category 
                          ? 'Try adjusting your search filters' 
                          : 'Start by adding your first product'}
                      </span>
                      <button
                        onClick={() => navigate('/seller/add-product')}
                        className={styles.emptyAddBtn}
                      >
                        <HiOutlinePlus size={20} />
                        Add Your First Product
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
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
          className={styles.navLink}
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