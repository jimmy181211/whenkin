/** Converts local times and selected slots into canonical time ranges. */
import { Temporal } from '@js-temporal/polyfill';
import type { TimeRange } from './types.js';

/** Legacy slot duration, retained for old events and helper callers without metadata. */
export const SLOT = 15 * 60 * 1000;

/** New events use half-hour choices and saved slots. */
export const NEW_EVENT_SLOT_MINUTES = 30;

/**
 * Resolve an event's saved slot duration without changing legacy ranges.
 * @returns Milliseconds per slot; absent metadata means the original 15-minute format.
 */
export function slotDuration(event: { slot_minutes?: 15 | 30 }) {
  return event.slot_minutes === 30 ? NEW_EVENT_SLOT_MINUTES * 60 * 1000 : SLOT;
}

/**
 * Check whether the runtime recognizes this time-zone identifier.
 * @returns True for a supported zone; false when the runtime rejects it.
 */
export function isTimezone(zone: string) {
  try {
    new Intl.DateTimeFormat('en', { timeZone: zone }).format();
    return true;
  } catch {
    return false;
  }
}

/**
 * Convert a local date and clock time to a UTC ISO string.
 * @param date - Calendar date as YYYY-MM-DD in the supplied zone.
 * @param time - A clock value; 24:00 means midnight on the following day.
 * @param zone - IANA zone used to interpret the local date and time.
 * @returns The corresponding instant as an ISO string ending in Z.
 * @throws For an invalid date, clock value, or zone, or a local time skipped or
 * repeated by a daylight-saving change.
 */
export function localToUTC(date: string, time: string, zone: string) {
  const day = Temporal.PlainDate.from(date);
  const p =
    time === '24:00'
      ? day.add({ days: 1 }).toPlainDateTime('00:00')
      : day.toPlainDateTime(time);
  return p
    .toZonedDateTime(zone, { disambiguation: 'reject' })
    .toInstant()
    .toString();
}

/**
 * Read the calendar date of an instant in the requested zone.
 * @returns A YYYY-MM-DD date, which may differ from the instant's UTC date.
 */
export function localDate(value: string | number, zone: string) {
  return Temporal.Instant.from(new Date(value).toISOString())
    .toZonedDateTimeISO(zone)
    .toPlainDate()
    .toString();
}

/**
 * Expand ranges into sorted, unique slot-start timestamps in milliseconds.
 * Overlapping ranges do not duplicate slots; an incomplete trailing slot is skipped.
 * Input ranges are assumed parseable; event-bound and alignment checks happen separately.
 * @param duration - Milliseconds per slot; defaults to the legacy format.
 * @returns Slot starts in milliseconds, or an empty list when no complete slots exist.
 */
export function allSlots(windows: TimeRange[], duration = SLOT): number[] {
  const result = new Set<number>();
  for (const w of windows) {
    for (
      let t = Date.parse(w.start);
      t + duration <= Date.parse(w.end);
      t += duration
    ) {
      result.add(t);
    }
  }
  return [...result].sort(
    /* Return slot starts in chronological order. */
    (a, b) => a - b,
  );
}

/**
 * Merge adjacent selected slots, keeping gaps as separate ranges.
 * This conversion does not check whether slots belong to an event's allowed schedule.
 * @param slots - Valid start timestamps in milliseconds.
 * @param duration - Milliseconds covered by each slot; defaults to the legacy format.
 * @returns Sorted UTC ISO ranges with exclusive end times, or an empty list
 * when no slots are selected.
 * @example
 * ```ts
 * slotsToRanges(new Set([0, SLOT]));
 * // Two adjacent 15-minute slots become one 30-minute range.
 * ```
 */
export function slotsToRanges(
  slots: Set<number> | number[],
  duration = SLOT,
): TimeRange[] {
  const result: TimeRange[] = [];
  for (const t of [...new Set(slots)].sort(
    /* Merge selected slots in chronological order after removing duplicates. */
    (a, b) => a - b,
  )) {
    const last = result.at(-1);
    if (last && Date.parse(last.end) === t) {
      last.end = new Date(t + duration).toISOString();
    } else {
      result.push({
        start: new Date(t).toISOString(),
        end: new Date(t + duration).toISOString(),
      });
    }
  }
  return result;
}

/**
 * Check that the whole interval is covered, even across adjacent ranges.
 * Expects valid ranges and a non-empty interval with start earlier than end.
 * @param start - Included start timestamp, in milliseconds.
 * @param end - Excluded end timestamp; defaults to one saved slot after start.
 * @returns True when the ranges cover the entire interval without a gap.
 */
export function contains(
  ranges: TimeRange[],
  start: number,
  end = start + SLOT,
) {
  // Everything before cursor is covered. A gap before the next range means failure.
  let cursor = start;
  for (const r of [...ranges].sort(
    /** Examine coverage ranges from earliest start to latest. */
    (a, b) => Date.parse(a.start) - Date.parse(b.start),
  )) {
    if (Date.parse(r.start) > cursor) {
      return false;
    }
    if (Date.parse(r.end) > cursor) {
      cursor = Date.parse(r.end);
    }
    if (cursor >= end) {
      return true;
    }
  }
  return false;
}
