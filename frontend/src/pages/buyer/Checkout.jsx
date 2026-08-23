import { useEffect, useState } from 'react';
import { useCart } from '../../context/CartContext';
import { useUser } from '../../context/UserContext';
import BuyerLayout from './BuyerLayout';
import { Link } from 'react-router-dom';
import { FaCheckCircle, FaMobileAlt, FaSpinner } from 'react-icons/fa';
import api from '../../services/api';
import styles from './Checkout.module.css';

export default function Checkout() {
  const { cart, clearCart } = useCart();
  const { user } = useUser();

  const [form, setForm] = useState({
    fullName: user?.name || '',
    email: user?.email || '',
    phone: '',
    address: '',
    city: '',
    region: '',
    postalCode: '',
    paymentMethod: 'mobile_money',
    paymentProvider: 'mpesa',
    saveAddress: false,
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [orderSuccess, setOrderSuccess] = useState(null);

  useEffect(() => {
    if (!user) return;
    setForm((current) => ({
      ...current,
      fullName: current.fullName || user.name || '',
      email: current.email || user.email || '',
      phone: current.phone || user.phone || '',
      address: current.address || user.address || '',
    }));
  }, [user]);

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
        paymentProvider: form.paymentProvider,
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
        setOrderSuccess(response.data.orderId || true);
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
        if (data.stack && import.meta.env.DEV) {
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

  const mobileProviders = ['M-Pesa', 'Tigo Pesa', 'Airtel Money', 'HaloPesa'];

  return (
    <BuyerLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Checkout</h1>
          <p className={styles.subtitle}>Enter your delivery details and confirm your payment method.</p>
          <ol className={styles.steps} aria-label="Checkout progress">
            <li className={styles.stepActive}><span>1</span>Delivery details</li>
            <li><span>2</span>Payment method</li>
            <li><span>3</span>Place order</li>
          </ol>
        </header>

        {orderSuccess ? (
          <div className={styles.successState} role="status">
            <FaCheckCircle className={styles.successIcon} />
            <h2>Order placed successfully</h2>
            <p>Your order has been received and is being processed.</p>
            {orderSuccess !== true && <p className={styles.orderReference}>Order #{orderSuccess}</p>}
            <Link to="/buyer/orders" className={styles.shopBtn}>View My Orders</Link>
          </div>
        ) : cart.length === 0 ? (
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
                    <label htmlFor="fullName" className={styles.label}>Full Name *</label>
                    <input
                      id="fullName"
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
                    <label htmlFor="email" className={styles.label}>Email *</label>
                    <input
                      id="email"
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
                    <label htmlFor="phone" className={styles.label}>Phone Number *</label>
                    <input
                      id="phone"
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
                    <label htmlFor="address" className={styles.label}>Address Line *</label>
                    <input
                      id="address"
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
                    <label htmlFor="city" className={styles.label}>City *</label>
                    <input
                      id="city"
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
                    <label htmlFor="region" className={styles.label}>Region *</label>
                    <input
                      id="region"
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
                    <label htmlFor="postalCode" className={styles.label}>Postal Code</label>
                    <input
                      id="postalCode"
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
                  <div className={styles.paymentOption}>
                    <span className={styles.paymentIcon}><FaMobileAlt /></span>
                    <span>Mobile Money</span>
                  </div>
                  <div className={styles.inputGroup}>
                    <label htmlFor="paymentProvider" className={styles.label}>Mobile Money Provider</label>
                    <select
                      id="paymentProvider"
                      name="paymentProvider"
                      className={styles.input}
                      value={form.paymentProvider}
                      onChange={handleChange}
                      disabled={submitting}
                    >
                      {mobileProviders.map((provider) => (
                        <option key={provider} value={provider.toLowerCase().replaceAll(' ', '_')}>
                          {provider}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className={styles.paymentNumber}>
                  <span>Pay to system number</span>
                  <strong>0785898551</strong>
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