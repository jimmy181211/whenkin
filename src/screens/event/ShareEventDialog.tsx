import { useId } from 'react';
import { Check, Copy, Link2, X } from 'lucide-react';
import { t } from '../../lib/i18n';
type Props = {
    eventLink: string;
    copied: string;
    onClose: () => void;
    onCopy: (value: string, label: string) => Promise<void>;
};
export default function ShareEventDialog({ eventLink, copied, onClose, onCopy }: Props) {
    const linkId = useId();
    return <div className="modal-backdrop" onClick={() => onClose()}>
      <section className="share-modal" role="dialog" aria-modal="true" aria-label={t("Share Event")} onClick={e => e.stopPropagation()} onKeyDown={e => {
            if (e.key === 'Escape') {
                onClose();
            }
        }}>
        <button className="icon-button modal-close" aria-label={t("Close sharing")} onClick={() => onClose()}>
          <X size={20}/>
        </button>
        <div className="share-heading">
          <div className="heading-icon" aria-hidden="true"><Link2 size={23}/></div>
          <label htmlFor={linkId}>{t("Event Link")}</label>
        </div>
        <input id={linkId} className="share-link-input" readOnly value={eventLink} onFocus={e => e.target.select()}/>
        <button className="button primary" onClick={() => void onCopy(eventLink, 'event')}>
          {copied === 'event' ? <><Check size={17}/> {t("Link Copied")}</> : <><Copy size={17}/> {t("Copy Event Link")}</>}
        </button>
      </section>
    </div>;
}
