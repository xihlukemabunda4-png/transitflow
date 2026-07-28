'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { dictionaries, LANGUAGES, type Language } from './dictionaries';

const STORAGE_KEY = 'transitflow.language';

interface I18nContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && (LANGUAGES as readonly string[]).includes(stored)) {
      setLanguageState(stored as Language);
    }
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    window.localStorage.setItem(STORAGE_KEY, lang);
    setLanguageState(lang);
  }, []);

  const t = useCallback((key: string) => dictionaries[language][key] ?? dictionaries.en[key] ?? key, [language]);

  return <I18nContext.Provider value={{ language, setLanguage, t }}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
