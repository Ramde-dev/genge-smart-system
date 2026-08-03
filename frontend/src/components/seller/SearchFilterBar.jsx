import { useState, useEffect } from 'react';
import { HiOutlineSearch, HiOutlineFilter } from 'react-icons/hi';
import api from '../../services/api';
import styles from './SearchFilterBar.module.css';

export default function SearchFilterBar({ onSearch, onCategoryChange }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/seller/categories');
      
      // Handle different response formats
      let categoriesData = [];
      if (response.data.categories) {
        categoriesData = response.data.categories;
      } else if (Array.isArray(response.data)) {
        categoriesData = response.data;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        categoriesData = response.data.data;
      }
      
      setCategories(categoriesData);
    } catch (err) {
      console.error("Error fetching categories:", err);
      setError('Failed to load categories');
      
      // If 403, user might not be authenticated - try without auth
      if (err.response?.status === 403) {
        try {
          const fallbackResponse = await api.get('/seller/categories');
          let fallbackData = [];
          if (fallbackResponse.data.categories) {
            fallbackData = fallbackResponse.data.categories;
          } else if (Array.isArray(fallbackResponse.data)) {
            fallbackData = fallbackResponse.data;
          }
          setCategories(fallbackData);
          setError(null);
        } catch (fallbackErr) {
          console.error('Fallback categories error:', fallbackErr);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value) => {
    setSearchTerm(value);
    if (onSearch) {
      onSearch(value);
    }
  };

  const handleCategoryChange = (value) => {
    setSelectedCategory(value);
    if (onCategoryChange) {
      onCategoryChange(value);
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    if (onSearch) {
      onSearch('');
    }
  };

  return (
    <div className={styles.container}>
      {/* Search Input */}
      <div className={styles.searchWrapper}>
        <HiOutlineSearch className={styles.searchIcon} size={20} />
        <input
          type="text"
          placeholder="Search by product name..."
          className={styles.searchInput}
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
        />
        {searchTerm && (
          <button
            className={styles.clearBtn}
            onClick={handleClearSearch}
            type="button"
          >
            ×
          </button>
        )}
      </div>

      {/* Category Filter */}
      <div className={styles.filterWrapper}>
        <select 
          className={styles.filterSelect}
          onChange={(e) => handleCategoryChange(e.target.value)}
          value={selectedCategory}
          disabled={loading}
        >
          <option value="">
            {loading ? "Loading..." : error ? "Error loading" : "All Categories"}
          </option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </option>
          ))}
        </select>
        <HiOutlineFilter className={styles.filterIcon} size={20} />
        {error && <span className={styles.errorText}>⚠️</span>}
      </div>
    </div>
  );
}