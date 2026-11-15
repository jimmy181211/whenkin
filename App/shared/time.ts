import { Temporal } from '@js-temporal/polyfill';
import type { TimeRange } from './types.js';

export const SLOT = 15 * 60 * 1000;
export function isTimezone(zone: string) {
  try { new Intl.DateTimeFormat('en', { timeZone: zone }).format(); return true; } catch { return false; }
}
export function localToUTC(date: string, time: string, zone: string) {
  const day = Temporal.PlainDate.from(date);
  const p = time === '24:00' ? day.add({ days: 1 }).toPlainDateTime('00:00') : day.toPlainDateTime(time);
  return p.toZonedDateTime(zone, { disambiguation: 'reject' }).toInstant().toString();
}
export function localDate(value: string | number, zone: string) {
  return Temporal.Instant.from(new Date(value).toISOString()).toZonedDateTimeISO(zone).toPlainDate().toString();
}
export function allSlots(windows: TimeRange[]): number[] {
  const result = new Set<number>();
  for (const w of windows) for (let t = Date.parse(w.start); t + SLOT <= Date.parse(w.end); t += SLOT) result.add(t);
  return [...result].sort((a, b) => a - b);
}
export function slotsToRanges(slots: Set<number> | number[]): TimeRange[] {
  const result: TimeRange[] = [];
  for (const t of [...new Set(slots)].sort((a, b) => a - b)) {
    const last = result.at(-1);
    if (last && Date.parse(last.end) === t) last.end = new Date(t + SLOT).toISOString();
    else result.push({ start: new Date(t).toISOString(), end: new Date(t + SLOT).toISOString() });
  }
  return result;
}
export function contains(ranges: TimeRange[], start: number, end = start + SLOT) {
  let cursor = start;
  for (const r of [...ranges].sort((a,b) => Date.parse(a.start)-Date.parse(b.start))) {
    if (Date.parse(r.start) > cursor) return false;
    if (Date.parse(r.end) > cursor) cursor = Date.parse(r.end);
    if (cursor >= end) return true;
  }
  return false;
}
