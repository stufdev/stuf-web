'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  getLanguageLocale,
  isAppLanguage,
  LANGUAGE_STORAGE_KEY,
  translateUiText,
  type AppLanguage,
} from './i18n';

type LanguageContextValue = {
  language: AppLanguage;
  locale: string;
  setLanguage: (value: AppLanguage) => void;
  t: (text: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readLanguageFromDocument(): AppLanguage | null {
  if (typeof document === 'undefined') return null;

  const documentLanguage = document.documentElement.dataset.language;
  return isAppLanguage(documentLanguage) ? documentLanguage : null;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<AppLanguage>(() => {
    if (typeof window === 'undefined') return 'en';

    return (
      readLanguageFromDocument() ??
      (() => {
        const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
        return isAppLanguage(storedLanguage) ? storedLanguage : 'en';
      })()
    );
  });

  useEffect(() => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.dataset.language = language;
    document.documentElement.lang = language === 'es' ? 'es' : 'en';
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      locale: getLanguageLocale(language),
      setLanguage,
      t: (text: string) => translateUiText(language, text),
    }),
    [language],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);

  if (!value) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }

  return value;
}
