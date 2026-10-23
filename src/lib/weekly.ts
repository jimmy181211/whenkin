import { Temporal } from '@js-temporal/polyfill';
import { allSlots, slotsToRanges } from './time';
import type { MeetingEvent, TimeRange } from './types';

// A weekday poll represents a typical week, not dated appointments. Its shared
// wall-clock slots use a fixed Monday–Sunday coordinate system in PostgreSQL.
// The UTC suffix is an encoding, not a claim that these are real UTC meetings.
export const WEEK_START = '2000-01-03'; // Monday
export function weekdayDate(day: number) {
  return Temporal.PlainDate.from(WEEK_START).add({ days: day - 1 }).toString();
}

// Weekly polls have no date at which DST can be determined. Use one stable,
// disclosed reference instant: the poll's creation time. Rotate a cyclic week
// for display, keeping saved selections in the organizer's canonical clock.
export function projectWeekly(event: Pick<MeetingEvent,'windows'|'timezone'|'created_at'>, zone: string) {
  const parsed=Date.parse(event.created_at??''),referenceTime=Number.isFinite(parsed)?parsed:Date.now();
  const instant=Temporal.Instant.fromEpochMilliseconds(referenceTime);
  const offset=(value:string)=>instant.toZonedDateTimeISO(value).offsetNanoseconds/1_000_000;
  const shift=offset(zone)-offset(event.timezone),base=Date.parse(WEEK_START+'T00:00:00Z'),week=7*24*60*60*1000;
  const wrap=(stamp:number)=>base+((stamp-base)%week+week)%week;
  const toDisplay=(stamp:number)=>wrap(stamp+shift);
  const toCanonical=(stamp:number)=>wrap(stamp-shift);
  const range=(value:TimeRange):TimeRange=>{
    const start=toDisplay(Date.parse(value.start));
    return {start:new Date(start).toISOString(),end:new Date(start+Date.parse(value.end)-Date.parse(value.start)).toISOString()};
  };
  return {referenceTime,toDisplay,toCanonical,range,windows:slotsToRanges(allSlots(event.windows).map(toDisplay))};
}
