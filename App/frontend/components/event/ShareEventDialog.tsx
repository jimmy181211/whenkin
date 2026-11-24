import { useId } from 'react';
import {
  Link2,
  X,
} from 'lucide-react';
import { langService } from '../../i18n/language';
import ModalSurface from '../ModalSurface';
import CopyLinkControl from '../CopyLinkControl';

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
    <ModalSurface className="share-modal" label={langService.t('Share Event')} onClose={onClose}>
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
      <CopyLinkControl
        id={id}
        value={eventLink}
        inputClassName="share-link-input"
        copied={copied === 'event'}
        copyLabel={langService.t('Copy Event Link')}
        copiedLabel={langService.t('Link Copied')}
        onCopy={
          /** Preserve the event page's clipboard action and feedback owner. */
          () => onCopy(eventLink, 'event')
        }
      />
    </ModalSurface>
  );
}
