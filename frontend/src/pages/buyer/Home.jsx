import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import BuyerLayout from './BuyerLayout';
import { useCart } from '../../context/CartContext';
import api from '../../services/api';
import { FaShoppingCart, FaChevronLeft, FaChevronRight, FaStar } from 'react-icons/fa';
import styles from './Home.module.css';

export default function Home() {
  const [products, setProducts] = useState([]);
  const [activeTab, setActiveTab] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  const { addToCart } = useCart();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await api.get('/buyer/products');
        // Sort newest first
        const sorted = [...res.data].sort((a, b) => b.id - a.id);
        setProducts(sorted);
        setError(null);
      } catch (err) {
        console.error('Error fetching products:', err);
        setError('Failed to load products. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const categories = ['All', 'Vegetables', 'Fruits', 'Grains'];

  const filteredProducts = products.filter((p) => {
    const matchesCategory = activeTab === 'All' || p.category === activeTab;
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // ── Hero shows ALL products ──
  const heroProducts = products;

  // Auto‑slide
  useEffect(() => {
    if (heroProducts.length === 0) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroProducts.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroProducts.length]);

  const goToPrev = () => {
    setCurrentSlide((prev) => (prev === 0 ? heroProducts.length - 1 : prev - 1));
  };
  const goToNext = () => {
    setCurrentSlide((prev) => (prev + 1) % heroProducts.length);
  };

  const currentProduct = heroProducts[currentSlide] || null;

  // ── Format price with unit ──
  const formatPrice = (product) => {
    const unit = product.unit || 'Piece';
    return `TSh ${Number(product.price).toLocaleString()} / ${unit}`;
  };

  return (
    <BuyerLayout onSearch={setSearchTerm}>
      {/* ── Hero Carousel ── */}
      <section className={styles.hero}>
        {loading ? (
          <div className={styles.heroLoading}>Loading products...</div>
        ) : error ? (
          <div className={styles.heroError}>{error}</div>
        ) : heroProducts.length === 0 ? (
          <div className={styles.heroEmpty}>No products available</div>
        ) : (
          <>
            <div className={styles.heroSlide}>
              <img
                src={currentProduct.imageUrl || '/images/placeholder-bg.jpg'}
                alt={currentProduct.name}
                className={styles.heroBgImage}
                onError={(e) => {
                  e.target.src = '/images/placeholder-bg.jpg';
                }}
              />
              <div className={styles.heroOverlay}>
                <div className={styles.heroContent}>
                  <span className={styles.heroFeatured}>FEATURED</span>
                  <div className={styles.heroInfo}>
                    <h2 className={styles.heroName}>{currentProduct.name}</h2>
                    <p className={styles.heroDescription}>
                      {currentProduct.description || 'Fresh and organic produce'}
                    </p>
                    <p className={styles.heroPrice}>
                      {formatPrice(currentProduct)}
                    </p>
                    <button
                      className={styles.heroShopBtn}
                      onClick={() => addToCart(currentProduct)}
                    >
                      <FaShoppingCart /> Shop Now
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation arrows */}
            <button className={styles.arrowLeft} onClick={goToPrev}>
              <FaChevronLeft />
            </button>
            <button className={styles.arrowRight} onClick={goToNext}>
              <FaChevronRight />
            </button>

            {/* Dots indicator */}
            <div className={styles.dots}>
              {heroProducts.map((_, idx) => (
                <span
                  key={idx}
                  className={`${styles.dot} ${idx === currentSlide ? styles.dotActive : ''}`}
                  onClick={() => setCurrentSlide(idx)}
                />
              ))}
            </div>
          </>
        )}
      </section>

      {/* ── Category Tabs ── */}
      <div className={styles.tabsWrapper}>
        <div className={styles.tabs}>
          {categories.map((cat) => (
            <button
              key={cat}
              className={`${styles.tab} ${activeTab === cat ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── Product Grid ── */}
      <div className={styles.gridWrapper}>
        {loading ? (
          <div className={styles.loadingState}>
            <span className={styles.spinner} />
            Loading products...
          </div>
        ) : error ? (
          <div className={styles.errorState}>{error}</div>
        ) : filteredProducts.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No products found.</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {filteredProducts.map((p) => (
              <div key={p.id} className={styles.card}>
                <Link to={`/buyer/product/${p.id}`} className={styles.cardLink}>
                  <div className={styles.cardImage}>
                    <img
                      src={p.imageUrl || '/images/placeholder.png'}
                      alt={p.name}
                      onError={(e) => { e.target.src = '/images/placeholder.png'; }}
                    />
                    <div className={styles.cardBadge}>NEW</div>
                    {p.rating && (
                      <div className={styles.cardRating}>
                        <FaStar /> {p.rating}
                      </div>
                    )}
                  </div>
                  <div className={styles.cardBody}>
                    <h3 className={styles.cardTitle}>{p.name}</h3>
                    <p className={styles.cardPrice}>{formatPrice(p)}</p>
                  </div>
                </Link>
                <button
                  className={styles.cardBtn}
                  onClick={() => addToCart(p)}
                >
                  <FaShoppingCart /> Add to Cart
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </BuyerLayout>
  );
}