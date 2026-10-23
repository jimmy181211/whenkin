import { Check, Copy, Link2, LockKeyhole, X } from 'lucide-react';
import { t } from '../../lib/i18n';
type Props = {
    eventLink: string;
    organizerToken: string;
    copied: string;
    onClose: () => void;
    onCopy: (value: string, label: string) => Promise<void>;
};
export default function ShareEventDialog({ eventLink, organizerToken, copied, onClose, onCopy }: Props) {
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
          {t("Participant Link")}
          <input readOnly value={eventLink} onFocus={e => e.target.select()}/>
        </label>
        <button className="button primary" onClick={() => void onCopy(eventLink, 'event')}>
          {copied === 'event' ? <><Check size={17}/> {t("Link Copied")}</> : <><Copy size={17}/> {t("Copy Event Link")}</>}
        </button>
        {organizerToken && <div className="organizer-link">
          <strong><LockKeyhole size={15}/> {t("Just for You")}</strong>
          <input aria-label={t("Private organizer link")} readOnly value={eventLink + `#organizer=${organizerToken}`} onFocus={e => e.target.select()}/>
          <button className="text-button" onClick={() => void onCopy(eventLink + `#organizer=${organizerToken}`, 'organizer')}>
            {t(copied === 'organizer' ? 'Copied' : 'Copy Organizer Link')}
          </button>
        </div>}
      </section>
    </div>;
}
