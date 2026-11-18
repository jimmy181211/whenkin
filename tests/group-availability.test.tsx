import { renderToStaticMarkup } from 'react-dom/server';
import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import AvailabilityGrid from '../App/frontend/components/AvailabilityGrid';
import SlotDetails from '../App/frontend/components/SlotDetails';
import Toast from '../App/frontend/components/Toast';
import {
  groupAvailability,
  availabilityColor,
  inspectAvailability,
} from '../App/frontend/utils/group-availability';
import {
  setLanguage,
  t,
} from '../App/frontend/i18n/index';
import type { MeetingEvent } from '../App/shared/types';
const stamp = Date.parse('2027-01-15T09:00:00Z');

/**
 * Build group-availability fixture ranges from minute offsets.
 * @returns An ISO range at the supplied minute offsets from the group fixture start.
 */
const range = (from: number, to: number) => ({
  start: new Date(stamp + from * 60000).toISOString(),
  end: new Date(stamp + to * 60000).toISOString(),
});

const event: MeetingEvent = {
  id: 'test',
  title: 'Event',
  organizer_name: '',
  description: '',
  timezone: 'UTC',
  windows: [range(0, 60)],
  responses: [
    {
      id: 'A',
      name: 'A',
      timezone: 'UTC',
      revision: 1,
      ranges: [
        range(0, 30),
        range(15, 45),
      ],
    },
    {
      id: 'B',
      name: 'B',
      timezone: 'America/New_York',
      revision: 1,
      ranges: [range(15, 30)],
    },
  ],
};
afterEach(
  /* Restore browser globals and English after each group-grid test. */
  () => {
    vi.unstubAllGlobals();
    setLanguage('en');
  },
);
/** Group the group availability checks. */
describe('group availability', () => {
  /**
   * Highlights all shared portions without painting an unavailable
   * half-slot or changing the personal selection.
   */
  it('highlights all shared portions without painting an unavailable half-slot or changing the personal selection', () => {
    vi.stubGlobal('window', { innerWidth: 390 });
    const shared = [
      range(15, 30),
      range(45, 60),
    ];
    const html = renderToStaticMarkup(
      <AvailabilityGrid
        event={event}
        zone="UTC"
        selected={new Set([stamp])}
        view="group"
        highlights={shared}
        onChange={
          /* Fail if shared-time highlighting unexpectedly edits a saved response. */
          () => {
            throw Error('Highlight must not edit a response');
          }
        }
      />,
    );
    expect(html.match(/shared-highlight-slice/g)).toHaveLength(2);
    expect(html.match(/top:50%;height:50%/g)).toHaveLength(2);
    expect(html).not.toContain(' painted');
    const personal = renderToStaticMarkup(
      <AvailabilityGrid
        event={event}
        zone="UTC"
        selected={new Set([stamp])}
        view="personal"
        highlights={shared}
        onChange={
          /* Keep personal selections unchanged during static grid rendering. */
          () => {}
        }
      />,
    );
    expect(personal).not.toContain('shared-highlight-slice');
    expect(personal).toContain('partial');
  });
  /**
   * Lists full-block availability separately from partial and empty
   * responses.
   */
  it('lists full-block availability separately from partial and empty responses', () => {
    const inspected = inspectAvailability(
      [
        ...event.responses,
        {
          id: 'C',
          name: 'C',
          timezone: 'UTC',
          revision: 1,
          ranges: [],
        },
      ],
      [
        stamp,
        stamp + 900000,
      ],
    );
    expect(
      inspected.available.map(
        /* Compare fully available responders by id. */
        (p) => p.id,
      ),
    ).toEqual(['A']);
    expect(
      inspected.unavailable.map(
        /* Compare unavailable responders and their partial-match flags. */
        (p) => [
          p.id,
          p.partial,
        ],
      ),
    ).toEqual([
      [
        'B',
        true,
      ],
      [
        'C',
        false,
      ],
    ]);
    expect(
      inspectAvailability(event.responses, [stamp + 2700000]).available,
    ).toEqual([]);
    expect(inspectAvailability([], [stamp])).toEqual({
      available: [],
      unavailable: [],
    });
  });

  /** Shows responder names and marks partial availability in each language. */
  it('shows responder names and marks partial availability in each language', () => {
    for (const language of [
      'en',
      'zh',
      'es',
    ] as const) {
      setLanguage(language);
      const html = renderToStaticMarkup(
        <SlotDetails
          event={event}
          zone="UTC"
          inspection={{
            stamps: [
              stamp,
              stamp + 900000,
            ],
            range: range(0, 30),
          }}
        />,
      );
      expect(html).toContain(t('Availability at This Time'));
      expect(html).toContain('A</span>');
      expect(html).toContain('B<small>');
      expect(html).toContain(t('Partly available'));
      expect(html).toContain('slot-presence available');
      expect(html).toContain('slot-presence unavailable');
    }
  });
  /**
   * Uses distinct colors for zero through six people and a dark
   * all-available endpoint.
   */
  it('uses distinct colors for zero through six people and a dark all-available endpoint', () => {
    const colors = Array.from(
      { length: 7 },
      /* Generate heatmap colors for increasing available-person counts. */
      (_, n) => availabilityColor(n, 6),
    );
    expect(new Set(colors).size).toBe(7);
    expect(colors[0]).toBe('#fafbf8');
    expect(colors[6]).toContain('var(--primary) 100%');
    expect(availabilityColor(0, 0)).toBe('#fafbf8');
  });
  /**
   * Counts distinct saved people at each UTC instant, including
   * overlapping ranges.
   */
  it('counts distinct saved people at each UTC instant, including overlapping ranges', () => {
    expect([...groupAvailability(event.responses)]).toEqual([
      [
        stamp,
        1,
      ],
      [
        stamp + 900000,
        2,
      ],
      [
        stamp + 1800000,
        1,
      ],
    ]);
    expect(groupAvailability([]).size).toBe(0);
  });
  /**
   * Shows exact 15-minute group counts in the same grid across zones,
   * widths, and languages.
   */
  it('shows exact 15-minute group counts in the same grid across zones, widths, and languages', () => {
    for (const width of [
      390,
      1280,
    ]) {
      for (const language of [
        'en',
        'zh',
        'es',
      ] as const) {
        vi.stubGlobal('window', { innerWidth: width });
        setLanguage(language);
        const html = renderToStaticMarkup(
          <AvailabilityGrid
            event={event}
            zone="America/New_York"
            selected={new Set()}
            view="group"
            canEdit={false}
            onChange={
              /* Fail if a group-view interaction reaches the editing callback. */
              () => {
                throw Error('Group editing is forbidden');
              }
            }
          />,
        );
        expect(html).toContain('group-mode');
        expect(html).toContain('group-legend');
        expect(html).toContain('var(--primary) 50%');
        expect(html).toContain('var(--primary) 100%');
        expect(html).toContain(t('Group Availability'));
        expect(html).not.toContain('class="time-cell hour-start painted');
      }
    }
  });
});
/** Group the shared link and name notice checks. */
describe('shared link and name notice', () => {
  /** Uses a compact, nonblocking live notification in every language. */
  it('uses a compact, nonblocking live notification in every language', () => {
    for (const language of [
      'en',
      'zh',
      'es',
    ] as const) {
      setLanguage(language);
      const html = renderToStaticMarkup(
        <Toast
          anchor={null}
          message="Enter your name before editing availability."
          onDismiss={
            /* Keep the reminder fixture mounted for its markup check. */
            () => {}
          }
        />,
      );
      expect(html).not.toContain('<dialog');
      expect(html).toContain('role="status"');
      expect(html).toContain('aria-live="polite"');
      expect(html).toContain(t('Enter your name before editing availability.'));
    }
  });
});
