import { Temporal } from '@js-temporal/polyfill';

// A weekday poll represents a typical week, not dated appointments. Its shared
// wall-clock slots use a fixed Monday–Sunday coordinate system in PostgreSQL.
// The UTC suffix is an encoding, not a claim that these are real UTC meetings.
export const WEEK_START = '2000-01-03'; // Monday
export function weekdayDate(day: number) {
  return Temporal.PlainDate.from(WEEK_START).add({ days: day - 1 }).toString();
}
