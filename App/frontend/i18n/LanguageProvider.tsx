/** Interface language, dictionary helpers, and a shared React state provider. */
import { useState, createContext, useContext, type ReactNode } from 'react';

import { messages } from './messages';
export { messages } from './messages';

/** Supported interface languages; user-entered event content is not translated. */
export type Language = 'en' | 'zh';

/** Native display labels paired with the codes understood by the UI. */
export type LanguageOption = { value: Language; label: string };

export const languageOptions: LanguageOption[] = [
  { value: 'en', label: 'English' },
  { value: 'zh', label: '简体中文' },
];

const locales = { en: 'en-US', zh: 'zh-CN' } as const;

/**
 * Check a saved or selected value before accepting it as a language.
 * @returns Whether the value is a supported code.
 */
export function isLanguage(value: unknown): value is Language {
  // Object.hasOwn(A, B) asks whether object A has an attribute called B.
  return typeof value === 'string' && Object.hasOwn(locales, value);
}

/**
 * Resolve the browser formatting locale for an explicit language.
 * @returns en-US for English or zh-CN for simplified Chinese.
 */
export function getLocale(language: Language) {
  return locales[language];
}

/**
 * Look up UI text and fill named placeholders; user values remain untranslated.
 * Missing translations use the English key, and missing values retain their token.
 * @param values - Values for {name} tokens; numbers follow the selected locale.
 * @returns Translated text with supplied placeholders replaced.
 */
export function translate(
  language: Language,
  message: string,
  values: Record<string, string | number> = {},
) {
  const translated = language === 'en' ? message : (messages[message] ?? message);
  return translated.replace(
    /\{(\w+)\}/g,
    // Format supplied numbers and preserve unresolved placeholders.
    (placeholder, key: string) =>
      typeof values[key] === 'number'
        ? new Intl.NumberFormat(getLocale(language)).format(values[key])
        : String(values[key] ?? placeholder),
  );
}

/** Shared language and operations exposed to the provider's descendants. */
type LanguageContextValue = {
  language: Language;
  locale: string;
  setLanguage: (next: Language) => void;
  t: (msg: string, vals?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

/**
 * Function component owning one shared language state for this page.
 * Normal app entry starts in English; refreshing or reopening resets the choice.
 * @param initialLanguage - Initial value for tests or server-rendered trees;
 * changing the prop does not reset a mounted provider's selection.
 * @returns Children sharing this page's language, without a new DOM wrapper.
 */
export function LanguageProvider({
  children,
  initialLanguage = 'en',
}: {
  children: ReactNode;
  initialLanguage?: Language;
}) {
  const [language, updateLanguage] = useState<Language>(initialLanguage);

  /** Update React state for supported codes; nothing is written to storage. */
  function setLanguage(next: Language) {
    if (isLanguage(next)) {
      updateLanguage(next);
    }
  }

  const value: LanguageContextValue = {
    language,
    locale: getLocale(language),
    setLanguage,
    t: (msg, vals?) => translate(language, msg, vals),
  };
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

/**
 * Read the closest provider so consumers follow the same page's language.
 * @returns The current language, locale, translator, and language setter.
 * @throws When a consumer has no enclosing LanguageProvider.
 */
export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) {
    throw new Error('useLanguage must be used inside LanguageProvider');
  }
  return value;
}
