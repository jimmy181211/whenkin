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
    Object.entries(messages).map(([key, values]) => [
      key,
      values[0],
    ]),
  ),
  es: Object.fromEntries(
    Object.entries(messages).map(([key, values]) => [
      key,
      values[1],
    ]),
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

export const isLanguage = (value: unknown): value is Language =>
  typeof value === 'string' && Object.hasOwn(locales, value);

function readLanguage(): Language {
  try {
    const value = localStorage.getItem('whenkin:language');
    return isLanguage(value) ? value : 'en';
  } catch {
    return 'en';
  }
}

let language: Language = readLanguage();
const listeners = new Set<() => void>();

export function getLanguage() {
  return language;
}

export function getLocale() {
  return locales[language];
}

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
  listeners.forEach((listener) => listener());
}

export function subscribeLanguage(listener: () => void) {
  listeners.add(listener);

  const sync = (event: StorageEvent) => {
    if (event.key === 'whenkin:language') {
      language = readLanguage();
      listeners.forEach((fn) => fn());
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', sync);
  }
  return () => {
    listeners.delete(listener);
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', sync);
    }
  };
}

export function t(
  message: string,
  values: Record<string, string | number> = {},
) {
  const translated =
    language === 'en' ? message : (translations[language][message] ?? message);
  return translated.replace(/\{(\w+)\}/g, (placeholder, key: string) =>
    typeof values[key] === 'number'
      ? new Intl.NumberFormat(getLocale()).format(values[key])
      : String(values[key] ?? placeholder),
  );
}
