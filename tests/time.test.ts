import { describe, expect, it } from 'vitest';
import { allSlots, bestTimes, contains, gridModel, localDate, localToUTC, SLOT, slotsToRanges } from '../src/lib/time';
import { validateRanges } from '../lib/whenkin-api';
import type { MeetingEvent } from '../src/lib/types';
const span=(start:string,end:string)=>({start,end});
describe('time zones and real moments',()=>{
  it('matches Los Angeles and New York without separate local-time copies',()=>{
    expect(localToUTC('2027-01-15','10:00','America/Los_Angeles')).toBe(localToUTC('2027-01-15','13:00','America/New_York'));
    expect(localToUTC('2027-01-15','10:00','America/Los_Angeles')).toBe('2027-01-15T18:00:00Z');
  });
  it('uses the date-specific daylight saving offset and fractional-hour zones',()=>{
    expect(localToUTC('2027-07-15','10:00','America/Los_Angeles')).toBe('2027-07-15T17:00:00Z');
    expect(localToUTC('2027-01-15','10:00','Asia/Kolkata')).toBe('2027-01-15T04:30:00Z');
  });
  it('rejects nonexistent and repeated local start times rather than guessing',()=>{
    expect(()=>localToUTC('2027-03-14','02:30','America/Los_Angeles')).toThrow();
    expect(()=>localToUTC('2026-11-01','01:30','America/Los_Angeles')).toThrow();
  });
  it('rolls midnight to the next date',()=>expect(localToUTC('2027-01-15','24:00','UTC')).toBe('2027-01-16T00:00:00Z'));
  it('changes local calendar dates without changing stored moments',()=>{
    const windows=[span('2027-01-15T22:00:00Z','2027-01-15T23:00:00Z')];
    expect(localDate(windows[0].start,'Asia/Tokyo')).toBe('2027-01-16');
    expect(gridModel(windows,'Asia/Tokyo').days[0][0]).toBe('2027-01-16');
    expect(allSlots(windows)).toEqual(gridModel(windows,'Asia/Tokyo').days.flatMap(([,c])=>c.map(v=>v.stamp)));
  });
  it('keeps both repeated hours distinct on the fall-back date',()=>{
    const windows=[span(localToUTC('2026-11-01','00:00','America/Los_Angeles'),localToUTC('2026-11-01','04:00','America/Los_Angeles'))];
    const model=gridModel(windows,'America/Los_Angeles');
    expect(model.days[0][1]).toHaveLength(20);
    const repeated=model.days[0][1].filter(c=>c.minute===90);
    expect(repeated).toHaveLength(2);expect(repeated[0].stamp).not.toBe(repeated[1].stamp);
    expect(model.rows.filter(r=>r.minute===90)).toHaveLength(2);
  });
  it('has no selectable cells for the spring-forward missing hour',()=>{
    const model=gridModel([span(localToUTC('2027-03-14','00:00','America/Los_Angeles'),localToUTC('2027-03-14','04:00','America/Los_Angeles'))],'America/Los_Angeles');
    expect(model.days[0][1]).toHaveLength(12);expect(model.days[0][1].some(c=>c.minute>=120&&c.minute<180)).toBe(false);
  });
});
describe('whole meetings and compact storage',()=>{
  const start=Date.parse('2027-01-15T18:00Z');
  it('merges consecutive slots into one range',()=>expect(slotsToRanges([start,start+SLOT,start+2*SLOT,start])).toEqual([span('2027-01-15T18:00:00.000Z','2027-01-15T18:45:00.000Z')]));
  it('does not bridge a gap',()=>expect(contains([span('2027-01-15T18:00Z','2027-01-15T18:30Z'),span('2027-01-15T18:45Z','2027-01-15T19:00Z')],start,start+4*SLOT)).toBe(false));
  it('requires the same person to be free for the whole meeting',()=>{
    const event:MeetingEvent={id:'test',title:'Test',description:'',organizer_name:'Host',timezone:'UTC',duration:60,windows:[span('2027-01-15T18:00Z','2027-01-15T19:00Z')],final_start:null,final_end:null,responses:[
      {id:'a',name:'A',timezone:'UTC',revision:1,ranges:[span('2027-01-15T18:00Z','2027-01-15T18:30Z')]},
      {id:'b',name:'B',timezone:'UTC',revision:1,ranges:[span('2027-01-15T18:30Z','2027-01-15T19:00Z')]}
    ]};
    expect(bestTimes(event)[0].available).toEqual([]);
  });
  it('rejects forged availability outside the event and off-grid times',()=>{
    const windows=[span('2027-01-15T18:00Z','2027-01-15T19:00Z')];
    expect(()=>validateRanges([span('2027-01-15T17:00Z','2027-01-15T18:00Z')],windows)).toThrow();
    expect(()=>validateRanges([span('2027-01-15T18:01Z','2027-01-15T18:16Z')],windows)).toThrow();
    expect(()=>validateRanges([span('2027-01-15T18:00','2027-01-15T18:15')],windows)).toThrow();
  });
});
