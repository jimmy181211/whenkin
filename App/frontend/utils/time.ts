import { translate, type Language } from '../i18n/LanguageProvider';
import { Temporal } from '@js-temporal/polyfill';
import type { MeetingEvent, TimeRange } from '../../shared/types';
import { allSlots, localDate, slotDuration } from '../../shared/time';
export {
  SLOT,
  NEW_EVENT_SLOT_MINUTES,
  slotDuration,
  isTimezone,
  localToUTC,
  localDate,
  allSlots,
  slotsToRanges,
  contains,
} from '../../shared/time';

/**
 * Read the browser's timezone setting.
 * @returns Its IANA timezone id, using UTC when the resolved setting is empty.
 */
export function deviceTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

/**
 * Format an instant's clock time using the supplied UI locale and timezone.
 * @param locale - Browser formatting code from context, such as en-US or zh-CN.
 * @returns Localized hour/minute text, including the locale's AM/PM convention.
 */
export function formatTime(value: string | number, zone: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    timeZone: zone,
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

/**
 * Format a local date in the supplied locale, or just a weekday for weekly schedules.
 * @param long - Use full weekday/month names instead of abbreviated labels.
 * @param weekly - Read the encoded weekday in UTC, without shifting it again.
 * @returns A localized weekday/date label, or weekday alone for a weekly schedule.
 */
export function formatDay(
  value: string | number,
  zone: string,
  long: boolean,
  weekly: boolean,
  locale: string,
) {
  if (weekly) {
    return new Intl.DateTimeFormat(locale, {
      timeZone: 'UTC',
      weekday: long ? 'long' : 'short',
    }).format(new Date(value));
  }
  return new Intl.DateTimeFormat(locale, {
    timeZone: zone,
    weekday: long ? 'long' : 'short',
    month: long ? 'long' : 'short',
    day: 'numeric',
  }).format(new Date(value));
}

/**
 * Turn an IANA id into a readable city label.
 * @returns A translated city label where available, otherwise readable id text.
 */
export function zoneLabel(zone: string, language: Language) {
  return translate(
    language,
    zone === 'UTC' ? 'UTC' : zone.split('/').slice(1).join(' / ').replaceAll('_', ' ') || zone,
  );
}

/**
 * Read the zone's offset at a specific instant, including daylight saving.
 * @returns The localized short offset label, or an empty string if none is provided.
 */
export function zoneOffset(zone: string, at = Date.now(), locale: string) {
  return (
    new Intl.DateTimeFormat(locale, { timeZone: zone, timeZoneName: 'shortOffset' })
      .formatToParts(at)
      .find(
        /* Extract the formatted timezone offset rather than a clock or date part. */
        (p) => p.type === 'timeZoneName',
      )?.value || ''
  );
}

/**
 * Format a range, repeating the end date only when it crosses a local day.
 * @returns A localized date and start/end clock-time label for display.
 */
export function displayRange(range: TimeRange, zone: string, weekly: boolean, locale: string) {
  const same = localDate(range.start, zone) === localDate(range.end, zone);
  const startDate = formatDay(range.start, zone, false, weekly, locale);
  const startTime = formatTime(range.start, zone, locale);
  const endDate = same ? '' : formatDay(range.end, zone, false, weekly, locale) + ' ';
  const endTime = formatTime(range.end, zone, locale);
  return `${startDate} · ${startTime}–${endDate}${endTime}`;
}

/** Display rows span 30 minutes for both new and legacy events. */
export const GRID_ROW_MINUTES = 30;

/**
 * One saved calendar slot with its local date, clock position, and DST
 * occurrence.
 */
export type GridCell = {
  /** Instant in milliseconds, or a shifted weekly coordinate in a weekly view. */
  stamp: number;
  /** Clock minute plus occurrence, so repeated DST times have different row keys. */
  key: string;
  date: string;
  /** Minutes since local midnight (e.g. 09:30 is 570). */
  minute: number;
  /** Zero for the first occurrence of a local clock minute, one for its repeat. */
  occurrence: number;
  offset: string;
};

/**
 * Group slot instants by local date and build matching calendar rows.
 * Keep repeated DST hours separate so two different instants are never one cell.
 * Count each date/minute pair once per slot instead of rescanning its column.
 * Display rows always span 30 minutes. Event metadata selects the stored slot size.
 * @param schedule - Event windows and granularity, or a legacy windows-only array.
 * @returns Date columns of cells and ordered row keys shared by all columns.
 * Empty windows produce empty columns and rows.
 */
export function gridModel(
  schedule: Pick<MeetingEvent, 'windows' | 'slot_minutes'> | TimeRange[],
  zone: string,
) {
  const event = Array.isArray(schedule) ? { windows: schedule, slot_minutes: undefined } : schedule;
  const days = new Map<string, GridCell[]>();
  // Counts are per date: the same clock minute tomorrow is not a DST repeat.
  const occurrences = new Map<string, number>();
  // Local hours needing a second set of rows when clocks move backward.
  const repeated = new Set<number>();
  // Whole half-hour slots can start at :15 in a quarter-hour-offset display zone.
  let rowOffset = 0;
  // Empty input leaves these bounds inverted, producing no display rows.
  let firstHour = Infinity;
  let lastHour = -Infinity;
  for (const stamp of allSlots(event.windows, slotDuration(event))) {
    const t = Temporal.Instant.fromEpochMilliseconds(stamp).toZonedDateTimeISO(zone);
    // Resolve local calendar fields once; zoned getters each repeat that work.
    const local = t.toPlainDateTime();
    const date = local.toPlainDate().toString();
    const hour = local.hour;
    const minute = hour * 60 + local.minute;
    if (!days.size && event.slot_minutes === 30) {
      rowOffset = minute % GRID_ROW_MINUTES;
    }
    const clockKey = `${date}:${minute}`;
    const occurrence = occurrences.get(clockKey) ?? 0;
    occurrences.set(clockKey, occurrence + 1);
    firstHour = Math.min(firstHour, hour);
    lastHour = Math.max(lastHour, hour);
    if (occurrence) {
      repeated.add(hour);
    }
    let col = days.get(date);
    if (!col) {
      col = [];
      days.set(date, col);
    }
    col.push({ stamp, date, minute, occurrence, offset: t.offset, key: `${minute}:${occurrence}` });
  }
  return {
    days: [...days.entries()].sort(
      /* Order calendar columns by their local YYYY-MM-DD date. */
      ([a], [b]) => a.localeCompare(b),
    ),
    rows: gridRows(firstHour, lastHour, repeated, rowOffset),
  };
}

/**
 * Build shared clock rows for the observed hour range, including gaps.
 * A repeated hour receives two complete row groups, even for a half-hour rollback.
 * @param firstHour - Earliest local hour, or Infinity when no slots exist.
 * @param lastHour - Latest local hour, or -Infinity when no slots exist.
 * @param offset - Minute offset within a half-hour row, for shifted display zones.
 * @returns Ordered clock rows; inverted bounds produce an empty array.
 */
function gridRows(firstHour: number, lastHour: number, repeated: Set<number>, offset: number) {
  const rows: { key: string; minute: number; occurrence: number }[] = [];
  for (let h = firstHour; h <= lastHour; h++) {
    for (let n = 0; n < (repeated.has(h) ? 2 : 1); n++) {
      for (let m = offset; m < 60; m += GRID_ROW_MINUTES) {
        rows.push({ key: `${h * 60 + m}:${n}`, minute: h * 60 + m, occurrence: n });
      }
    }
  }
  return rows;
}
