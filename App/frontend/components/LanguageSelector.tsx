import { Languages } from 'lucide-react';
import {
  langService,
  languageOptions,
  useLanguage,
  type Language,
} from '../i18n/language';

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
      <span className="sr-only">{langService.t('Language')}</span>
      <select
        value={language}
        onChange={
          /* Apply the language selected in the menu. */
          (event) => langService.setLanguage(event.target.value as Language)
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
