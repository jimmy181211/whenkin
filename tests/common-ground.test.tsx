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

describe('everyone-free common ground', () => {
  it('merges touching ranges, tolerates overlapping ranges, and keeps true event gaps', () => {
    const people = [person('A', [range(0, 60), range(45, 90)]), person('B', [range(0, 30), range(30, 90)])];
    expect(commonGround([range(0, 30), range(30, 90)], people)).toEqual([{ ...range(0, 90), available: ['A', 'B'] }]);
    expect(commonGround([range(0, 30), range(60, 90)], people).map(c => ({ start: c.start, end: c.end }))).toEqual([range(0, 30), range(60, 90)]);
  });
  it('does not offer secondary matches when one of three respondents is always missing', () => {
    expect(commonGround([range(0, 60)], [person('A', [range(0, 60)]), person('B', [range(0, 30)]), person('C', [range(30, 60)])])).toEqual([]);
  });
  it('returns only the full-group intersection, without extending into partial availability', () => {
    expect(commonGround([range(0, 90)], [person('A', [range(0, 90)]), person('B', [range(30, 60)])])).toEqual([{ ...range(30, 60), available: ['A', 'B'] }]);
  });
  it('supports zero, one, empty, and more than 1,000 respondents', () => {
    expect(commonGround([range(0, 60)], [])).toEqual([]);
    expect(commonGround([range(0, 60)], [person('A', [])])).toEqual([]);
    expect(commonGround([range(0, 60)], [person('A', [range(15, 30)])])).toEqual([{ ...range(15, 30), available: ['A'] }]);
    expect(commonGround([range(0, 60)], [person('A', [range(0, 60)]), person('B', [])])).toEqual([]);
    const result = commonGround([range(0, 60)], Array.from({ length: 1001 }, (_, n) => person('P' + n, [range(0, 60)])));
    expect(result).toHaveLength(1); expect(result[0].available).toHaveLength(1001);
  });
  it('keeps every everyone-free period in chronological order', () => {
    const ranges = Array.from({ length: 8 }, (_, n) => range(n * 30, n * 30 + 15));
    expect(commonGround([range(0, 240)], [person('A', [range(0, 240)]), person('B', ranges)]).map(c => ({start:c.start,end:c.end}))).toEqual(ranges);
  });
  it('matches an independent cell-by-cell reference across changing schedules', () => {
    let seed = 42;
    const next = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) % 5) > 1;
    for (let trial = 0; trial < 120; trial++) {
      const selections = Array.from({ length: 3 }, () => Array.from({ length: 12 }, next));
      const people = selections.map((cells, n) => person('P' + n, slotsToRanges(cells.flatMap((free, i) => free ? [base + i * 900000] : []))));
      const common = selections[0].flatMap((_, i) => selections.every(cells => cells[i]) ? [base + i * 900000] : []);
      expect(commonGround([range(0, 180)], people)).toEqual(slotsToRanges(common).map(r => ({...r,available:people.map(p=>p.id)})));
    }
  });
});

describe('shared result and editing UI', () => {
  const responses = [person('A', [range(0, 90)]), person('B', [range(30, 60)])];
  const event: MeetingEvent = { id: 'shared', title: 'Event', organizer_name: '', description: '', timezone: 'UTC', windows: [range(0, 90)], responses };
  it('shows only primary cards and makes every member selectable in all languages', () => {
    for (const language of ['en', 'zh', 'es'] as const) {
      setLanguage(language);
      const html = renderToStaticMarkup(<EventResults event={event} editingId="B" onEditResponse={()=>{}} zone="UTC" active={null} suggestions={commonGround(event.windows, responses)} weeklyView={null} onSelect={() => {}} onZoneChange={() => {}} onRefresh={() => {}}/>);
      expect(html).toContain(t('Primary Selection')); expect(html).not.toMatch(/Secondary Selection|备选时间|Selección secundaria/);
      expect(html).toContain('suggestions-card'); expect(html).toContain('people-card');
      expect(html).toContain(t('Edit {name}',{name:'A'}));expect(html).toContain(t('Edit {name}',{name:'B'}));
      expect(html).toMatch(/<button[^>]*class="person"[^>]*aria-pressed="true"/);
      expect(html).toContain(t('Add Response'));expect(html).not.toContain('(you)');
    }
  });
  it('shares one event link and has no private link controls', () => {
    const html = renderToStaticMarkup(<ShareEventDialog eventLink="https://whenkin.example/e/shared" copied="" onClose={() => {}} onCopy={async () => {}}/>);
    expect(html).toContain('Event Link'); expect(html).toContain('https://whenkin.example/e/shared');
    expect(html).not.toMatch(/organizer=|#edit=|Private|Participant Link/);
  });
});
