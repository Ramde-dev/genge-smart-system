import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MdAccountBalanceWallet, MdCheckCircle, MdEco, MdExpandMore, MdInventory2,
  MdLocalShipping, MdLock, MdSearch, MdSchedule, MdSecurity,
  MdStorefront, MdArrowForward, MdChevronLeft, MdChevronRight,
} from 'react-icons/md';
import api from '../services/api';
import styles from './MarketplaceLanding.module.css';
import MarketplaceFooter from '../components/common/MarketplaceFooter';

const fallbackCategories = ['Fresh Produce', 'Groceries', 'Home & Kitchen', 'Beauty', 'Fashion', 'Electronics'].map((name) => ({ name, product_count: null }));
const steps = [
  { icon: MdSearch, title: 'Find what you need', text: 'Search products from local sellers in one convenient marketplace.' },
  { icon: MdCheckCircle, title: 'Choose with confidence', text: 'Compare prices, seller details, availability, and quality.' },
  { icon: MdLocalShipping, title: 'Order and track', text: 'Place your order and follow delivery progress from checkout to doorstep.' },
];
const benefits = [
  { icon: MdSecurity, title: 'Trusted sellers', text: 'Seller information helps you make informed buying decisions.' },
  { icon: MdAccountBalanceWallet, title: 'Simple payments', text: 'Clear checkout instructions and transparent order totals.' },
  { icon: MdSchedule, title: 'Reliable delivery', text: 'Track your order status with updates along the way.' },
  { icon: MdEco, title: 'Local selection', text: 'Discover quality goods from businesses close to you.' },
];
const faqs = [
  ['What is GengeSmart?', 'GengeSmart connects buyers with local sellers so they can discover products, place orders, and track deliveries in one place.'],
  ['How do I start shopping?', 'Create a buyer account, browse the marketplace, add products to your cart, and continue to checkout.'],
  ['How can I become a seller?', 'Choose Become a Seller to create an account and start building your product catalogue.'],
  ['Can I track my order?', 'Yes. Signed-in buyers can use the Tracking area to follow delivery updates.'],
];

export default function MarketplaceLanding() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(fallbackCategories);
  const [query, setQuery] = useState('');
  const [openFaq, setOpenFaq] = useState(0);
  const [loading, setLoading] = useState(true);
  const [marketIndex, setMarketIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    api.get('/buyer/products').then((productResponse) => {
      const productData = productResponse.data || [];
      setProducts(productData);
      const counts = productData.reduce((result, product) => {
        if (product.category) result[product.category] = (result[product.category] || 0) + 1;
        return result;
      }, {});
      if (Object.keys(counts).length) {
        setCategories(Object.entries(counts).map(([name, product_count]) => ({ name, product_count })));
      }
    }).catch(() => {}).finally(() => setLoading(false));

    api.get('/buyer/categories').then(({ data }) => {
      const categoryData = data?.categories || data || [];
      if (categoryData.length) setCategories(categoryData.map((item) => typeof item === 'string' ? { name: item, product_count: null } : item));
    }).catch(() => {});
  }, []);

  const searchMarketplace = (event) => {
    event.preventDefault();
    navigate('/buyer/home', { state: { search: query.trim() } });
  };

  const getCategoryImage = (categoryName, categoryIndex) => {
    const matchingProduct = products.find((product) => product.category === categoryName && product.imageUrl);
    if (matchingProduct) return matchingProduct.imageUrl;
    const productsWithImages = products.filter((product) => product.imageUrl);
    return productsWithImages.length ? productsWithImages[categoryIndex % productsWithImages.length].imageUrl : null;
  };

  const marketProducts = products.filter((product) => product.imageUrl);
  const marketProduct = marketProducts.length ? marketProducts[marketIndex % marketProducts.length] : null;

  useEffect(() => {
    if (marketProducts.length < 2) return undefined;
    const rotation = setInterval(() => {
      setMarketIndex((index) => (index + 1) % marketProducts.length);
    }, 5000);
    return () => clearInterval(rotation);
  }, [marketProducts.length]);

  useEffect(() => {
    const rotation = setInterval(() => {
      setStepIndex((index) => (index + 1) % steps.length);
    }, 4500);
    return () => clearInterval(rotation);
  }, []);

  const ActiveStepIcon = steps[stepIndex].icon;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to="/" className={styles.brand}><span className={styles.brandMark}>G</span>Genge<span className={styles.brandAccent}>Smart</span></Link>
        <nav className={styles.nav} aria-label="Main navigation">
          <a href="#categories">Categories</a><a href="#products">Products</a><a href="#how-it-works">How it works</a><a href="#about">About</a>
        </nav>
        <div className={styles.headerActions}><Link to="/login" className={styles.loginLink}>Sign in</Link><Link to="/register" className={styles.headerCta}>Join GengeSmart <MdArrowForward aria-hidden="true" /></Link></div>
      </header>

      <main>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.kicker}>LOCAL SHOPPING, MADE SIMPLE</p>
            <h1>Everything you need, from sellers you can trust.</h1>
            <p className={styles.heroText}>Discover quality products, compare your options, and get convenient delivery through one reliable marketplace.</p>
            <form className={styles.searchForm} onSubmit={searchMarketplace}>
              <MdSearch aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="What are you looking for?" aria-label="Search marketplace" /><button type="submit">Search</button>
            </form>
            <div className={styles.heroActions}><Link to="/buyer/home" className={styles.primaryButton}>Start shopping <MdArrowForward aria-hidden="true" /></Link><Link to="/register" className={styles.secondaryButton}>Become a seller</Link></div>
            <div className={styles.trustRow}><span><MdSecurity /> Trusted sellers</span><span><MdLock /> Secure checkout</span><span><MdLocalShipping /> Order tracking</span></div>
          </div>
          <div className={styles.heroVisual} aria-label="GengeSmart marketplace highlights">
            <div className={styles.visualPanel}>{marketProduct && <img key={marketProduct.id || marketProduct.imageUrl} className={styles.marketImage} src={marketProduct.imageUrl} alt={marketProduct.name} />}<div className={styles.visualContent}><span className={styles.visualEyebrow}>TODAY'S MARKET</span><strong>Fresh choices.<br />Fair prices.</strong><div className={styles.visualDetails}><div className={styles.visualLine}>Curated local selection</div><div className={styles.visualLine}>Delivered to your doorstep</div></div></div></div>
            <div className={styles.floatingCard}><MdStorefront /><span><b>Local stores</b><small>One marketplace</small></span></div>
          </div>
        </section>

        <section className={styles.section} id="categories"><div className={styles.sectionHeader}><div><p className={styles.kicker}>BROWSE WITH EASE</p><h2>Explore popular categories</h2></div></div><div className={styles.categoryGrid}>{categories.slice(0, 6).map((category, categoryIndex) => { const imageUrl = getCategoryImage(category.name, categoryIndex); return <Link key={category.name} to="/buyer/home" state={{ category: category.name }} className={styles.categoryCard}>{imageUrl ? <img className={styles.categoryImage} src={imageUrl} alt={`${category.name} products`} /> : <span className={styles.categoryIcon}><MdInventory2 /></span>}<span className={styles.categoryOverlay} /><span className={styles.categoryContent}><strong>{category.name}</strong><small>{category.product_count ? `${category.product_count} products` : 'Explore selection'} <MdArrowForward /></small></span></Link>; })}</div></section>

        <section className={`${styles.section} ${styles.productSection}`} id="products"><div className={styles.sectionHeader}><div><p className={styles.kicker}>A SMARTER WAY TO SHOP</p><h2>Featured from the marketplace</h2></div></div>{loading ? <div className={styles.loading}>Loading marketplace picks...</div> : products.length ? <div className={styles.productGrid}>{products.slice(0, 4).map((product) => <Link to={`/buyer/product/${product.id}`} state={{ productId: product.id }} className={styles.productCard} key={product.id}><div className={styles.productImage}>{product.imageUrl ? <img src={product.imageUrl} alt={product.name} /> : <MdInventory2 />}</div><div className={styles.productInfo}><small>{product.category || 'Marketplace pick'}</small><h3>{product.name}</h3><strong>TSh {Number(product.price || 0).toLocaleString()}</strong><span>{product.seller_name || 'Local seller'} <MdCheckCircle /></span></div></Link>)}</div> : <div className={styles.empty}>New marketplace products are arriving soon. <Link to="/register">Join GengeSmart</Link> to get updates.</div>}</section>

        <section className={styles.section} id="how-it-works"><div className={styles.centerHeader}><p className={styles.kicker}>HOW IT WORKS</p><h2>From discovery to delivery</h2><p>Everything is designed to make buying locally feel clear, convenient, and dependable.</p></div><div className={styles.stepSlider}><div className={styles.step} key={steps[stepIndex].title}><span className={styles.stepNumber}>0{stepIndex + 1}</span><ActiveStepIcon className={styles.stepIcon} /><h3>{steps[stepIndex].title}</h3><p>{steps[stepIndex].text}</p></div><div className={styles.stepControls}><button type="button" aria-label="Previous step" onClick={() => setStepIndex((stepIndex - 1 + steps.length) % steps.length)}><MdChevronLeft /></button><div className={styles.stepDots}>{steps.map(({ title }, index) => <button type="button" key={title} aria-label={`Show step ${index + 1}`} aria-current={stepIndex === index ? 'step' : undefined} onClick={() => setStepIndex(index)} />)}</div><button type="button" aria-label="Next step" onClick={() => setStepIndex((stepIndex + 1) % steps.length)}><MdChevronRight /></button></div></div></section>

        <section className={styles.benefitBand} id="about"><div className={styles.sectionHeader}><div><p className={styles.kicker}>WHY GENGESMART</p><h2>A marketplace built around confidence.</h2></div><p className={styles.bandIntro}>Whether you are buying for home or growing a business, the essentials should be easy to find and simple to manage.</p></div><div className={styles.benefitGrid}>{benefits.map(({ icon: Icon, title, text }) => <article className={styles.benefit} key={title}><Icon /><h3>{title}</h3><p>{text}</p></article>)}</div></section>

        <section className={styles.sellerCta}><div><p className={styles.kicker}>FOR LOCAL BUSINESSES</p><h2>Turn your products into a growing business.</h2><p>Set up your seller account, reach more customers, and manage orders from one focused platform.</p><Link to="/register" className={styles.primaryButton}>Become a seller <MdArrowForward aria-hidden="true" /></Link></div></section>

        <section className={styles.faqSection}><div className={styles.centerHeader}><p className={styles.kicker}>NEED TO KNOW</p><h2>Frequently asked questions</h2></div><div className={styles.faqList}>{faqs.map(([question, answer], index) => <div className={styles.faqItem} key={question}><button onClick={() => setOpenFaq(openFaq === index ? -1 : index)} aria-expanded={openFaq === index}>{question}<MdExpandMore /></button>{openFaq === index && <p>{answer}</p>}</div>)}</div></section>
      </main>

      <MarketplaceFooter />
    </div>
  );
}
