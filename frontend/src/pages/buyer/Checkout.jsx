import { useState } from 'react';
import { useCart } from '../../context/CartContext';
import { useUser } from '../../context/UserContext';
import BuyerLayout from './BuyerLayout';
import { Link, useNavigate } from 'react-router-dom';
import { FaCreditCard, FaMobileAlt, FaMoneyBillWave, FaSpinner } from 'react-icons/fa';
import api from '../../services/api';
import styles from './Checkout.module.css';

export default function Checkout() {
  const { cart, clearCart } = useCart();
  const { user } = useUser();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: user?.name || '',
    email: user?.email || '',
    phone: '',
    address: '',
    city: '',
    region: '',
    postalCode: '',
    paymentMethod: 'mobile_money',
    saveAddress: false,
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal > 0 ? 2500 : 0;
  const total = subtotal + shipping;

  const validate = () => {
    const newErrors = {};
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phonePattern = /^\+?[0-9\s\-()]{7,}$/;

    if (!form.fullName.trim()) newErrors.fullName = 'Full name is required';
    else if (form.fullName.trim().length < 2) newErrors.fullName = 'Full name must be at least 2 characters';

    if (!form.email.trim()) newErrors.email = 'Email is required';
    else if (!emailPattern.test(form.email.trim())) newErrors.email = 'Enter a valid email address';

    if (!form.phone.trim()) newErrors.phone = 'Phone number is required';
    else if (!phonePattern.test(form.phone.trim())) newErrors.phone = 'Enter a valid phone number';

    if (!form.address.trim()) newErrors.address = 'Address is required';
    if (!form.city.trim()) newErrors.city = 'City is required';
    if (!form.region.trim()) newErrors.region = 'Region is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;
    if (cart.length === 0) {
      setServerError('Your cart is empty.');
      return;
    }

    setSubmitting(true);

    try {
      const orderData = {
        items: cart.map((item) => ({
          id: item.id,
          quantity: item.quantity,
        })),
        address: form.address,
        phone: form.phone,
        paymentMethod: form.paymentMethod,
        fullName: form.fullName,
        email: form.email,
        city: form.city,
        region: form.region,
        postalCode: form.postalCode,
      };

      const response = await api.post('/buyer/orders', orderData);
      
      if (response.status === 201 || response.status === 200) {
        clearCart();
        setServerError('');
        navigate('/buyer/orders');
      }
    } catch (error) {
      console.error('Order error:', error);
      
      // Extract detailed error message
      let errorMsg = 'Failed to place order. Please try again.';
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        const data = error.response.data;
        if (data.message) {
          errorMsg = data.message;
        }
        if (data.error) {
          errorMsg += `\n\nError: ${data.error}`;
        }
        if (data.stack && process.env.NODE_ENV === 'development') {
          errorMsg += `\n\nDetails: ${data.stack}`;
        }
        // If response has validation errors (like missing products)
        if (data.errors && Array.isArray(data.errors)) {
          errorMsg += '\n\n' + data.errors.map(e => `- ${e.msg}`).join('\n');
        }
      } else if (error.request) {
        // The request was made but no response was received
        errorMsg = 'No response from server. Please check your connection.';
      } else {
        // Something happened in setting up the request that triggered an Error
        errorMsg = error.message;
      }
      
      setServerError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (serverError) setServerError('');
  };

  const paymentMethods = [
    { id: 'mobile_money', label: 'Mobile Money', icon: <FaMobileAlt /> },
    { id: 'card', label: 'Credit / Debit Card', icon: <FaCreditCard /> },
    { id: 'cash', label: 'Cash on Delivery', icon: <FaMoneyBillWave /> },
  ];

  return (
    <BuyerLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Checkout</h1>
          <p className={styles.subtitle}>Review your order and complete payment</p>
        </header>

        {cart.length === 0 ? (
          <div className={styles.emptyState}>
            <p>Your cart is empty.</p>
            <Link to="/buyer/home" className={styles.shopBtn}>Continue Shopping</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.checkoutLayout}>
            <div className={styles.leftColumn}>
              {/* Shipping Information */}
              <div className={styles.card}>
                <h2 className={styles.cardTitle}>Shipping Information</h2>
                {serverError && (
                  <div className={styles.serverError}>
                    <strong>Error:</strong> {serverError}
                  </div>
                )}
                <div className={styles.formGrid}>
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Full Name *</label>
                    <input
                      type="text"
                      name="fullName"
                      className={`${styles.input} ${errors.fullName ? styles.inputError : ''}`}
                      value={form.fullName}
                      onChange={handleChange}
                      placeholder="Your full name"
                      disabled={submitting}
                    />
                    {errors.fullName && <p className={styles.errorText}>{errors.fullName}</p>}
                  </div>
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Email *</label>
                    <input
                      type="email"
                      name="email"
                      className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                      value={form.email}
                      onChange={handleChange}
                      placeholder="you@example.com"
                      disabled={submitting}
                    />
                    {errors.email && <p className={styles.errorText}>{errors.email}</p>}
                  </div>
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Phone Number *</label>
                    <input
                      type="tel"
                      name="phone"
                      className={`${styles.input} ${errors.phone ? styles.inputError : ''}`}
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="+255 700 000 000"
                      disabled={submitting}
                    />
                    {errors.phone && <p className={styles.errorText}>{errors.phone}</p>}
                  </div>
                  <div className={styles.inputGroupFull}>
                    <label className={styles.label}>Address Line *</label>
                    <input
                      type="text"
                      name="address"
                      className={`${styles.input} ${errors.address ? styles.inputError : ''}`}
                      value={form.address}
                      onChange={handleChange}
                      placeholder="Street, building, apartment"
                      disabled={submitting}
                    />
                    {errors.address && <p className={styles.errorText}>{errors.address}</p>}
                  </div>
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>City *</label>
                    <input
                      type="text"
                      name="city"
                      className={`${styles.input} ${errors.city ? styles.inputError : ''}`}
                      value={form.city}
                      onChange={handleChange}
                      placeholder="e.g. Dar es Salaam"
                      disabled={submitting}
                    />
                    {errors.city && <p className={styles.errorText}>{errors.city}</p>}
                  </div>
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Region *</label>
                    <input
                      type="text"
                      name="region"
                      className={`${styles.input} ${errors.region ? styles.inputError : ''}`}
                      value={form.region}
                      onChange={handleChange}
                      placeholder="e.g. Kinondoni"
                      disabled={submitting}
                    />
                    {errors.region && <p className={styles.errorText}>{errors.region}</p>}
                  </div>
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Postal Code</label>
                    <input
                      type="text"
                      name="postalCode"
                      className={styles.input}
                      value={form.postalCode}
                      onChange={handleChange}
                      placeholder="e.g. 14111"
                      disabled={submitting}
                    />
                  </div>
                  <div className={styles.inputGroup} style={{ justifyContent: 'flex-start' }}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        name="saveAddress"
                        checked={form.saveAddress}
                        onChange={handleChange}
                        disabled={submitting}
                      />
                      Save this address for future orders
                    </label>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className={styles.card}>
                <h2 className={styles.cardTitle}>Payment Method</h2>
                <div className={styles.paymentOptions}>
                  {paymentMethods.map((method) => (
                    <label key={method.id} className={styles.paymentOption}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={method.id}
                        checked={form.paymentMethod === method.id}
                        onChange={handleChange}
                        disabled={submitting}
                      />
                      <span className={styles.paymentIcon}>{method.icon}</span>
                      <span>{method.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className={styles.rightColumn}>
              <div className={styles.summaryCard}>
                <h2 className={styles.cardTitle}>Order Summary</h2>
                <div className={styles.cartItems}>
                  {cart.map((item) => (
                    <div key={item.id} className={styles.summaryItem}>
                      <div className={styles.summaryItemInfo}>
                        <span className={styles.summaryItemName}>{item.name}</span>
                        <span className={styles.summaryItemQty}>× {item.quantity}</span>
                      </div>
                      <span className={styles.summaryItemPrice}>
                        TSh {Number(item.price * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
                <div className={styles.summaryDivider} />
                <div className={styles.summaryRow}>
                  <span>Subtotal</span>
                  <span>TSh {subtotal.toLocaleString()}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span>Shipping</span>
                  <span>TSh {shipping.toLocaleString()}</span>
                </div>
                <div className={styles.summaryDivider} />
                <div className={`${styles.summaryRow} ${styles.totalRow}`}>
                  <span>Total</span>
                  <span>TSh {total.toLocaleString()}</span>
                </div>
                <button
                  type="submit"
                  className={styles.placeOrderBtn}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <FaSpinner className={styles.spinnerIcon} /> Placing Order...
                    </>
                  ) : (
                    'Place Order'
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </BuyerLayout>
  );
}