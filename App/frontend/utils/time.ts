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

export function deviceTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export function formatTime(value: string | number, zone: string) {
  return new Intl.DateTimeFormat(getLocale(), {
    timeZone: zone,
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

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

export function zoneLabel(zone: string) {
  return t(
    zone === 'UTC'
      ? 'UTC'
      : zone.split('/').slice(1).join(' / ').replaceAll('_', ' ') || zone,
  );
}

export function zoneOffset(zone: string, at = Date.now()) {
  return (
    new Intl.DateTimeFormat(getLocale(), {
      timeZone: zone,
      timeZoneName: 'shortOffset',
    })
      .formatToParts(at)
      .find((p) => p.type === 'timeZoneName')?.value || ''
  );
}

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

export type GridCell = {
  stamp: number;
  key: string;
  date: string;
  minute: number;
  occurrence: number;
  offset: string;
};

export function gridModel(
  windows: TimeRange[],
  zone: string,
  interval: 15 | 30 = 15,
) {
  const days = new Map<string, GridCell[]>();
  const repeated = new Set<number>();
  for (const stamp of allSlots(windows)) {
    const t =
      Temporal.Instant.fromEpochMilliseconds(stamp).toZonedDateTimeISO(zone);
    const date = t.toPlainDate().toString();
    const minute = t.hour * 60 + t.minute;
    const col = days.get(date) || [];
    const occurrence = col.filter((c) => c.minute === minute).length;
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
  const min = Math.floor(Math.min(...cells.map((c) => c.minute)) / 60);
  const max = Math.floor(Math.max(...cells.map((c) => c.minute)) / 60);
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
    days: [...days.entries()].sort(([a], [b]) => a.localeCompare(b)),
    rows,
  };
}
