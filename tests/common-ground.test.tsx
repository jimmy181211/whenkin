import {
  describe,
  expect,
  it,
  afterEach,
} from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { commonGround } from '../App/backend/shared/common-ground';
import type {
  MeetingEvent,
  ResponseData,
  TimeRange,
} from '../App/shared/types';
import {
  setLanguage,
  t,
} from '../App/frontend/i18n/index';
import { slotsToRanges } from '../App/frontend/utils/time';
import EventResults from '../App/frontend/components/event/EventResults';
import ShareEventDialog from '../App/frontend/components/event/ShareEventDialog';
const base = Date.parse('2027-01-15T09:00:00Z');

/**
 * Build a time range from minute offsets within the shared-time fixture.
 * @returns An ISO range built from minute offsets within the fixture timeline.
 */
const range = (a: number, b: number): TimeRange => ({
  start: new Date(base + a * 60000).toISOString(),
  end: new Date(base + b * 60000).toISOString(),
});

/**
 * Build one responder with the supplied saved ranges.
 * @returns A saved-response fixture with the supplied id and ranges at revision one.
 */
const person = (id: string, ranges: TimeRange[]): ResponseData => ({
  id,
  name: id,
  ranges,
  timezone: 'UTC',
  revision: 1,
});

afterEach(
  /* Restore English after localized shared-time rendering checks. */
  () => setLanguage('en'),
);

/** Group the everyone-free common ground checks. */
describe('everyone-free common ground', () => {
  /**
   * Merges touching ranges, tolerates overlapping ranges, and keeps true
   * event gaps.
   */
  it('merges touching ranges, tolerates overlapping ranges, and keeps true event gaps', () => {
    const people = [
      person('A', [
        range(0, 60),
        range(45, 90),
      ]),
      person('B', [
        range(0, 30),
        range(30, 90),
      ]),
    ];
    expect(commonGround([
      range(0, 30),
      range(30, 90),
    ], people)).toEqual([
      {
        ...range(0, 90),
        available: [
          'A',
          'B',
        ],
      },
    ]);
    expect(
      commonGround([
        range(0, 30),
        range(60, 90),
      ], people).map(
        /* Compare only start and end values of the calculated shared ranges. */
        (c) => ({
          start: c.start,
          end: c.end,
        }),
      ),
    ).toEqual([
      range(0, 30),
      range(60, 90),
    ]);
  });
  /**
   * Does not offer secondary matches when one of three respondents is
   * always missing.
   */
  it('does not offer secondary matches when one of three respondents is always missing', () => {
    expect(
      commonGround(
        [range(0, 60)],
        [
          person('A', [range(0, 60)]),
          person('B', [range(0, 30)]),
          person('C', [range(30, 60)]),
        ],
      ),
    ).toEqual([]);
  });
  /**
   * Returns only the full-group intersection, without extending into
   * partial availability.
   */
  it('returns only the full-group intersection, without extending into partial availability', () => {
    expect(
      commonGround(
        [range(0, 90)],
        [
          person('A', [range(0, 90)]),
          person('B', [range(30, 60)]),
        ],
      ),
    ).toEqual([
      {
        ...range(30, 60),
        available: [
          'A',
          'B',
        ],
      },
    ]);
  });
  /** Supports zero, one, empty, and more than 1,000 respondents. */
  it('supports zero, one, empty, and more than 1,000 respondents', () => {
    expect(commonGround([range(0, 60)], [])).toEqual([]);
    expect(commonGround([range(0, 60)], [person('A', [])])).toEqual([]);
    expect(
      commonGround([range(0, 60)], [person('A', [range(15, 30)])]),
    ).toEqual([
      {
        ...range(15, 30),
        available: ['A'],
      },
    ]);
    expect(
      commonGround(
        [range(0, 60)],
        [
          person('A', [range(0, 60)]),
          person('B', []),
        ],
      ),
    ).toEqual([]);
    const result = commonGround(
      [range(0, 60)],
      Array.from(
        { length: 1001 },
        /* Build many fully available responders to check the intersection limit. */
        (_, n) => person('P' + n, [range(0, 60)]),
      ),
    );
    expect(result).toHaveLength(1);
    expect(result[0].available).toHaveLength(1001);
  });
  /** Keeps every everyone-free period in chronological order. */
  it('keeps every everyone-free period in chronological order', () => {
    const ranges = Array.from(
      { length: 8 },
      /* Build separated fixture ranges with regular gaps. */
      (_, n) => range(n * 30, n * 30 + 15),
    );
    expect(
      commonGround(
        [range(0, 240)],
        [
          person('A', [range(0, 240)]),
          person('B', ranges),
        ],
      ).map(
        /* Compare range boundaries independently of available-person metadata. */
        (c) => ({
          start: c.start,
          end: c.end,
        }),
      ),
    ).toEqual(ranges);
  });
  /**
   * Matches an independent cell-by-cell reference across changing
   * schedules.
   */
  it('matches an independent cell-by-cell reference across changing schedules', () => {
    let seed = 42;

    /** Generate deterministic random selections for intersection comparisons. */
    const next = () => (seed = (seed * 1664525 + 1013904223) >>> 0) % 5 > 1;

    for (let trial = 0; trial < 120; trial++) {
      const selections = Array.from(
        { length: 3 },
        /* Generate one fixture person's selection across twelve possible slots. */
        () => Array.from({ length: 12 }, next),
      );
      const people = selections.map(
        /* Convert each random selection into a saved responder fixture. */
        (cells, n) =>
          person(
            'P' + n,
            slotsToRanges(
              cells.flatMap(
                /* Keep timestamps for the slots marked free in this random selection. */
                (free, i) => (free ? [base + i * 900000] : []),
              ),
            ),
          ),
      );
      const common = selections[0].flatMap(
        /* Build the reference intersection by requiring every person's slot to be free. */
        (_, i) =>
          selections.every(
            /* Check this slot against one person's generated selection. */
            (cells) => cells[i],
          )
            ? [base + i * 900000]
            : [],
      );
      expect(commonGround([range(0, 180)], people)).toEqual(
        slotsToRanges(common).map(
          /* Attach all responder ids to the reference shared-time ranges. */
          (r) => ({
            ...r,
            available: people.map(
              /* Collect the responder ids expected on every full intersection. */
              (p) => p.id,
            ),
          }),
        ),
      );
    }
  });
});

/** Group the shared result and editing UI checks. */
describe('shared result and editing UI', () => {
  const responses = [
    person('A', [range(0, 90)]),
    person('B', [range(30, 60)]),
  ];
  const event: MeetingEvent = {
    id: 'shared',
    title: 'Event',
    organizer_name: '',
    description: '',
    timezone: 'UTC',
    windows: [range(0, 90)],
    responses,
  };
  /**
   * Shows only everyone-available cards and makes every member selectable
   * in all languages.
   */
  it('shows only everyone-available cards and makes every member selectable in all languages', () => {
    for (const language of [
      'en',
      'zh',
    ] as const) {
      setLanguage(language);
      const html = renderToStaticMarkup(
        <EventResults
          onDeleteResponse={
            /* Return a failed deletion result without changing this rendering fixture. */
            async () => false
          }
          event={event}
          editingId="B"
          onEditResponse={
            /* Leave the responder unchanged during this static rendering check. */
            () => {}
          }
          highlighted={false}
          suggestions={commonGround(event.windows, responses)}
          onToggleHighlight={
            /* Leave highlight state unchanged while checking result markup. */
            () => {}
          }
        />,
      );
      expect(html).toContain(t('When Everyone Is Free'));
      expect(html).toContain(t('Responders'));
      expect(html).not.toContain(t('Primary Selection'));
      expect(html).not.toMatch(
        /Secondary Selection|备选时间|Selección secundaria/,
      );
      expect(html).toContain('suggestions-card');
      expect(html).toContain('people-card');
      expect(html).not.toContain('best-badge');
      expect(html).not.toContain('attendance-dots');
      expect(html).toContain(t('Edit {name}', { name: 'A' }));
      expect(html).toContain(t('Edit {name}', { name: 'B' }));
      expect(html).toMatch(
        /<button[^>]*class="person"[^>]*aria-pressed="true"/,
      );
      expect(html).not.toContain('Add Response');
      expect(html).toContain(t('Delete {name}', { name: 'A' }));
      expect(html).toContain(t('Delete {name}', { name: 'B' }));
      expect(html).not.toContain('(you)');
    }
  });
  /**
   * Offers one toggle for all disjoint periods and no individual date
   * cards.
   */
  it('offers one toggle for all disjoint periods and no individual date cards', () => {
    const suggestions = [
      {
        start: '2027-01-15T19:00:00Z',
        end: '2027-01-15T21:00:00Z',
        available: [
          'A',
          'B',
        ],
      },
      {
        start: '2027-01-15T22:00:00Z',
        end: '2027-01-15T23:00:00Z',
        available: [
          'A',
          'B',
        ],
      },
      {
        start: '2027-01-16T19:00:00Z',
        end: '2027-01-16T20:00:00Z',
        available: [
          'A',
          'B',
        ],
      },
    ];
    const html = renderToStaticMarkup(
      <EventResults
        onDeleteResponse={
          /* Keep the second rendering fixture's deletion callback unsuccessful. */
          async () => false
        }
        event={event}
        highlighted={true}
        suggestions={suggestions}
        onEditResponse={
          /* Leave this fixture's editor state untouched. */
          () => {}
        }
        onToggleHighlight={
          /* Leave this fixture's highlight state untouched. */
          () => {}
        }
      />,
    );
    expect(html).not.toContain('<article ');
    expect(html).not.toContain('suggestion-zone');
    expect(html).not.toContain('suggestion-select');
    expect(html).toContain('Cancel Highlight');
    expect(html).toContain('3 shared time periods');
    expect(html.indexOf('people-card')).toBeLessThan(
      html.indexOf('suggestions-card'),
    );
    expect(html).toMatch(/highlight-shared-times" aria-pressed="true"/);
    let depth = 0;
    for (const tag of html.match(/<\/?button\b[^>]*>/g) ?? []) {
      depth += tag.startsWith('</') ? -1 : 1;
      expect(depth).toBeLessThanOrEqual(1);
    }
    expect(depth).toBe(0);
  });
  /** Shares one event link and has no private link controls. */
  it('shares one event link and has no private link controls', () => {
    const html = renderToStaticMarkup(
      <ShareEventDialog
        eventLink="https://whenkin.example/e/shared"
        copied=""
        onClose={
          /* Keep the sharing dialog open for a static markup assertion. */
          () => {}
        }
        onCopy={
          /* Complete the copy callback without accessing the real clipboard. */
          async () => {}
        }
      />,
    );
    expect(html).toContain('Event Link');
    expect(html).toContain('https://whenkin.example/e/shared');
    expect(html).not.toMatch(/organizer=|#edit=|Private|Participant Link/);
  });
});
