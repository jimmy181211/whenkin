/** Edits a calendar year as a number rather than searching predefined choices. */
import {
  useRef,
  useState,
} from 'react';
import {
  FIRST_EVENT_DATE,
  LAST_EVENT_DATE,
  parseEventYear,
} from '../../shared/date-limits';
import { t } from '../i18n/index';
import { useNotice } from '../utils/use-notice';
import Toast from './Toast';
import './editable-select.css';

/** Saved year and the parent-owned action for moving the calendar. */
type Props = {
  value: number;
  onChange: (year: number) => void;
};

/**
 * Numeric year field. Valid whole years update the calendar as they are typed.
 * Partial/invalid input stays temporary; blur or Enter restores the last valid
 * year and shows the shared reminder. Escape discards the temporary text.
 * @returns A bounded number input and a reminder when an invalid edit is finished.
 */
export default function CalendarYearInput({
  value,
  onChange,
}: Props) {
  // Null displays the parent's year, including changes from month-navigation buttons.
  const [draft, setDraft] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const {
    notice,
    notify,
    dismissNotice,
  } = useNotice();

  /** Finish editing without allowing invalid text to change the calendar. */
  const finish = () => {
    if (draft !== null && parseEventYear(draft) === null) {
      notify(
        t('Choose a year from {first} to {last}.', {
          first: String(FIRST_EVENT_DATE.year),
          last: String(LAST_EVENT_DATE.year),
        }),
        input.current,
      );
    }
    setDraft(null);
  };

  return (
    <div className="calendar-year">
      <input
        ref={input}
        type="number"
        inputMode="numeric"
        aria-label={t('Year')}
        autoComplete="off"
        min={FIRST_EVENT_DATE.year}
        max={LAST_EVENT_DATE.year}
        step={1}
        value={draft ?? String(value)}
        onChange={
          /* Preserve partial input and apply only a valid whole year. */
          (event) => {
            const text = event.target.value;
            setDraft(text);
            dismissNotice();
            const year = parseEventYear(text);
            if (year !== null && year !== value) {
              onChange(year);
            }
          }
        }
        onBlur={finish}
        onKeyDown={
          /* Enter validates without submitting the form; Escape restores the saved year. */
          (event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              finish();
            } else if (event.key === 'Escape') {
              event.preventDefault();
              setDraft(null);
              dismissNotice();
            }
          }
        }
      />
      {notice && (
        <Toast
          key={notice.id}
          message={notice.message}
          anchor={notice.anchor}
          onDismiss={dismissNotice}
        />
      )}
    </div>
  );
}
