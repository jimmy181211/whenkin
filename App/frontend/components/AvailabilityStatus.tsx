import {
  Check,
  LoaderCircle,
} from 'lucide-react';
import { t } from '../i18n/index';

/** Save state and prior-response information used to choose a status label. */
type Props = {
  state: 'saved' | 'dirty' | 'saving' | 'error';
  hasSavedResponse: boolean;
};

/**
 * Reply-status component that distinguishes unsaved edits, saving, and saved
 * responses.
 * @returns An accessible status badge with the label and indicator matching
 * the current save state.
 */
export default function AvailabilityStatus({
  state,
  hasSavedResponse,
}: Props) {
  const status =
    state === 'saved'
      ? hasSavedResponse
        ? 'Saved'
        : 'Not Started'
      : 'Unsaved';
  const statusClass =
    status === 'Saved'
      ? 'saved'
      : status === 'Not Started'
        ? 'not-started'
        : state === 'error'
          ? 'error'
          : 'dirty';
  return (
    <span
      className={`save-status ${statusClass}`}
      role="status"
      aria-busy={state === 'saving'}
    >
      {state === 'saving' ? (
        <LoaderCircle className="spin" size={14} />
      ) : status === 'Saved' ? (
        <Check size={14} />
      ) : (
        <span className="status-dot" />
      )}
      {t(status)}
    </span>
  );
}
