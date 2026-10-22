import { useSyncExternalStore } from 'react';
import { Languages } from 'lucide-react';
import { getLanguage, languageOptions, setLanguage, subscribeLanguage, t, type Language } from '../lib/i18n';

export function useLanguage() { return useSyncExternalStore(subscribeLanguage, getLanguage, getLanguage); }
export default function LanguageSelector() {
  const language = useLanguage();
  return <label className="language-selector"><Languages size={16} aria-hidden="true"/>
    <span className="sr-only">{t('Language')}</span>
    <select aria-label={t('Language')} value={language} onChange={event => setLanguage(event.target.value as Language)}>
      {languageOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  </label>;
}
