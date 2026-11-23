import { Temporal } from '@js-temporal/polyfill';

// Shared by the calendar and API so every selectable future date can be saved.
export const FIRST_EVENT_DATE = Temporal.PlainDate.from('2026-01-01');
// Four-digit years keep calendar dates compatible with the API's YYYY-MM-DD format.
export const LAST_EVENT_DATE = Temporal.PlainDate.from('9999-12-31');

/**
 * Validate a typed year without matching it against a list of options.
 * @returns The whole year in the supported range, or null for invalid text.
 */
export function parseEventYear(value: string): number | null {
  if (!/^\d{4}$/.test(value)) {
    return null;
  }
  const year = Number(value);
  return year >= FIRST_EVENT_DATE.year && year <= LAST_EVENT_DATE.year
    ? year
    : null;
}

/**
 * Check an inclusive date range, using today's date in the event's timezone.
 * @returns True when the date is neither past nor outside the supported calendar.
 */
export function isEventDateAllowed(
  date: Temporal.PlainDate,
  today: Temporal.PlainDate,
) {
  return (
    Temporal.PlainDate.compare(date, FIRST_EVENT_DATE) >= 0 &&
    Temporal.PlainDate.compare(date, today) >= 0 &&
    Temporal.PlainDate.compare(date, LAST_EVENT_DATE) <= 0
  );
}
