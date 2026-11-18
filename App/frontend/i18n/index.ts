/** Tracks the selected language and formats translated interface messages. */
import { messages } from './messages';
export { messages } from './messages';
import pt from './pt';
import de from './de';

// English is the default; Portuguese uses the Brazilian locale.
export type Language = 'en' | 'zh' | 'es' | 'pt' | 'de';
export const languageOptions: { value: Language;
  label: string }[] = [
  {
    value: 'en',
    label: 'English',
  },
  {
    value: 'zh',
    label: '简体中文',
  },
  {
    value: 'es',
    label: 'Español',
  },
  {
    value: 'pt',
    label: 'Português',
  },
  {
    value: 'de',
    label: 'Deutsch',
  },
];
export const translations: Record<
  Exclude<Language, 'en'>,
  Record<string, string>
> = {
  zh: Object.fromEntries(
    Object.entries(messages).map(
      /* Build the Chinese message lookup from the shared translation table. */
      ([key, values]) => [
        key,
        values[0],
      ],
    ),
  ),
  es: Object.fromEntries(
    Object.entries(messages).map(
      /* Build the Spanish lookup from the second translation column. */
      ([key, values]) => [
        key,
        values[1],
      ],
    ),
  ),
  pt,
  de,
};
const locales = {
  en: 'en-US',
  zh: 'zh-CN',
  es: 'es-ES',
  pt: 'pt-BR',
  de: 'de-DE',
} as const;

/**
 * Accept only language codes present in the locale registry.
 * @returns True when the value is a supported language code.
 */
export const isLanguage = (value: unknown): value is Language =>
  typeof value === 'string' && Object.hasOwn(locales, value);

/**
 * Read a supported saved language without requiring browser-storage access.
 * @returns The saved language code, or English when missing, invalid, or inaccessible.
 */
function readLanguage(): Language {
  try {
    const value = localStorage.getItem('whenkin:language');
    return isLanguage(value) ? value : 'en';
  } catch {
    return 'en';
  }
}

let language: Language = readLanguage();
// React language hooks subscribe here because this module state is outside React.
const listeners = new Set<() => void>();

/**
 * Read the selected interface language.
 * @returns The current supported language code, such as en or pt.
 */
export function getLanguage() {
  return language;
}

/**
 * Resolve the Intl locale for the current interface language.
 * @returns Its locale identifier; Portuguese uses the Brazilian pt-BR locale.
 */
export function getLocale() {
  return locales[language];
}

/** Save the supported language and notify subscribers, even if storage is blocked. */
export function setLanguage(next: Language) {
  if (!isLanguage(next) || next === language) {
    return;
  }
  language = next;
  try {
    localStorage.setItem('whenkin:language', next);
  } catch {
    /* Language switching also works without storage. */
  }
  listeners.forEach(
    /* Notify each subscriber after a local language change. */
    (listener) => listener(),
  );
}

/**
 * Subscribe to language changes in this tab and other tabs sharing its storage.
 * @returns Cleanup that removes this subscriber and its storage-event listener.
 */
export function subscribeLanguage(listener: () => void) {
  listeners.add(listener);

  /** Reload language state when another browser tab changes its stored value. */
  const sync = (event: StorageEvent) => {
    if (event.key === 'whenkin:language') {
      language = readLanguage();
      listeners.forEach(
        /* Notify the same subscribers after a cross-tab language change. */
        (fn) => fn(),
      );
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', sync);
  }
  // Remove this subscriber and its browser-storage listener.
  return () => {
    listeners.delete(listener);
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', sync);
    }
  };
}

/**
 * Translate an English message key, then replace its named placeholders.
 * Missing translations use English; missing values leave the placeholder visible.
 * @param values - Replacements for {name} tokens; numbers use the current locale.
 * @returns Localized text with supplied placeholders replaced; unresolved tokens
 * remain visible instead of becoming undefined text.
 */
export function t(
  message: string,
  values: Record<string, string | number> = {},
) {
  const translated =
    language === 'en' ? message : (translations[language][message] ?? message);
  return translated.replace(
    /\{(\w+)\}/g,
    /* Replace named placeholders, formatting numeric values in the current locale. */
    (placeholder, key: string) =>
      typeof values[key] === 'number'
        ? new Intl.NumberFormat(getLocale()).format(values[key])
        : String(values[key] ?? placeholder),
  );
}
