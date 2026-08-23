import { Link } from 'react-router-dom';
import { FaEnvelope } from 'react-icons/fa';
import styles from './MarketplaceFooter.module.css';

export default function MarketplaceFooter({ compact = false }) {
  if (compact) {
    return (
      <footer className={`${styles.footer} ${styles.compact}`}>
        <div className={styles.compactInner}>
          <span>© {new Date().getFullYear()} GengeSmart</span>
          <span>Built for buyers and local businesses.</span>
        </div>
      </footer>
    );
  }

  return (
    <footer className={styles.footer}>
      <div className={styles.footerTop}>
        <div>
          <Link to="/" className={styles.footerBrand}>Genge<span>Smart</span></Link>
          <p>A trusted local marketplace for better everyday shopping.</p>
        </div>
        <div>
          <h3>Marketplace</h3>
          <Link to="/buyer/home">Browse products</Link>
          <a href="/#categories">Categories</a>
          <a href="/#how-it-works">How it works</a>
        </div>
        <div>
          <h3>For sellers</h3>
          <Link to="/register">Become a seller</Link>
          <Link to="/login">Seller sign in</Link>
          <Link to="/register">Create an account</Link>
        </div>
        <div>
          <h3>Support</h3>
          <a href="mailto:ramdedev0@gmail.com"><FaEnvelope /> ramdedev0@gmail.com</a>
          <a href="tel:0785898551">0785898551</a>
          <Link to="/buyer/home">Track an order</Link>
        </div>
      </div>
      <div className={styles.footerBottom}>
        <span>© {new Date().getFullYear()} GengeSmart</span>
        <span>Built for buyers and local businesses.</span>
      </div>
    </footer>
  );
}
