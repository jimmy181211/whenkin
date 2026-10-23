import { Check, Copy, Link2, X } from 'lucide-react';
import { t } from '../../lib/i18n';
type Props = {
    eventLink: string;
    copied: string;
    onClose: () => void;
    onCopy: (value: string, label: string) => Promise<void>;
};
export default function ShareEventDialog({ eventLink, copied, onClose, onCopy }: Props) {
    return <div className="modal-backdrop" onClick={() => onClose()}>
      <section className="share-modal" role="dialog" aria-modal="true" aria-label={t("Share Event")} onClick={e => e.stopPropagation()} onKeyDown={e => {
            if (e.key === 'Escape') {
                onClose();
            }
        }}>
        <button className="icon-button modal-close" aria-label={t("Close sharing")} onClick={() => onClose()}>
          <X size={20}/>
        </button>
        <div className="heading-icon"><Link2 size={23}/></div>
        <label className="field">
          {t("Event Link")}
          <input readOnly value={eventLink} onFocus={e => e.target.select()}/>
        </label>
        <button className="button primary" onClick={() => void onCopy(eventLink, 'event')}>
          {copied === 'event' ? <><Check size={17}/> {t("Link Copied")}</> : <><Copy size={17}/> {t("Copy Event Link")}</>}
        </button>
      </section>
    </div>;
}
