import { describe, expect, it, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { commonGround } from '../lib/server/common-ground';
import type { MeetingEvent, ResponseData, TimeRange } from '../src/lib/types';
import { setLanguage, t } from '../src/lib/i18n';
import { slotsToRanges } from '../src/lib/time';
import EventResults from '../src/screens/event/EventResults';
import ShareEventDialog from '../src/screens/event/ShareEventDialog';
const base = Date.parse('2027-01-15T09:00:00Z');
const range = (a: number, b: number): TimeRange => ({ start: new Date(base + a * 60000).toISOString(), end: new Date(base + b * 60000).toISOString() });
const person = (id: string, ranges: TimeRange[]): ResponseData => ({ id, name: id, ranges, timezone: 'UTC', revision: 1 });
afterEach(() => setLanguage('en'));

describe('variable-length shared matches', () => {
  it('merges touching ranges, tolerates overlapping ranges, and keeps true gaps', () => {
    const people = [person('A', [range(0, 60), range(45, 90)]), person('B', [range(0, 30), range(30, 90)])];
    expect(commonGround([range(0, 30), range(30, 90)], people)).toEqual([{ ...range(0, 90), available: ['A', 'B'], missing: [] }]);
    expect(commonGround([range(0, 30), range(60, 90)], people).map(c => ({ start: c.start, end: c.end }))).toEqual([range(0, 30), range(60, 90)]);
  });
  it('never combines secondary intervals whose unavailable person changes', () => {
    const result = commonGround([range(0, 60)], [person('A', [range(0, 60)]), person('B', [range(0, 30)]), person('C', [range(30, 60)])]);
    expect(result).toEqual([
      { ...range(0, 30), available: ['A', 'B'], missing: ['C'] },
      { ...range(30, 60), available: ['A', 'C'], missing: ['B'] },
    ]);
  });
  it('does not bridge everyone-free intervals with secondary intervals', () => {
    const result = commonGround([range(0, 90)], [person('A', [range(0, 90)]), person('B', [range(30, 60)])]);
    expect(result).toEqual([
      { ...range(30, 60), available: ['A', 'B'], missing: [] },
      { ...range(0, 30), available: ['A'], missing: ['B'] },
      { ...range(60, 90), available: ['A'], missing: ['B'] },
    ]);
  });
  it('supports one participant, empty responses, and more than 1,000 participants', () => {
    expect(commonGround([range(0, 60)], [])).toEqual([]);
    expect(commonGround([range(0, 60)], [person('A', [])])).toEqual([]);
    expect(commonGround([range(0, 60)], [person('A', [range(15, 30)])])).toEqual([{ ...range(15, 30), available: ['A'], missing: [] }]);
    const result = commonGround([range(0, 60)], Array.from({ length: 1001 }, (_, n) => person('P' + n, [range(0, 60)])));
    expect(result).toHaveLength(1); expect(result[0].available).toHaveLength(1001);
  });
  it('keeps every primary and secondary match beyond the old cutoff', () => {
    const ranges = Array.from({ length: 8 }, (_, n) => range(n * 30, n * 30 + 15));
    const result = commonGround([range(0, 240)], [person('A', [range(0, 240)]), person('B', ranges)]);
    expect(result.filter(c => !c.missing.length).map(c => c.start)).toEqual(ranges.map(r => r.start));
    expect(result.filter(c => c.missing.length === 1)).toHaveLength(8);
  });
  it('matches an independent cell-by-cell reference for many changing schedules', () => {
    let seed = 42;
    const next = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) % 5) > 1;
    for (let trial = 0; trial < 120; trial++) {
      const selections = Array.from({ length: 3 }, () => Array.from({ length: 12 }, next));
      const people = selections.map((cells, n) => person('P' + n, slotsToRanges(cells.flatMap((free, i) => free ? [base + i * 900000] : []))));
      const reference: { start: number; end: number; absent: number }[] = [];
      for (let i = 0; i < 12; i++) {
        const absent = selections.flatMap((cells, n) => cells[i] ? [] : [n]);
        if (absent.length > 1) continue;
        const who = absent[0] ?? -1, previous = reference.at(-1);
        if (previous?.end === i && previous.absent === who) previous.end = i + 1;
        else reference.push({ start: i, end: i + 1, absent: who });
      }
      const expected = reference.sort((a, b) => Number(a.absent !== -1) - Number(b.absent !== -1) || a.start - b.start).map(item => ({
        ...range(item.start * 15, item.end * 15), available: people.filter((_, n) => n !== item.absent).map(p => p.id), missing: item.absent === -1 ? [] : [people[item.absent].id],
      }));
      expect(commonGround([range(0, 180)], people)).toEqual(expected);
    }
  });
});

describe('shared results and sharing UI', () => {
  const responses = [person('A', [range(0, 90)]), person('B', [range(30, 60)])];
  const event: MeetingEvent = { id: 'shared', title: 'Event', organizer_name: '', description: '', timezone: 'UTC', windows: [range(0, 90)], responses };
  it('uses the existing result cards for both match categories in all languages', () => {
    for (const language of ['en', 'zh', 'es'] as const) {
      setLanguage(language);
      const html = renderToStaticMarkup(<EventResults event={event} zone="UTC" active={null} suggestions={commonGround(event.windows, responses)} weeklyView={null} onSelect={() => {}} onZoneChange={() => {}} onRefresh={() => {}}/>);
      expect(html).toContain(t('Primary Selection')); expect(html).toContain(t('Secondary Selection'));
      expect(html).toContain('suggestions-card'); expect(html).toContain('people-card');
      expect(html).not.toContain('Best 60-minute');
    }
  });
  it('shows individual availability, including an explicitly empty response', () => {
    const shown = { ...event, responses: [...responses, person('Unavailable guest', [])] };
    const html = renderToStaticMarkup(<EventResults event={shown} zone="UTC" active={null} suggestions={[]} weeklyView={null} onSelect={() => {}} onZoneChange={() => {}} onRefresh={() => {}}/>);
    expect(html).toContain('View Availability');
    expect(html).toContain('9:00'); expect(html).toContain('10:30');
    expect(html).toContain('No availability selected.');
    expect(html).not.toContain('editToken');
  });
  it('shares only the common event link', () => {
    const html = renderToStaticMarkup(<ShareEventDialog eventLink="https://whenkin.example/e/shared" copied="" onClose={() => {}} onCopy={async () => {}}/>);
    expect(html).toContain('Event Link'); expect(html).toContain('https://whenkin.example/e/shared');
    expect(html).not.toMatch(/organizer=|Organizer Link|Participant Link|Just for You/);
  });
});
