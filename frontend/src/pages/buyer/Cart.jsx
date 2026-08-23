import { useState } from 'react';
import { useCart } from '../../context/CartContext';
import BuyerLayout from './BuyerLayout';
import { Link } from 'react-router-dom';
import { FaTrash, FaMinus, FaPlus, FaShoppingCart } from 'react-icons/fa';
import styles from './Cart.module.css';

export default function Cart() {
  const [searchTerm, setSearchTerm] = useState('');
  const { cart, removeFromCart, updateQuantity } = useCart();

  const filteredCart = cart.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const total = filteredCart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <BuyerLayout onSearch={setSearchTerm}>
      <div className={`${styles.container} ${cart.length === 0 ? styles.emptyContainer : ''}`}>
        <header className={styles.header}>
          <h1 className={styles.title}>Your Shopping Cart</h1>
          <p className={styles.subtitle}>
            {cart.length} item{cart.length !== 1 ? 's' : ''} in your cart
          </p>
        </header>

        {cart.length === 0 ? (
          <div className={styles.emptyState}>
            <FaShoppingCart size={64} className={styles.emptyIcon} />
            <h3>Your cart is empty</h3>
            <Link to="/buyer/home" className={styles.shopBtn}>Start Shopping</Link>
          </div>
        ) : filteredCart.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No items match your search: <strong>"{searchTerm}"</strong></p>
            <button onClick={() => setSearchTerm('')} className={styles.clearBtn}>
              Clear Search
            </button>
          </div>
        ) : (
          <div className={styles.cartLayout}>
            {/* Cart Items */}
            <div className={styles.itemsList}>
              {filteredCart.map((item) => (
                <div key={item.id} className={styles.cartItem}>
                  <div className={styles.itemImageWrapper}>
                    <img
                      src={item.imageUrl || '/images/placeholder.png'}
                      alt={item.name}
                      className={styles.itemImage}
                      onError={(e) => (e.target.src = '/images/placeholder.png')}
                    />
                  </div>
                  <div className={styles.itemDetails}>
                    <h3 className={styles.itemName}>{item.name}</h3>
                    <p className={styles.itemPrice}>
                      TSh {Number(item.price).toLocaleString()}
                    </p>
                  </div>
                  <div className={styles.quantityControls}>
                    <button
                      className={styles.qtyBtn}
                      onClick={() => updateQuantity(item.id, -1)}
                    >
                      <FaMinus />
                    </button>
                    <span className={styles.qtyValue}>{item.quantity}</span>
                    <button
                      className={styles.qtyBtn}
                      onClick={() => updateQuantity(item.id, 1)}
                    >
                      <FaPlus />
                    </button>
                  </div>
                  <button
                    className={styles.removeBtn}
                    onClick={() => removeFromCart(item.id)}
                    aria-label="Remove item"
                  >
                    <FaTrash />
                  </button>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className={styles.summaryCard}>
              <h2 className={styles.summaryTitle}>Order Summary</h2>
              <div className={styles.summaryRow}>
                <span>Subtotal</span>
                <span>TSh {total.toLocaleString()}</span>
              </div>
              <div className={styles.summaryRow}>
                <span>Shipping</span>
                <span>Calculated at checkout</span>
              </div>
              <div className={styles.summaryDivider}></div>
              <div className={`${styles.summaryRow} ${styles.totalRow}`}>
                <span>Total</span>
                <span>TSh {total.toLocaleString()}</span>
              </div>
              <Link to="/buyer/checkout" className={styles.checkoutBtn}>
                Proceed to Checkout
              </Link>
            </div>
          </div>
        )}
      </div>
    </BuyerLayout>
  );
}