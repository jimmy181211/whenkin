import { useEffect } from 'react';
import { Info, X } from 'lucide-react';
import { t } from '../lib/i18n';

export default function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return <div className="toast-notice" role="status" aria-live="polite" aria-atomic="true">
    <Info size={19} aria-hidden="true"/>
    <span>{t(message)}</span>
    <button type="button" className="icon-button" aria-label={t('Dismiss notification')} onClick={onDismiss}><X size={16}/></button>
  </div>;
}
