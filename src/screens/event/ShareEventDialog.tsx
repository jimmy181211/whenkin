import { useId } from 'react';
import { Check, Copy, Link2, X } from 'lucide-react';
import { t } from '../../lib/i18n';

type Props = {
  eventLink: string;
  privateEditLink?: string;
  copied: string;
  onClose: () => void;
  onPrivateLinkUnavailable: (anchor: HTMLElement) => void;
  onCopy: (value: string, label: string) => Promise<void>;
};
export default function ShareEventDialog({ eventLink, privateEditLink, copied, onClose, onCopy, onPrivateLinkUnavailable }: Props) {
  const id = useId();
  const links = [
    { key: 'event', label: 'Event Link', button: 'Copy Event Link', url: eventLink },
    { key: 'edit', label: 'My Private Edit Link', button: 'Copy My Private Edit Link', url: privateEditLink },
  ];
  return <div className="modal-backdrop" onClick={onClose}>
    <section className="share-modal" role="dialog" aria-modal="true" aria-label={t('Share Event')} onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Escape') onClose(); }}>
      <button className="icon-button modal-close" aria-label={t('Close sharing')} onClick={onClose}><X size={20}/></button>
      {links.map(link => <div className="share-link-section" key={link.key}>
        <div className="share-heading">
          <div className="heading-icon" aria-hidden="true"><Link2 size={23}/></div>
          <label htmlFor={`${id}-${link.key}`}>{t(link.label)}</label>
        </div>
        <input id={`${id}-${link.key}`} className="share-link-input" readOnly disabled={!link.url} value={link.url ?? ''} onFocus={e => e.target.select()}/>
        <button type="button" className="button primary" onClick={e => { if (link.url) void onCopy(link.url, link.key); else onPrivateLinkUnavailable(e.currentTarget); }}>
          {copied === link.key ? <><Check size={17}/>{t('Link Copied')}</> : <><Copy size={17}/>{t(link.button)}</>}
        </button>
      </div>)}
    </section>
  </div>;
}
