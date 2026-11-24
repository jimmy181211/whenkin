/** Owns the shared language preference, translations, and subscriptions. */

import { messages } from './messages';
import { useSyncExternalStore } from 'react';
export { messages } from './messages';

// English is the default; Chinese uses simplified characters.
export type Language = 'en' | 'zh';
export type LanguageOption = {
  value: Language;
  label: string;
};
export const languageOptions: LanguageOption[] = [
  {
    value: 'en',
    label: 'English',
  },
  {
    value: 'zh',
    label: '简体中文',
  },
];
const locales = {
  en: 'en-US',
  zh: 'zh-CN',
} as const;

/**
 * Language service with private preference state and subscriber management.
 * The application shares one instance; constructing another does not add listeners.
 * Callback methods are bound once so React and browser events retain this instance.
 */
export class LanguageService {
  private current: Language;

  // React subscribes because this preference is stored outside component state.
  private readonly listeners = new Set<() => void>();

  /** Read the saved preference, using English if storage is unavailable or invalid. */
  constructor() {
    this.current = this.readLanguage();
    // React and browser events call these methods without the service receiver.
    this.subscribe = this.subscribe.bind(this);
    this.getLanguage = this.getLanguage.bind(this);
    this.syncLanguage = this.syncLanguage.bind(this);
  }

  /**
   * Check whether a value is a supported language code.
   * @returns True only for codes present in the locale registry.
   */
  isLanguage(value: unknown): value is Language {
    return typeof value === 'string' && Object.hasOwn(locales, value);
  }

  /**
   * Read the in-memory preference without accessing browser storage again.
   * @returns The current supported language code.
   */
  getLanguage(): Language {
    return this.current;
  }

  /**
   * Resolve the formatting locale for the current preference.
   * @returns en-US for English or zh-CN for simplified Chinese.
   */
  getLocale() {
    return locales[this.current];
  }

  /** Save a changed, supported preference and notify React, even if storage is blocked. */
  setLanguage(next: Language) {
    if (!this.isLanguage(next) || next === this.current) {
      return;
    }
    this.current = next;
    try {
      localStorage.setItem('whenkin:language', next);
    } catch {
      /* Language switching also works without storage. */
    }
    this.notifyListeners();
  }

  /**
   * Subscribe to local and cross-tab changes using one browser listener per service.
   * @returns Cleanup that stops browser listening after the last subscriber leaves.
   */
  subscribe(listener: () => void) {
    if (this.listeners.size === 0 && typeof window !== 'undefined') {
      window.addEventListener('storage', this.syncLanguage);
    }
    this.listeners.add(listener);

    // Release browser listening after the last component unsubscribes.
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0 && typeof window !== 'undefined') {
        window.removeEventListener('storage', this.syncLanguage);
      }
    };
  }

  /**
   * Translate a message and replace named placeholders such as {name}.
   * Missing translations use English; unresolved placeholders stay visible.
   * @param values - Placeholder values; numbers use the current formatting locale.
   * @returns The localized message with supplied placeholders replaced.
   */
  t(message: string, values: Record<string, string | number> = {}) {
    const translated = this.current === 'en' ? message : (messages[message] ?? message);
    return translated.replace(
      /\{(\w+)\}/g,
      /* Replace supplied values without hiding an unresolved placeholder. */
      (placeholder, key: string) =>
        typeof values[key] === 'number'
          ? new Intl.NumberFormat(this.getLocale()).format(values[key])
          : String(values[key] ?? placeholder),
    );
  }

  /**
   * Read browser storage defensively during initialization or a cross-tab update.
   * @returns The saved code, or English for missing, invalid, or inaccessible storage.
   */
  private readLanguage(): Language {
    try {
      const value = localStorage.getItem('whenkin:language');
      return this.isLanguage(value) ? value : 'en';
    } catch {
      return 'en';
    }
  }

  /** Notify each subscriber after the in-memory preference has changed. */
  private notifyListeners() {
    this.listeners.forEach(
      /* Ask each subscriber to read the new preference. */
      (listener) => listener(),
    );
  }

  /** Reload another tab's preference; ignore unrelated keys and unchanged values. */
  private syncLanguage(event: StorageEvent) {
    if (event.key !== 'whenkin:language') {
      return;
    }
    const next = this.readLanguage();
    if (next !== this.current) {
      this.current = next;
      this.notifyListeners();
    }
  }
}

// Every component uses this same preference and subscriber list.
export const langService = new LanguageService();

/**
 * React hook that follows the shared service in this tab and other tabs.
 * @returns The selected language, updating the component when it changes.
 */
export function useLanguage() {
  return useSyncExternalStore(
    langService.subscribe,
    langService.getLanguage,
    langService.getLanguage,
  );
}
