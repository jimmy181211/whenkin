import { useSyncExternalStore } from 'react';
import { Languages } from 'lucide-react';
import {
  getLanguage,
  languageOptions,
  setLanguage,
  subscribeLanguage,
  t,
  type Language,
} from '../i18n/index';

/**
 * Subscribe React to the shared language value, including cross-tab changes.
 * @returns The selected language code, updated when shared language state
 * changes.
 */
export function useLanguage() {
  return useSyncExternalStore(subscribeLanguage, getLanguage, getLanguage);
}

/**
 * Language-menu component connected to the shared interface language.
 * @returns A labeled selector listing the supported languages in their native
 * names.
 */
export default function LanguageSelector() {
  const language = useLanguage();
  return (
    <label className="language-selector header-control">
      <Languages size={16} aria-hidden="true" />
      <span className="sr-only">{t('Language')}</span>
      <select
        aria-label={t('Language')}
        value={language}
        onChange={
          /* Apply the language selected in the menu. */
          (event) => setLanguage(event.target.value as Language)
        }
      >
        {languageOptions.map(
          /**
           * @returns One native-language option in the language selector.
           */
          (option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ),
        )}
      </select>
    </label>
  );
}
