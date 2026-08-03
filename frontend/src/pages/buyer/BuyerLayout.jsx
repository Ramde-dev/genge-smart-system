import Navbar from '../../components/common/Navbar';
import styles from './BuyerLayout.module.css';

export default function BuyerLayout({ children, onSearch }) {
  const handleSearch = onSearch || (() => {});

  return (
    <div className={styles.layout}>
      <Navbar onSearch={handleSearch} />
      <main className={styles.main}>
        <div className={styles.container}>
          {children}
        </div>
      </main>
      {/* Optional footer – remove if not needed */}
      <footer className={styles.footer}>
        <p>&copy; {new Date().getFullYear()} Genge Smart System. All rights reserved.</p>
      </footer>
    </div>
  );
}