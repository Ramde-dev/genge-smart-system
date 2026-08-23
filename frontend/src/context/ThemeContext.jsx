import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import ThemeContext from './ThemeContext';

export function ThemeProvider({ children }) {
  const location = useLocation();
  const [theme, setTheme] = useState(() => localStorage.getItem('uiTheme') || 'light');
  const isAdmin = location.pathname.startsWith('/admin');
  const activeTheme = isAdmin ? 'light' : theme;

  useEffect(() => {
    document.documentElement.dataset.theme = activeTheme;
    localStorage.setItem('uiTheme', theme);
  }, [activeTheme, theme]);

  const toggleTheme = () => setTheme((current) => (current === 'light' ? 'dark' : 'light'));

  return (
    <ThemeContext.Provider value={{ theme: activeTheme, toggleTheme, isAdmin }}>
      {children}
    </ThemeContext.Provider>
  );
}
