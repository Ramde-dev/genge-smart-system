import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import BuyerLayout from './BuyerLayout';
import api from '../../services/api';
import { useCart } from '../../context/CartContext';
import { FaShoppingCart, FaMinus, FaPlus, FaStar, FaStarHalfAlt, FaRegStar } from 'react-icons/fa';
import styles from './ProductDetails.module.css';

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [relatedLoading, setRelatedLoading] = useState(false);

  // ── Helper: format price with unit ──
  const formatPrice = (product) => {
    const unit = product.unit || 'Piece';
    return `TSh ${Number(product.price).toLocaleString()} / ${unit}`;
  };

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await api.get(`/buyer/products/${id}`);
        setProduct(res.data);
        setError(null);

        // Fetch related products if category exists
        if (res.data.category) {
          setRelatedLoading(true);
          try {
            const relatedRes = await api.get(`/buyer/products?category=${res.data.category}`);
            const filtered = relatedRes.data.filter(p => p.id !== parseInt(id));
            setRelatedProducts(filtered.slice(0, 4));
          } catch (relatedErr) {
            console.warn('Could not fetch related products:', relatedErr);
          } finally {
            setRelatedLoading(false);
          }
        }
      } catch (err) {
        console.error('Error fetching product:', err);
        setError('Product not found');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  const handleAddToCart = () => {
    if (product) {
      for (let i = 0; i < quantity; i++) {
        addToCart(product);
      }
      alert(`${quantity} × ${product.name} added to cart!`);
    }
  };

  const renderStars = (rating = 0) => {
    const full = Math.floor(rating);
    const half = rating - full >= 0.5 ? 1 : 0;
    const stars = [];
    for (let i = 0; i < full; i++) stars.push(<FaStar key={i} />);
    if (half) stars.push(<FaStarHalfAlt key="half" />);
    while (stars.length < 5) stars.push(<FaRegStar key={stars.length} />);
    return stars;
  };

  if (loading) {
    return (
      <BuyerLayout>
        <div className={styles.loadingState}>
          <span className={styles.spinner} />
          Loading product...
        </div>
      </BuyerLayout>
    );
  }

  if (error || !product) {
    return (
      <BuyerLayout>
        <div className={styles.errorState}>
          <p>{error || 'Product not found'}</p>
          <Link to="/buyer/home" className={styles.shopBtn}>Back to Shop</Link>
        </div>
      </BuyerLayout>
    );
  }

  return (
    <BuyerLayout>
      <div className={styles.container}>
        {/* ── Breadcrumb ── */}
        <nav className={styles.breadcrumb}>
          <Link to="/buyer/home">Home</Link>
          <span>/</span>
          {product.category ? (
            <>
              <Link to={`/buyer/home?category=${product.category}`}>{product.category}</Link>
              <span>/</span>
            </>
          ) : (
            <span className={styles.categoryFallback}>Products</span>
          )}
          <span className={styles.current}>{product.name}</span>
        </nav>

        {/* ── Product Layout ── */}
        <div className={styles.productLayout}>
          {/* Left: Image */}
          <div className={styles.imageSection}>
            <div className={styles.mainImage}>
              <img
                src={product.imageUrl || '/placeholder.svg'}
                alt={product.name}
                onError={(e) => (e.target.src = '/placeholder.svg')}
              />
            </div>
          </div>

          {/* Right: Details */}
          <div className={styles.detailsSection}>
            <h1 className={styles.productName}>{product.name}</h1>

            <div className={styles.rating}>
              {Number(product.review_count) > 0 ? (
                <>
                  <span className={styles.stars}>{renderStars(Number(product.rating))}</span>
                  <span className={styles.reviewCount}>({product.review_count} reviews)</span>
                </>
              ) : (
                <span className={styles.reviewCount}>No reviews yet</span>
              )}
            </div>

            <div className={styles.price}>{formatPrice(product)}</div>

            <div className={styles.description}>
              <p>{product.description || 'No description available.'}</p>
            </div>

            {product.seller_name && (
              <div className={styles.sellerInfo}>
                <h4>Sold by</h4>
                <p>{product.seller_name}</p>
                <p className={styles.sellerContact}>{product.seller_phone}</p>
              </div>
            )}

            {/* ── Quantity Selector ── */}
            <div className={styles.quantitySection}>
              <label>Quantity</label>
              <div className={styles.quantityControls}>
                <button
                  className={styles.qtyBtn}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="Decrease quantity"
                >
                  <FaMinus />
                </button>
                <span className={styles.qtyValue}>{quantity}</span>
                <button
                  className={styles.qtyBtn}
                  onClick={() => setQuantity((q) => q + 1)}
                  aria-label="Increase quantity"
                >
                  <FaPlus />
                </button>
              </div>
            </div>

            <button className={styles.addToCartBtn} onClick={handleAddToCart}>
              <FaShoppingCart /> Add to Cart ({quantity})
            </button>
          </div>
        </div>

        {/* ── Related Products ── */}
        {relatedLoading ? (
          <div className={styles.relatedLoading}>Loading similar products...</div>
        ) : relatedProducts.length > 0 ? (
          <div className={styles.relatedSection}>
            <h3 className={styles.relatedTitle}>You may also like</h3>
            <div className={styles.relatedGrid}>
              {relatedProducts.map((p) => (
                <div key={p.id} className={styles.relatedCard}>
                  <Link to={`/buyer/product/${p.id}`} className={styles.relatedLinkWrapper}>
                    <img
                      src={p.imageUrl || '/placeholder.svg'}
                      alt={p.name}
                      onError={(e) => (e.target.src = '/placeholder.svg')}
                    />
                    <div className={styles.relatedInfo}>
                      <h4>{p.name}</h4>
                      <p className={styles.relatedPrice}>{formatPrice(p)}</p>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        ) : (
          product.category && (
            <div className={styles.noRelated}>
              <p>No other products in this category.</p>
            </div>
          )
        )}
      </div>
    </BuyerLayout>
  );
}