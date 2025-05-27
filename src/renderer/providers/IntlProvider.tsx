import React, { createContext, useState, useContext, useEffect } from 'react';
import { IntlProvider as ReactIntlProvider } from 'react-intl';

import enMessages from '@/locales/en.json';
import zhHKMessages from '@/locales/zh-hk.json';
import jaMessages from '@/locales/ja.json';

export type Locale = 'en' | 'zh-hk' | 'ja';

const messages: Record<Locale, Record<string, string>> = {
  en: enMessages as Record<string, string>,
  'zh-hk': zhHKMessages as Record<string, string>,
  ja: jaMessages as Record<string, string>,
};

interface IntlContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  availableLocales: Locale[];
}

const IntlContext = createContext<IntlContextType>({
  locale: 'zh-hk',
  setLocale: () => { },
  availableLocales: ['en', 'zh-hk', 'ja'],
});

export const useIntl = () => useContext(IntlContext);

export function IntlProvider({ children }: { children: React.ReactNode }) {
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

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem('locale', newLocale);
    } catch (e) {
      console.error('Failed to save locale to localStorage', e);
    }
  };

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
        defaultLocale="zh-hk"
      >
        {children}
      </ReactIntlProvider>
    </IntlContext.Provider>
  );
}