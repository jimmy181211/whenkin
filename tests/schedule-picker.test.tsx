import { renderToStaticMarkup } from 'react-dom/server';
import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import SchedulePicker from '../App/frontend/components/SchedulePicker';
import AvailabilityGrid from '../App/frontend/components/AvailabilityGrid';
import { setLanguage } from '../App/frontend/i18n/index';
import type { MeetingEvent } from '../App/shared/types';

afterEach(
  /* Restore English and browser globals after schedule-picker tests. */
  () => {
    setLanguage('en');
    vi.unstubAllGlobals();
  },
);
/** Group the date and weekday scheduling modes checks. */
describe('date and weekday scheduling modes', () => {
  /** Offers both modes and shows the date calendar by default. */
  it('offers both modes and shows the date calendar by default', () => {
    const html = renderToStaticMarkup(
      <SchedulePicker
        mode="dates"
        onModeChange={
          /* Keep schedule mode unchanged while checking dated-mode rendering. */
          () => {}
        }
        dates={[]}
        onDatesChange={
          /* Keep selected dates unchanged in this static schedule fixture. */
          () => {}
        }
        weekdays={[
          1,
          7,
        ]}
        onWeekdaysChange={
          /* Keep selected weekdays unchanged in the dated-mode fixture. */
          () => {}
        }
        timezone="UTC"
      />,
    );
    expect(html).toContain('Specific Dates');
    expect(html).toContain('Days of the Week');
    expect(html).toContain('calendar-grid');
    expect(html).not.toContain('weekday-options');
  });
  /** Shows seven localized weekday choices with no month or calendar dates. */
  it('shows seven localized weekday choices with no month or calendar dates', () => {
    for (const [language, monday, sunday] of [
      [
        'en',
        'Monday',
        'Sunday',
      ],
      [
        'zh',
        '星期一',
        '星期日',
      ],
      [
        'es',
        'lunes',
        'domingo',
      ],
    ] as const) {
      setLanguage(language);
      const html = renderToStaticMarkup(
        <SchedulePicker
          mode="weekdays"
          onModeChange={
            /* Leave weekly-mode selection unchanged during rendering assertions. */
            () => {}
          }
          dates={['2027-01-15']}
          onDatesChange={
            /* Keep the weekly fixture's inactive date selection unchanged. */
            () => {}
          }
          weekdays={[
            1,
            7,
          ]}
          onWeekdaysChange={
            /* Keep the weekly fixture's active weekdays unchanged. */
            () => {}
          }
          timezone="America/Los_Angeles"
        />,
      );
      expect(html).toContain(`aria-label="${monday}" aria-pressed="true"`);
      expect(html).toContain(`aria-label="${sunday}" aria-pressed="true"`);
      expect((html.match(/class="weekday-indicator"/g) || []).length).toBe(7);
      expect(html).not.toContain('calendar-grid');
      expect(html).not.toContain('2027-01-15');
    }
  });
  /**
   * Offers personal and group views with weekday labels without synthetic
   * dates.
   */
  it('offers personal and group views with weekday labels without synthetic dates', () => {
    vi.stubGlobal('window', { innerWidth: 390 });
    const event: MeetingEvent = {
      id: 'test',
      title: 'Weekly',
      description: '',
      organizer_name: '',
      timezone: 'America/Los_Angeles',
      schedule_mode: 'weekdays',
      windows: [
        {
          start: '2000-01-03T09:00:00Z',
          end: '2000-01-03T11:00:00Z',
        },
      ],
      responses: [],
    };
    const html = renderToStaticMarkup(
      <AvailabilityGrid
        event={event}
        zone="America/Los_Angeles"
        selected={new Set()}
        onChange={
          /* Leave weekday selection unchanged while checking translated labels. */
          () => {}
        }
      />,
    );
    expect(html).toContain('>Mon</strong>');
    expect(html).toContain('Los Angeles');
    expect(html).toContain('Your Availability</button>');
    expect(html).toContain('Group Availability</button>');
    expect(html).not.toMatch(
      /range-adjust|> Mark<\/button>|> Clear<\/button>|> Scroll<\/button>/,
    );
    expect(html.replace(/<[^>]*>/g, '')).not.toMatch(
      /Fine.Tune|Jan 3|2000|Start on a blank time/,
    );
  });
});
