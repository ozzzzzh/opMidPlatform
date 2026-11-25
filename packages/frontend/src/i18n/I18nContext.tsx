import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { messages, type TranslationKey } from './messages';

export type Language = 'zh' | 'en';

const LANGUAGE_KEY = 'itops_language';

interface I18nContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey, variables?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function initialLanguage(): Language {
  try {
    const stored = window.localStorage.getItem(LANGUAGE_KEY);
    if (stored === 'en' || stored === 'zh') return stored;
  } catch {
    // ignore
  }
  return 'zh';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(initialLanguage);

  useEffect(() => {
    dayjs.locale(language === 'en' ? 'en' : 'zh-cn');
    document.documentElement.lang = language === 'en' ? 'en' : 'zh-CN';
    const title = messages[language]['app.title'] ?? messages.zh['app.title'];
    document.title = title;
    try {
      window.localStorage.setItem(LANGUAGE_KEY, language);
    } catch {
      // ignore
    }
  }, [language]);

  const t = useCallback(
    (key: TranslationKey, variables?: Record<string, string | number>): string => {
      const template = messages[language][key] ?? messages.zh[key] ?? key;
      if (!variables) return template;
      return template.replace(/\{\{(\w+)\}\}/g, (_match, name: string) =>
        String(variables[name] ?? ''),
      );
    },
    [language],
  );

  const value = useMemo(() => ({ language, setLanguage, t }), [language, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}

export function currentLanguage(): Language {
  try {
    const stored = window.localStorage.getItem(LANGUAGE_KEY);
    return stored === 'en' ? 'en' : 'zh';
  } catch {
    return 'zh';
  }
}
