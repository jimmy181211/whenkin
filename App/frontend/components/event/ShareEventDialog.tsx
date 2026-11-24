import { useId } from 'react';
import {
  Check,
  Copy,
  Link2,
  X,
} from 'lucide-react';
import { langService } from '../../i18n/language';
import PopupSurface from '../PopupSurface';

/** Shareable URL, copy feedback, and actions supplied by the event page. */
type Props = {
  eventLink: string;
  copied: string;
  onClose: () => void;
  onCopy: (value: string, label: string) => Promise<void>;
};

/**
 * Event-sharing dialog component with a copyable URL and clipboard feedback.
 * @param copied - Label of the link last copied; "event" shows success
 * feedback.
 *
 * @returns A sharing dialog with the event URL, copy action, and close
 * control.
 */
export default function ShareEventDialog({
  eventLink,
  copied,
  onClose,
  onCopy,
}: Props) {
  const id = useId();
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <PopupSurface
        className="share-modal"
        role="dialog"
        aria-modal="true"
        aria-label={langService.t('Share Event')}
        onClick={
          /* Keep clicks on sharing controls from closing the dialog backdrop. */
          (e) => e.stopPropagation()
        }
        onKeyDown={
          /* Close the sharing dialog when Escape is pressed. */
          (e) => {
            if (e.key === 'Escape') {
              onClose();
            }
          }
        }
      >
        <button
          className="icon-button modal-close"
          aria-label={langService.t('Close sharing')}
          onClick={onClose}
        >
          <X size={20} />
        </button>
        <div className="share-heading">
          <div className="heading-icon" aria-hidden="true">
            <Link2 size={23} />
          </div>
          <label htmlFor={id}>{langService.t('Event Link')}</label>
        </div>
        <input
          id={id}
          className="share-link-input"
          readOnly
          value={eventLink}
          onFocus={
            /* Select the event URL for manual copying. */
            (e) => e.target.select()
          }
        />
        <button
          type="button"
          className="button primary"
          onClick={
            /* Copy the event link and identify which control should show success feedback. */
            () => void onCopy(eventLink, 'event')
          }
        >
          {copied === 'event' ? (
            <>
              <Check size={17} />
              {langService.t('Link Copied')}
            </>
          ) : (
            <>
              <Copy size={17} />
              {langService.t('Copy Event Link')}
            </>
          )}
        </button>
      </PopupSurface>
    </div>
  );
}
