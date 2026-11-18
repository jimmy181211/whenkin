import {
  getLocale,
  t,
} from '../i18n';
import { Temporal } from '@js-temporal/polyfill';
import type { TimeRange } from '../../shared/types';
import {
  allSlots,
  localDate,
} from '../../shared/time';
export {
  SLOT,
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
 * Format an instant's clock time using the selected language and timezone.
 * @returns Localized hour/minute text, including the locale's AM/PM convention.
 */
export function formatTime(value: string | number, zone: string) {
  return new Intl.DateTimeFormat(getLocale(), {
    timeZone: zone,
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

/**
 * Format a local date, or only a weekday for the undated weekly schedule.
 * @param long - Use full weekday/month names instead of abbreviated labels.
 * @param weekly - Read the encoded weekday in UTC, without shifting it again.
 * @returns A localized weekday/date label, or weekday alone for a weekly schedule.
 */
export function formatDay(
  value: string | number,
  zone: string,
  long = false,
  weekly = false,
) {
  if (weekly) {
    return new Intl.DateTimeFormat(getLocale(), {
      timeZone: 'UTC',
      weekday: long ? 'long' : 'short',
    }).format(new Date(value));
  }
  return new Intl.DateTimeFormat(getLocale(), {
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
export function zoneLabel(zone: string) {
  return t(
    zone === 'UTC'
      ? 'UTC'
      : zone.split('/').slice(1).join(' / ').replaceAll('_', ' ') || zone,
  );
}

/**
 * Read the zone's offset at a specific instant, including daylight saving.
 * @returns The localized short offset label, or an empty string if none is provided.
 */
export function zoneOffset(zone: string, at = Date.now()) {
  return (
    new Intl.DateTimeFormat(getLocale(), {
      timeZone: zone,
      timeZoneName: 'shortOffset',
    })
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
export function displayRange(range: TimeRange, zone: string, weekly = false) {
  const same = localDate(range.start, zone) === localDate(range.end, zone);
  return `${formatDay(range.start, zone, false, weekly)} · ${formatTime(
    range.start,
    zone,
  )}–${same ? '' : formatDay(range.end, zone, false, weekly) + ' '}${formatTime(
    range.end,
    zone,
  )}`;
}

/**
 * One 15-minute calendar slot with its local date, clock position, and DST
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
 * @param interval - Minutes per displayed row; stored slots remain 15 minutes.
 * @returns Date columns of cells and ordered row keys shared by all columns.
 * Empty windows produce empty columns and rows.
 */
export function gridModel(
  windows: TimeRange[],
  zone: string,
  interval: 15 | 30 = 15,
) {
  const days = new Map<string, GridCell[]>();
  // Local hours needing a second set of rows when clocks move backward.
  const repeated = new Set<number>();
  for (const stamp of allSlots(windows)) {
    const t =
      Temporal.Instant.fromEpochMilliseconds(stamp).toZonedDateTimeISO(zone);
    const date = t.toPlainDate().toString();
    const minute = t.hour * 60 + t.minute;
    const col = days.get(date) || [];
    const occurrence = col.filter(
      /* Count earlier occurrences of this local minute to distinguish DST repeats. */
      (c) => c.minute === minute,
    ).length;
    if (occurrence) {
      repeated.add(t.hour);
    }
    col.push({
      stamp,
      date,
      minute,
      occurrence,
      offset: t.offset,
      key: `${minute}:${occurrence}`,
    });
    days.set(date, col);
  }
  const rows: { key: string;
    minute: number;
    occurrence: number }[] = [];
  const cells = [...days.values()].flat();
  const min = Math.floor(
    Math.min(
      ...cells.map(
        /* Read local clock minutes to find the earliest displayed hour. */
        (c) => c.minute,
      ),
    ) / 60,
  );
  const max = Math.floor(
    Math.max(
      ...cells.map(
        /* Read the same clock values to find the latest displayed hour. */
        (c) => c.minute,
      ),
    ) / 60,
  );
  for (let h = min; h <= max; h++) {
    for (let n = 0; n < (repeated.has(h) ? 2 : 1); n++) {
      for (let m = 0; m < 60; m += interval) {
        rows.push({
          key: `${h * 60 + m}:${n}`,
          minute: h * 60 + m,
          occurrence: n,
        });
      }
    }
  }
  return {
    days: [...days.entries()].sort(
      /* Order calendar columns by their local YYYY-MM-DD date. */
      ([a], [b]) => a.localeCompare(b),
    ),
    rows,
  };
}
