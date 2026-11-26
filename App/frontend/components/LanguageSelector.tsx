import { useLanguage, type Language } from '../i18n/LanguageProvider';
import { Languages } from 'lucide-react';

/**
 * Language-menu component connected to the shared interface language.
 * @returns A labeled selector listing the supported languages in their native
 * names.
 */
export default function LanguageSelector() {
  const { t, setLanguage, language } = useLanguage();

  return (
    <label className="language-selector header-control">
      <Languages size={16} aria-hidden="true" />
      <span className="sr-only">{t('Language')}</span>
      <select
        value={language}
        onChange={
          /* Apply the language selected in the menu. */
          (event) => setLanguage(event.target.value as Language)
        }
      >
        <option value="en">English</option>
        <option value="zh">简体中文</option>
      </select>
    </label>
  );
}
