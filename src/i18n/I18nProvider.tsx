import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import type { Lang } from '../types';
import { ca, en, es, type MessageKey } from './messages';

export const LANGUAGES: Array<{ id: Lang; label: string; short: string }> = [
  { id: 'ca', label: 'Català', short: 'CA' },
  { id: 'es', label: 'Castellano', short: 'ES' },
  { id: 'en', label: 'English', short: 'EN' },
];

export const LOCALES: Record<Lang, string> = {
  ca: 'ca-ES',
  es: 'es-ES',
  en: 'en-GB',
};

const dictionaries: Record<Lang, Record<MessageKey, string>> = { ca, es, en };

export type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string;

interface I18nValue {
  lang: Lang;
  locale: string;
  setLang: (lang: Lang) => void;
  t: Translate;
}

const I18nContext = createContext<I18nValue | null>(null);

interface ProviderProps {
  lang: Lang;
  setLang: (lang: Lang) => void;
  children: ReactNode;
}

export function I18nProvider({ lang, setLang, children }: ProviderProps) {
  const locale = LOCALES[lang];

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const t = useCallback<Translate>(
    (key, vars) => {
      let text = dictionaries[lang][key] ?? ca[key] ?? key;
      if (vars) {
        for (const [name, value] of Object.entries(vars)) {
          text = text.replaceAll(`{${name}}`, String(value));
        }
      }
      return text;
    },
    [lang],
  );

  const value = useMemo<I18nValue>(() => ({ lang, locale, setLang, t }), [lang, locale, setLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside I18nProvider');
  return value;
}

/** Plural-aware counters shared across screens ("1 member" / "2 members"). */
export function useCounts() {
  const { t } = useI18n();
  return {
    members: (count: number) => t(count === 1 ? 'memberOne' : 'membersCount', { count }),
    expenses: (count: number) => t(count === 1 ? 'expenseOne' : 'expensesCount', { count }),
  };
}
