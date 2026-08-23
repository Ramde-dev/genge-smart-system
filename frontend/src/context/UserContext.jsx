import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setUser(null);
      localStorage.removeItem('user');
      localStorage.removeItem('userName');
      localStorage.removeItem('userRole');
      setLoading(false);
      return;
    }
    api
      .get('/buyer/profile')
      .then((res) => {
        setUser(res.data);
      })
      .catch(() => {
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('userName');
        localStorage.removeItem('userRole');
      })
      .finally(() => setLoading(false));
  }, []);

  const updateUser = (newData) => {
    setUser((prev) => ({ ...prev, ...newData }));
  };

  const setAuthenticatedUser = (userData) => {
    setUser(userData);
  };

  return (
    <UserContext.Provider value={{ user, loading, updateUser, setAuthenticatedUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);