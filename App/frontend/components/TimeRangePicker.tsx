/** Selects local start/end clock values without converting them to instants. */
import {
  getLocale,
  t,
} from '../i18n/index';

// Quarter-hour clock choices from 00:00 through 24:00, including next-day midnight.
const times = Array.from(
  { length: 97 },
  /** Generate quarter-hour clock choices through 24:00. */
  (_, i) =>
    `${String(Math.floor(i / 4)).padStart(2, '0')}:${String(
      (i % 4) * 15,
    ).padStart(2, '0')}`,
);

/**
 * Format a schedule clock value, keeping 24:00 explicit as next-day midnight.
 * @returns A localized clock label, including explicit next-day midnight for
 * 24:00.
 */
function labelTime(value: string) {
  if (value === '24:00') {
    return t('Midnight (next day)');
  }
  return new Intl.DateTimeFormat(getLocale(), {
    timeZone: 'UTC',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(`2000-01-01T${value}:00Z`));
}

/** Controlled local clock values; validity of their order belongs to the form. */
type TimeRangePickerProps = {
  start: string;
  end: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
};

/**
 * Time-range control using quarter-hour choices. Start excludes 24:00; end
 * includes it as next-day midnight. Changes retain the HH:mm string format.
 * @returns Localized From/Until dropdowns; the parent validates start < end.
 */
export default function TimeRangePicker({
  start,
  end,
  onStartChange,
  onEndChange,
}: TimeRangePickerProps) {
  return (
    <div className="fields-row two-fields">
      <label className="field">
        {t('From')}
        <select
          value={start}
          onChange={
            /* Update the event's local start clock value. */
            (e) => onStartChange(e.target.value)
          }
        >
          {times.slice(0, -1).map(
            /**
             * @returns One allowed start-time option, excluding next-day
             * midnight.
             */
            (t) => (
              <option key={t} value={t}>
                {labelTime(t)}
              </option>
            ),
          )}
        </select>
      </label>
      <label className="field">
        {t('Until')}
        <select
          value={end}
          onChange={
            /* Update the event's local end clock value. */
            (e) => onEndChange(e.target.value)
          }
        >
          {times.slice(1).map(
            /**
             * @returns One allowed end-time option, including next-day
             * midnight.
             */
            (t) => (
              <option key={t} value={t}>
                {labelTime(t)}
              </option>
            ),
          )}
        </select>
      </label>
    </div>
  );
}
