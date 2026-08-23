import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import BuyerLayout from './BuyerLayout';
import { useCart } from '../../context/CartContext';
import api from '../../services/api';
import { FaShoppingCart, FaMinus, FaPlus, FaTrash, FaStar } from 'react-icons/fa';
import styles from './Home.module.css';

export default function Home() {
  const location = useLocation();
  const landingState = location.state || {};
  const [products, setProducts] = useState([]);
  const [activeTab, setActiveTab] = useState(landingState.category || 'All');
  const [searchTerm, setSearchTerm] = useState(landingState.search || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [welcomeText, setWelcomeText] = useState('');
  const [currentSlide, setCurrentSlide] = useState(0);

  const { cart, addToCart, removeFromCart, updateQuantity, clearCart } = useCart();

  useEffect(() => {
    const message = 'Welcome to GengeSmart';
    let index = 0;
    const typing = window.setInterval(() => {
      index += 1;
      setWelcomeText(message.slice(0, index));
      if (index === message.length) window.clearInterval(typing);
    }, 70);
    return () => window.clearInterval(typing);
  }, []);

  const handleCartToggle = (product) => {
    const isInCart = cart.some((item) => item.id === product.id);
    if (isInCart) {
      removeFromCart(product.id);
    } else {
      addToCart(product);
    }
  };

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

  const categories = ['All', ...new Set(products.map((product) => product.category).filter(Boolean))];

  const filteredProducts = products.filter((p) => {
    const matchesCategory = activeTab === 'All' || p.category === activeTab;
    const matchesSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const heroProducts = products.filter((product) => product.imageUrl);
  const currentProduct = heroProducts[currentSlide % Math.max(heroProducts.length, 1)];

  useEffect(() => {
    if (heroProducts.length < 2) return undefined;
    const interval = window.setInterval(() => {
      setCurrentSlide((current) => (current + 1) % heroProducts.length);
    }, 5000);
    return () => window.clearInterval(interval);
  }, [heroProducts.length]);

  // ── Format price with unit ──
  const formatPrice = (product) => {
    const unit = product.unit || 'Piece';
    return `TSh ${Number(product.price).toLocaleString()} / ${unit}`;
  };

  return (
    <BuyerLayout onSearch={setSearchTerm}>
      {/* ── Welcome hero ── */}
      <section className={styles.hero}>
        {currentProduct && (
          <img
            src={currentProduct.imageUrl}
            alt=""
            className={styles.heroBgImage}
            onError={(event) => { event.currentTarget.style.display = 'none'; }}
          />
        )}
        <div className={styles.heroOverlay}>
          <div className={styles.welcomeContent}>
            <span className={styles.heroFeatured}>FRESH PICKS. SMART SHOPPING.</span>
            <h1 className={styles.welcomeTitle}>{welcomeText}<span className={styles.typingCursor} /></h1>
          </div>
        </div>
        {heroProducts.length > 1 && (
          <div className={styles.dots}>
            {heroProducts.map((product, index) => (
              <button
                key={product.id}
                className={`${styles.dot} ${index === currentSlide % heroProducts.length ? styles.dotActive : ''}`}
                onClick={() => setCurrentSlide(index)}
                aria-label={`Show product image ${index + 1}`}
              />
            ))}
          </div>
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

      {/* ── Product Grid and Cart ── */}
      <div className={`${styles.marketplaceLayout} ${cart.length === 0 ? styles.withoutCart : ''}`}>
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
                  className={`${styles.cardBtn} ${cart.some((item) => item.id === p.id) ? styles.addedBtn : ''}`}
                  onClick={() => handleCartToggle(p)}
                >
                  <FaShoppingCart /> {cart.some((item) => item.id === p.id) ? 'Remove from Cart' : 'Add to Cart'}
                </button>
              </div>
            ))}
          </div>
        )}
        </div>

        {cart.length > 0 && (
          <section className={styles.cartPanel} aria-label="Shopping cart">
            <div className={styles.cartPanelHeader}>
              <h2 className={styles.cartPanelTitle}>Shopping cart</h2>
              <button className={styles.clearCartBtn} onClick={clearCart}>Clear cart</button>
            </div>
            <>
              <div className={styles.cartItems}>
                {cart.map((item) => (
                  <div className={styles.cartItem} key={item.id}>
                    <div>
                      <strong>{item.name}</strong>
                      <span>{formatPrice(item)}</span>
                    </div>
                    <div className={styles.cartItemActions}>
                      <button onClick={() => updateQuantity(item.id, -1)} aria-label={`Decrease ${item.name}`}><FaMinus /></button>
                      <span>{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} aria-label={`Increase ${item.name}`}><FaPlus /></button>
                      <button className={styles.removeCartBtn} onClick={() => removeFromCart(item.id)} aria-label={`Remove ${item.name}`}><FaTrash /></button>
                    </div>
                  </div>
                ))}
              </div>
              <Link to="/buyer/checkout" className={styles.checkoutBtn}>Proceed to Checkout</Link>
            </>
          </section>
        )}
      </div>
    </BuyerLayout>
  );
}