import { describe, expect, it } from 'vitest';
import { projectWeekly } from '../src/lib/weekly';
import { allSlots, SLOT } from '../src/lib/time';

const event={timezone:'America/Los_Angeles',created_at:'2026-10-22T18:00:00Z',windows:[{start:'2000-01-03T09:00:00Z',end:'2000-01-03T11:00:00Z'}]};
describe('date-free weekly display conversion',()=>{
  it('shows the same saved Monday 9 AM as noon in New York without changing stored selections',()=>{
    const before=JSON.stringify(event),stamp=Date.parse(event.windows[0].start),ny=projectWeekly(event,'America/New_York');
    expect(new Date(ny.toDisplay(stamp)).toISOString()).toBe('2000-01-03T12:00:00.000Z');
    expect(ny.toCanonical(ny.toDisplay(stamp))).toBe(stamp);
    expect(JSON.stringify(event)).toBe(before);
    expect(ny.range(event.windows[0])).toEqual({start:'2000-01-03T12:00:00.000Z',end:'2000-01-03T14:00:00.000Z'});
  });
  it('uses the disclosed creation-date offsets, including summer/winter and quarter-hour zones',()=>{
    const stamp=Date.parse(event.windows[0].start);
    const summer=projectWeekly(event,'Asia/Kathmandu');
    const winter=projectWeekly({...event,created_at:'2027-01-15T18:00:00Z'},'Asia/Kathmandu');
    expect(new Date(summer.toDisplay(stamp)).toISOString()).toBe('2000-01-03T21:45:00.000Z');
    expect(new Date(winter.toDisplay(stamp)).toISOString()).toBe('2000-01-03T22:45:00.000Z');
    expect(summer.referenceTime).toBe(Date.parse(event.created_at));
  });
  it('wraps Sunday into Monday and preserves a round trip for every selected slot',()=>{
    const source={...event,windows:[{start:'2000-01-09T17:00:00Z',end:'2000-01-09T19:00:00Z'}]};
    const view=projectWeekly(source,'Asia/Tokyo'),original=allSlots(source.windows),display=allSlots(view.windows);
    expect(view.windows).toEqual([{start:'2000-01-03T09:00:00.000Z',end:'2000-01-03T11:00:00.000Z'}]);
    expect(display.map(view.toCanonical)).toEqual(original);
    expect(new Set(display).size).toBe(original.length);
  });
  it('keeps a meeting duration intact when its displayed end crosses the week boundary',()=>{
    const source={...event,timezone:'UTC'},view=projectWeekly(source,'Asia/Kolkata');
    const shown=view.range({start:'2000-01-09T18:00:00Z',end:'2000-01-09T20:00:00Z'});
    expect(shown.start).toBe('2000-01-09T23:30:00.000Z');
    expect(shown.end).toBe('2000-01-10T01:30:00.000Z');
    expect(Date.parse(shown.end)-Date.parse(shown.start)).toBe(8*SLOT);
  });
});
