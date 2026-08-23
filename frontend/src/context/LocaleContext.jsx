import { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';

const LocaleContext = createContext(null);

const translations = {
  en: {
    home: 'Home', dashboard: 'Dashboard', settings: 'Settings', profile: 'Profile',
    orders: 'Orders', tracking: 'Tracking', addresses: 'Addresses', notifications: 'Notifications',
    cart: 'Cart', logout: 'Logout', appearance: 'Appearance', language: 'Language', theme: 'Theme',
    light: 'Light', dark: 'Dark', system: 'System Default', saveChanges: 'Save Changes',
    saving: 'Saving...', preferencesSaved: 'Preferences saved successfully.',
    settingsDescription: 'Personalize your GengeSmart experience.', chooseTheme: 'Choose your preferred theme.',
    chooseLanguage: 'Choose your preferred language.', marketplace: 'Marketplace', becomeSeller: 'Become a seller',
    contactSupport: 'Contact support', deliveryHelp: 'Delivery help',
  },
  sw: {
    home: 'Nyumbani', dashboard: 'Dashibodi', settings: 'Mipangilio', profile: 'Wasifu',
    orders: 'Maagizo', tracking: 'Ufuatiliaji', addresses: 'Anwani', notifications: 'Arifa',
    cart: 'Kikapu', logout: 'Toka', appearance: 'Mwonekano', language: 'Lugha', theme: 'Mandhari',
    light: 'Mwanga', dark: 'Giza', system: 'Chaguo la mfumo', saveChanges: 'Hifadhi mabadiliko',
    saving: 'Inahifadhi...', preferencesSaved: 'Mipangilio imehifadhiwa.',
    settingsDescription: 'Binafsisha matumizi yako ya GengeSmart.', chooseTheme: 'Chagua mandhari unayopendelea.',
    chooseLanguage: 'Chagua lugha unayopendelea.', marketplace: 'Soko', becomeSeller: 'Kuwa muuzaji',
    contactSupport: 'Wasiliana na msaada', deliveryHelp: 'Msaada wa usafirishaji',
  },
};

export function LocaleProvider({ children }) {
  const [language, setLanguage] = useState(() => localStorage.getItem('uiLanguage') || 'en');
  const [loadedForToken, setLoadedForToken] = useState(null);
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token || loadedForToken === token) return;
    api.get('/preferences')
      .then(({ data }) => {
        if (translations[data.language]) {
          setLanguage(data.language);
          localStorage.setItem('uiLanguage', data.language);
        }
      })
      .catch(() => {})
      .finally(() => setLoadedForToken(token));
  }, [token, loadedForToken]);

  useEffect(() => {
    localStorage.setItem('uiLanguage', language);
  }, [language]);

  const t = (key) => translations[language]?.[key] || translations.en[key] || key;

  return (
    <LocaleContext.Provider value={{ language, setLanguage, t, translations }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
