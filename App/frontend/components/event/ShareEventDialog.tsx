import { useId } from 'react';
import { Check, Copy, Link2, X } from 'lucide-react';
import { t } from '../../i18n/index';
import PopupSurface from '../PopupSurface';

type Props = { eventLink: string; copied: string; onClose: () => void; onCopy: (value: string, label: string) => Promise<void> };
export default function ShareEventDialog({ eventLink, copied, onClose, onCopy }: Props) {
  const id = useId();
  return <div className="modal-backdrop" onClick={onClose}>
    <PopupSurface className="share-modal" role="dialog" aria-modal="true" aria-label={t('Share Event')} onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Escape') onClose(); }}>
      <button className="icon-button modal-close" aria-label={t('Close sharing')} onClick={onClose}><X size={20}/></button>
      <div className="share-heading">
        <div className="heading-icon" aria-hidden="true"><Link2 size={23}/></div>
        <label htmlFor={id}>{t('Event Link')}</label>
      </div>
      <input id={id} className="share-link-input" readOnly value={eventLink} onFocus={e => e.target.select()}/>
      <button type="button" className="button primary" onClick={() => void onCopy(eventLink, 'event')}>
        {copied === 'event' ? <><Check size={17}/>{t('Link Copied')}</> : <><Copy size={17}/>{t('Copy Event Link')}</>}
      </button>
    </PopupSurface>
  </div>;
}
