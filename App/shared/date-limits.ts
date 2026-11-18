import { Temporal } from '@js-temporal/polyfill';

// Shared by the calendar and API so every selectable future date can be saved.
export const FIRST_EVENT_DATE = Temporal.PlainDate.from('2026-01-01');
export const LAST_EVENT_DATE = Temporal.PlainDate.from('2050-12-31');

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
