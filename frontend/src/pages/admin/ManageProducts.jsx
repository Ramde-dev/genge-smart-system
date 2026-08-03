import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import api from '../../services/api';
import {
  HiOutlineRefresh,
  HiOutlineSearch,
  HiOutlineX,
  HiOutlineTrash,
  HiOutlineEye,
} from 'react-icons/hi';
import styles from './ManageProducts.module.css';

export default function ManageProducts() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/admin/products');
      setProducts(res.data);
      setFilteredProducts(res.data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    const interval = setInterval(fetchProducts, 30000);
    return () => clearInterval(interval);
  }, [fetchProducts]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredProducts(products);
      return;
    }
    const lower = searchTerm.toLowerCase();
    const filtered = products.filter(
      (p) =>
        p.name.toLowerCase().includes(lower) ||
        p.category?.toLowerCase().includes(lower) ||
        p.seller_name?.toLowerCase().includes(lower) ||
        p.unit?.toLowerCase().includes(lower)
    );
    setFilteredProducts(filtered);
  }, [searchTerm, products]);

  const handleRemove = async (productId) => {
    if (!window.confirm('Are you sure you want to remove this product from buyer view?')) return;
    setActionLoading(productId);
    try {
      await api.delete(`/admin/products/${productId}`);
      // Optimistic update
      const updated = products.filter(p => p.id !== productId);
      setProducts(updated);
      setFilteredProducts(
        filteredProducts.filter(p => p.id !== productId)
      );
    } catch (err) {
      console.error('Remove product error:', err);
      alert('Failed to remove product. Please try again.');
      fetchProducts();
    } finally {
      setActionLoading(null);
    }
  };

  const clearSearch = () => setSearchTerm('');

  const getImageUrl = (product) => {
    if (product.image_url) {
      return `http://localhost:5000${product.image_url}`;
    }
    return '/images/placeholder.png';
  };

  return (
    <AdminLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Manage Products</h1>
            <p className={styles.subtitle}>
              View and remove products from buyer listings
              {lastUpdated && (
                <span className={styles.lastUpdated}>
                  {' '}
                  · Updated {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
          <button
            className={styles.refreshBtn}
            onClick={fetchProducts}
            disabled={loading}
          >
            <HiOutlineRefresh /> {loading ? 'Loading...' : 'Refresh'}
          </button>
        </header>

        <div className={styles.searchBar}>
          <HiOutlineSearch className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search by name, category, seller, or unit..."
            className={styles.searchInput}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className={styles.clearBtn} onClick={clearSearch}>
              <HiOutlineX />
            </button>
          )}
        </div>

        {error && <div className={styles.errorMsg}>{error}</div>}

        <div className={styles.tableWrapper}>
          {loading && filteredProducts.length === 0 ? (
            <div className={styles.loadingState}>
              <span className={styles.spinner} />
              Loading products...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className={styles.emptyState}>
              {searchTerm ? 'No products match your search.' : 'No products found.'}
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Unit</th>
                  <th>Seller</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <img
                        src={getImageUrl(product)}
                        alt={product.name}
                        className={styles.productImage}
                        onError={(e) => (e.target.src = '/images/placeholder.png')}
                      />
                    </td>
                    <td className={styles.productName}>{product.name}</td>
                    <td>
                      <span className={styles.categoryBadge}>{product.category || '—'}</span>
                    </td>
                    <td>TSh {Number(product.price).toLocaleString()}</td>
                    <td>{product.unit || 'Piece'}</td>
                    <td>
                      <span className={styles.sellerName}>{product.seller_name || 'Unknown'}</span>
                      <div className={styles.sellerEmail}>{product.seller_email}</div>
                    </td>
                    <td className={styles.actionsCell}>
                      <button
                        className={styles.removeBtn}
                        onClick={() => handleRemove(product.id)}
                        disabled={actionLoading === product.id}
                      >
                        {actionLoading === product.id ? (
                          <span className={styles.spinnerSmall} />
                        ) : (
                          <>
                            <HiOutlineTrash /> Remove
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}