import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  SupportedLanguage,
  SUPPORTED_LANGUAGES,
  LanguageOption,
  TranslationKey,
  translations,
} from '@/lib/i18n';

const LANGUAGE_STORAGE_KEY = 'fishgate_preferred_language';

interface I18nContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: TranslationKey | string, fallback?: string) => string;
  languages: LanguageOption[];
  currentLanguageOption: LanguageOption;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    try {
      const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (stored && ['en', 'rw', 'fr', 'sw'].includes(stored)) {
        return stored as SupportedLanguage;
      }
    } catch {
      // Ignore localStorage access failures
    }
    // Default to 'rw' (Ikinyarwanda) or 'en'
    return 'rw';
  });

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      document.documentElement.lang = lang;
    } catch {
      // Ignore localStorage write failures
    }
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: TranslationKey | string, fallback?: string): string => {
    const langDict = (translations[language] || translations.en) as Record<string, string>;
    if (key in langDict) {
      return langDict[key];
    }
    const enDict = translations.en as Record<string, string>;
    if (key in enDict) {
      return enDict[key];
    }
    return fallback || key;
  };

  const currentLanguageOption =
    SUPPORTED_LANGUAGES.find((opt) => opt.code === language) || SUPPORTED_LANGUAGES[0];

  return (
    <I18nContext.Provider
      value={{
        language,
        setLanguage,
        t,
        languages: SUPPORTED_LANGUAGES,
        currentLanguageOption,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
