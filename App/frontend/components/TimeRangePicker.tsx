import { getLocale, translate, type Language, useLanguage } from '../i18n/LanguageProvider';

/** Selects local start/end clock values without converting them to instants. */

import { NEW_EVENT_SLOT_MINUTES } from '../../shared/time';

// Half-hour choices include next-day midnight, which is only offered as an end.
const times = Array.from(
  { length: (24 * 60) / NEW_EVENT_SLOT_MINUTES + 1 },
  /** Generate half-hour clock choices through 24:00. */
  (_, i) =>
    `${String(Math.floor((i * NEW_EVENT_SLOT_MINUTES) / 60)).padStart(2, '0')}:${String(
      (i * NEW_EVENT_SLOT_MINUTES) % 60,
    ).padStart(2, '0')}`,
);

/**
 * Format a schedule clock value, keeping 24:00 explicit as next-day midnight.
 * @returns A localized clock label, including explicit next-day midnight for
 * 24:00.
 */
function labelTime(value: string, language: Language) {
  if (value === '24:00') {
    return translate(language, 'Midnight (next day)');
  }
  return new Intl.DateTimeFormat(getLocale(language), {
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
 * Time-range control using half-hour choices. Start excludes 24:00; end
 * includes it as next-day midnight. Changes retain the HH:mm string format.
 * @returns Localized From/Until dropdowns; the parent validates start < end.
 */
export default function TimeRangePicker({
  start,
  end,
  onStartChange,
  onEndChange,
}: TimeRangePickerProps) {
  const { t, language } = useLanguage();
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
                {labelTime(t, language)}
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
                {labelTime(t, language)}
              </option>
            ),
          )}
        </select>
      </label>
    </div>
  );
}
