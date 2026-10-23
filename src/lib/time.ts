import { getLocale, t } from './i18n';
import { Temporal } from '@js-temporal/polyfill';
import type { TimeRange } from './types';
export const SLOT = 15 * 60 * 1000;
export function deviceTimezone() { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; }
export function isTimezone(zone: string) {
  try { new Intl.DateTimeFormat('en', { timeZone: zone }).format(); return true; } catch { return false; }
}
export function localToUTC(date: string, time: string, zone: string) {
  const day = Temporal.PlainDate.from(date);
  const p = time === '24:00' ? day.add({ days: 1 }).toPlainDateTime('00:00') : day.toPlainDateTime(time);
  return p.toZonedDateTime(zone, { disambiguation: 'reject' }).toInstant().toString();
}
export function formatTime(value: string | number, zone: string) {
  return new Intl.DateTimeFormat(getLocale(), { timeZone: zone, hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}
export function formatDay(value: string | number, zone: string, long = false, weekly = false) {
  if(weekly)return new Intl.DateTimeFormat(getLocale(),{timeZone:'UTC',weekday:long?'long':'short'}).format(new Date(value));
  return new Intl.DateTimeFormat(getLocale(), { timeZone: zone, weekday: long ? 'long' : 'short', month: long ? 'long' : 'short', day: 'numeric' }).format(new Date(value));
}
export function localDate(value: string | number, zone: string) {
  return Temporal.Instant.from(new Date(value).toISOString()).toZonedDateTimeISO(zone).toPlainDate().toString();
}
export function zoneLabel(zone: string) {
  return t(zone === 'UTC' ? 'UTC' : zone.split('/').slice(1).join(' / ').replaceAll('_', ' ') || zone);
}
export function zoneOffset(zone: string, at = Date.now()) {
  return new Intl.DateTimeFormat(getLocale(), { timeZone: zone, timeZoneName: 'shortOffset' }).formatToParts(at).find(p => p.type === 'timeZoneName')?.value || '';
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
export function displayRange(range: TimeRange, zone: string, weekly = false) {
  const same = localDate(range.start, zone) === localDate(range.end, zone);
  return `${formatDay(range.start, zone, false, weekly)} · ${formatTime(range.start, zone)}–${same ? '' : formatDay(range.end, zone, false, weekly) + ' '}${formatTime(range.end, zone)}`;
}
export type GridCell = { stamp: number; key: string; date: string; minute: number; occurrence: number; offset: string };
export function gridModel(windows: TimeRange[], zone: string, interval:15|30=15) {
  const days = new Map<string, GridCell[]>(); const repeated = new Set<number>();
  for (const stamp of allSlots(windows)) {
    const t = Temporal.Instant.fromEpochMilliseconds(stamp).toZonedDateTimeISO(zone);
    const date = t.toPlainDate().toString(), minute = t.hour * 60 + t.minute;
    const col = days.get(date) || [], occurrence = col.filter(c => c.minute === minute).length;
    if (occurrence) repeated.add(t.hour);
    col.push({ stamp, date, minute, occurrence, offset: t.offset, key: `${minute}:${occurrence}` }); days.set(date, col);
  }
  const rows: { key: string; minute: number; occurrence: number }[] = [], cells = [...days.values()].flat();
  const min = Math.floor(Math.min(...cells.map(c=>c.minute)) / 60), max = Math.floor(Math.max(...cells.map(c=>c.minute)) / 60);
  for (let h=min; h<=max; h++) for(let n=0; n<(repeated.has(h)?2:1);n++) for(let m=0;m<60;m+=interval) rows.push({key:`${h*60+m}:${n}`,minute:h*60+m,occurrence:n});
  return { days: [...days.entries()].sort(([a],[b])=>a.localeCompare(b)), rows };
}
