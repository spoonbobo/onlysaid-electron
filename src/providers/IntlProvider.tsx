import React, { createContext, useState, useContext, useEffect } from 'react';
import { IntlProvider as ReactIntlProvider } from 'react-intl';

// Import messages for different languages
import enMessages from '../locales/en.json';
import esMessages from '../locales/es.json';
import frMessages from '../locales/fr.json';
import zhHKMessages from '../locales/zh-hk.json';

// Type for supported locales
export type Locale = 'en' | 'es' | 'fr' | 'zh-hk';

// Messages by locale
const messages: Record<Locale, Record<string, string>> = {
  en: enMessages,
  es: esMessages,
  fr: frMessages,
  'zh-hk': zhHKMessages,
};

// Context to manage locale
interface IntlContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  availableLocales: Locale[];
}

const IntlContext = createContext<IntlContextType>({
  locale: 'en',
  setLocale: () => { },
  availableLocales: ['en', 'es', 'fr', 'zh-hk'],
});

// Custom hook to use the Intl context
export const useIntl = () => useContext(IntlContext);

// Provider component
export function IntlProvider({ children }: { children: React.ReactNode }) {
  // Get saved locale from localStorage or default to browser language
  const getBrowserLocale = (): Locale => {
    const browserLocale = navigator.language.split('-')[0];
    return (browserLocale as Locale) in messages ? (browserLocale as Locale) : 'en';
  };

  const getSavedLocale = (): Locale => {
    try {
      const savedLocale = localStorage.getItem('locale') as Locale;
      return savedLocale && savedLocale in messages ? savedLocale : getBrowserLocale();
    } catch (e) {
      return getBrowserLocale();
    }
  };

  const [locale, setLocaleState] = useState<Locale>(getSavedLocale());

  // Save locale to localStorage when it changes
  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem('locale', newLocale);
    } catch (e) {
      console.error('Failed to save locale to localStorage', e);
    }
  };

  // Update document language attribute when locale changes
  useEffect(() => {
    document.documentElement.setAttribute('lang', locale);
  }, [locale]);

  const value = {
    locale,
    setLocale,
    availableLocales: Object.keys(messages) as Locale[],
  };

  return (
    <IntlContext.Provider value={value}>
      <ReactIntlProvider
        locale={locale}
        messages={messages[locale]}
        defaultLocale="en"
      >
        {children}
      </ReactIntlProvider>
    </IntlContext.Provider>
  );
}