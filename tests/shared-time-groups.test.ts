import { describe, expect, it } from 'vitest';
import { groupSharedTimes } from '../src/lib/shared-time-groups';
import { projectWeekly } from '../src/lib/weekly';
import type { Candidate } from '../src/lib/types';
const candidate=(start:string,end:string):Candidate=>({start,end,available:['A','B']});
describe('shared times grouped by displayed day',()=>{
  it('groups disjoint ranges without merging them and keeps each original selection',()=>{
    const late=candidate('2027-01-15T22:00:00Z','2027-01-15T23:00:00Z');
    const early=candidate('2027-01-15T19:00:00Z','2027-01-15T21:00:00Z');
    const next=candidate('2027-01-16T19:00:00Z','2027-01-16T20:00:00Z');
    const groups=groupSharedTimes([next,late,early],'America/Los_Angeles');
    expect(groups.map(g=>g.date)).toEqual(['2027-01-15','2027-01-16']);
    expect(groups[0].entries.map(e=>e.candidate)).toEqual([early,late]);
    expect(groups[0].entries[1].candidate).toBe(late);
    expect(early.end).toBe('2027-01-15T21:00:00Z');
  });
  it('uses local calendar dates rather than UTC dates when zones change',()=>{
    const a=candidate('2027-01-16T00:00:00Z','2027-01-16T01:00:00Z');
    const b=candidate('2027-01-16T10:00:00Z','2027-01-16T11:00:00Z');
    expect(groupSharedTimes([a,b],'UTC')).toHaveLength(1);
    expect(groupSharedTimes([a,b],'America/Los_Angeles').map(g=>g.date)).toEqual(['2027-01-15','2027-01-16']);
  });
  it('keeps a cross-midnight range intact with its original end date',()=>{
    const a=candidate('2027-01-15T23:00:00Z','2027-01-16T01:00:00Z');
    const groups=groupSharedTimes([a],'UTC');
    expect(groups[0].date).toBe('2027-01-15');expect(groups[0].entries[0].shown.end).toBe(a.end);
    expect(groupSharedTimes([],'UTC')).toEqual([]);
  });
  it('groups projected weekly times by displayed weekday while retaining canonical selection',()=>{
    const a=candidate('2000-01-03T09:00:00Z','2000-01-03T10:00:00Z');
    const b=candidate('2000-01-03T11:00:00Z','2000-01-03T12:00:00Z');
    const projection=projectWeekly({windows:[a,b],timezone:'Asia/Tokyo',created_at:'2027-01-15T00:00:00Z'},'America/Los_Angeles');
    const groups=groupSharedTimes([a,b],'UTC',projection.range);
    expect(groups[0].date).toBe('2000-01-09');
    expect(groups[0].entries.map(e=>e.candidate)).toEqual([a,b]);
    expect(groups[0].entries[0].shown.start).not.toBe(a.start);
  });
});
