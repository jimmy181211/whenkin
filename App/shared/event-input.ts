/** Input limits and clock ordering shared by the event forms and API validation. */
export const EVENT_INPUT_LIMITS = {
  title: 100,
  description: 1000,
  name: 60,
  dates: 31,
  weekdays: 7,
} as const;

/**
 * Compare zero-padded HH:mm values, including 24:00 as the next-day endpoint.
 * This checks ordering only; the API must also validate the clock format.
 * @returns Whether the end is strictly later than the start.
 */
export function isTimeRangeOrdered(start: string, end: string) {
  return start < end;
}
