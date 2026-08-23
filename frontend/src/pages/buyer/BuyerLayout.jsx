import Navbar from '../../components/common/Navbar';
import { useLocation } from 'react-router-dom';
import MarketplaceFooter from '../../components/common/MarketplaceFooter';
import styles from './BuyerLayout.module.css';

export default function BuyerLayout({ children, onSearch }) {
  const handleSearch = onSearch || (() => {});
  const { pathname } = useLocation();
  const isHomePage = pathname === '/buyer/home';

  return (
    <div className={styles.layout}>
      <Navbar onSearch={handleSearch} />
      <main className={styles.main}>
        <div className={styles.container}>
          {children}
        </div>
      </main>
      <MarketplaceFooter compact={!isHomePage} />
    </div>
  );
}