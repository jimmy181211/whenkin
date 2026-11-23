import { renderToStaticMarkup } from 'react-dom/server';
import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { Temporal } from '@js-temporal/polyfill';
import Calendar, {
  clampCalendarMonth,
} from '../App/frontend/components/Calendar';
import {
  setLanguage,
  t,
} from '../App/frontend/i18n/index';
import {
  isEventDateAllowed,
  parseEventYear,
} from '../App/shared/date-limits';

afterEach(
  /* Restore English and real timers after each calendar test. */
  () => {
    setLanguage('en');
    vi.useRealTimers();
  },
);
/** Group the calendar month and year navigation checks. */
describe('calendar month and year navigation', () => {
  /**
   * Allows every month from 2026 through 9999 and clamps only outside
   * those years.
   */
  it('allows every month from 2026 through 9999 and clamps only outside those years', () => {
    expect(
      clampCalendarMonth(Temporal.PlainDate.from('2025-12-01')).toString(),
    ).toBe('2026-01-01');
    expect(
      clampCalendarMonth(Temporal.PlainDate.from('+010000-01-01')).toString(),
    ).toBe('9999-12-01');
    expect(
      clampCalendarMonth(Temporal.PlainDate.from('2028-02-29')).toString(),
    ).toBe('2028-02-01');
    expect(
      clampCalendarMonth(Temporal.PlainDate.from('9999-12-31')).toString(),
    ).toBe('9999-12-01');
    expect(clampCalendarMonth(Temporal.PlainDate.from('2070-06-15')).year).toBe(
      2070,
    );
  });
  /**
   * Permits future dates through 9999 while blocking past dates and later
   * years.
   */
  it('permits future dates through 9999 while blocking past dates and later years', () => {
    const today = Temporal.PlainDate.from('2026-10-23');
    for (const date of [
      '2026-10-23',
      '2028-02-29',
      '2070-12-31',
      '9999-12-31',
    ]) {
      expect(isEventDateAllowed(Temporal.PlainDate.from(date), today)).toBe(
        true,
      );
    }
    for (const date of [
      '2026-10-22',
      '2025-12-31',
      '+010000-01-01',
    ]) {
      expect(isEventDateAllowed(Temporal.PlainDate.from(date), today)).toBe(
        false,
      );
    }
  });
  /**
   * Renders editable localized month and year controls without blocking
   * past-month browsing.
   */
  it('renders editable localized month and year controls without blocking past-month browsing', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-23T12:00:00Z'));
    for (const [language, october] of [
      [
        'en',
        'October',
      ],
      [
        'zh',
        '十月',
      ],
    ] as const) {
      setLanguage(language);
      const html = renderToStaticMarkup(
        <Calendar
          timezone="UTC"
          value={['2026-10-25']}
          onChange={
            /* Keep date selection unchanged in this render-only calendar fixture. */
            () => {}
          }
        />,
      );
      expect(html).toContain(`aria-label="${t('Month')}"`);
      expect(html).toContain(`aria-label="${t('Year')}"`);
      expect(html.match(/role="combobox"/g)).toHaveLength(1);
      expect(html).toContain('type="number"');
      expect(html).toContain('min="2026" max="9999" step="1"');
      expect(html).toContain(`value="${october}"`);
      expect(html).toContain('value="2026"');
      expect(html).toContain('inputMode="numeric"');
      expect(html).toMatch(
        /aria-label="2026-10-21" aria-pressed="false" disabled=""/,
      );
      expect(html).toMatch(/aria-label="2026-10-25" aria-pressed="true"/);
      expect(html).not.toContain('calendar-foot');
    }
  });

  /** Accept free whole years while rejecting partial, nonnumeric, and out-of-range edits. */
  it('validates numeric years without requiring matching options', () => {
    for (const value of [
      '2026',
      '2070',
      '9999',
    ]) {
      expect(parseEventYear(value)).toBe(Number(value));
    }
    for (const value of [
      '',
      '202',
      '2025',
      '10000',
      '2070.5',
      '2e3',
      'text',
    ]) {
      expect(parseEventYear(value)).toBeNull();
    }
  });
});
