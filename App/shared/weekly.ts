import { Temporal } from '@js-temporal/polyfill';
import {
  allSlots,
  slotsToRanges,
  slotDuration,
} from './time.js';
import type {
  MeetingEvent,
  TimeRange,
} from './types.js';

// A weekday poll represents a typical week, not dated appointments. Its shared
// wall-clock slots use a fixed Monday–Sunday coordinate system in PostgreSQL.
// The UTC suffix is an encoding, not a claim that these are real UTC meetings.
export const WEEK_START = '2000-01-03';

/**
 * Map weekday numbers (Monday = 1) to dates in the fixed storage week.
 * @returns A YYYY-MM-DD storage date; it does not identify an actual meeting date.
 */
export function weekdayDate(day: number) {
  return Temporal.PlainDate.from(WEEK_START)
    .add({ days: day - 1 })
    .toString();
}

/**
 * Display a weekly poll in another zone using its creation time for DST offsets.
 * These dates describe a typical week, so shifting a slot may wrap to another day.
 * @param zone - Viewer's IANA timezone, used only for the display conversion.
 * @returns Display windows and mappings back to the organizer's stored slots.
 */
export function projectWeekly(
  event: Pick<
    MeetingEvent,
    'windows' | 'timezone' | 'created_at' | 'slot_minutes'
  >,
  zone: string,
) {
  const parsed = Date.parse(event.created_at ?? '');
  // One reference instant determines DST offsets; a weekly poll has no meeting date.
  const referenceTime = Number.isFinite(parsed) ? parsed : Date.now();
  const instant = Temporal.Instant.fromEpochMilliseconds(referenceTime);

  /**
   * Read a zone's offset in milliseconds at the shared DST reference
   * instant.
   * @returns The zone's signed offset from UTC in milliseconds.
   */
  const offset = (value: string) =>
    instant.toZonedDateTimeISO(value).offsetNanoseconds / 1_000_000;

  // Clock difference in milliseconds; positive means the viewer's clock is ahead.
  const shift = offset(zone) - offset(event.timezone);
  const base = Date.parse(WEEK_START + 'T00:00:00Z');
  const week = 7 * 24 * 60 * 60 * 1000;

  /**
   * Wrap shifted timestamps into the fixed Monday-Sunday week.
   * @returns The same weekly clock position within the storage week, including
   * when the input shifted before Monday or after Sunday.
   */
  const wrap = (stamp: number) =>
    base + ((((stamp - base) % week) + week) % week);

  /**
   * Shift a stored weekly slot to the viewer's clock and wrap it into the
   * week.
   * @returns A displayed slot timestamp within the fixed storage week.
   */
  const toDisplay = (stamp: number) => wrap(stamp + shift);

  /**
   * Reverse the display shift before saving to the organizer's week.
   * @returns The stored weekly timestamp corresponding to the displayed slot.
   */
  const toCanonical = (stamp: number) => wrap(stamp - shift);

  /**
   * Shift a weekly range for display while keeping its duration unchanged.
   * @returns ISO boundaries in the viewer's weekly coordinates.
   */
  const range = (value: TimeRange): TimeRange => {
    const start = toDisplay(Date.parse(value.start));
    return {
      start: new Date(start).toISOString(),
      end: new Date(
        start + Date.parse(value.end) - Date.parse(value.start),
      ).toISOString(),
    };
  };

  return {
    referenceTime,
    toDisplay,
    toCanonical,
    range,
    windows: slotsToRanges(
      allSlots(event.windows, slotDuration(event)).map(toDisplay),
      slotDuration(event),
    ),
  };
}
