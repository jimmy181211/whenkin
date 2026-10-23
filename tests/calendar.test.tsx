import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Temporal } from '@js-temporal/polyfill';
import Calendar, { clampCalendarMonth } from '../src/components/Calendar';
import { setLanguage, t } from '../src/lib/i18n';
import { isEventDateAllowed } from '../src/lib/date-limits';

afterEach(()=>{setLanguage('en');vi.useRealTimers();});
describe('calendar month and year navigation',()=>{
  it('allows every month from 2026 through 2050 and clamps only outside those years',()=>{
    expect(clampCalendarMonth(Temporal.PlainDate.from('2025-12-01')).toString()).toBe('2026-01-01');
    expect(clampCalendarMonth(Temporal.PlainDate.from('2051-01-01')).toString()).toBe('2050-12-01');
    expect(clampCalendarMonth(Temporal.PlainDate.from('2028-02-29')).toString()).toBe('2028-02-01');
    expect(clampCalendarMonth(Temporal.PlainDate.from('2050-12-31')).toString()).toBe('2050-12-01');
  });
  it('permits future dates through 2050 while blocking past dates and later years',()=>{
    const today=Temporal.PlainDate.from('2026-10-23');
    for(const date of ['2026-10-23','2028-02-29','2050-12-31'])expect(isEventDateAllowed(Temporal.PlainDate.from(date),today)).toBe(true);
    for(const date of ['2026-10-22','2025-12-31','2051-01-01'])expect(isEventDateAllowed(Temporal.PlainDate.from(date),today)).toBe(false);
  });
  it('renders all 25 years and localized month choices without blocking past-month browsing',()=>{
    vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-23T12:00:00Z'));
    for(const [language,october] of [['en','October'],['zh','十月'],['es','octubre']] as const){
      setLanguage(language);
      const html=renderToStaticMarkup(<Calendar timezone="UTC" value={['2026-10-25']} onChange={()=>{}}/>);
      expect(html).toContain(`aria-label="${t('Month')}"`);expect(html).toContain(`aria-label="${t('Year')}"`);
      expect(html).toContain(`<option value="10" selected="">${october}</option>`);
      expect(html).toContain('<option value="2026" selected="">2026</option>');expect(html).toContain('<option value="2027">2027</option>');
      expect(html).toContain('<option value="2028">2028</option>');expect(html).toContain('<option value="2050">2050</option>');
      expect(html).not.toContain('2051');expect(html).not.toMatch(/<option[^>]*disabled/);
      expect(html).toMatch(/aria-label="2026-10-21" aria-pressed="false" disabled=""/);
      expect(html).toMatch(/aria-label="2026-10-25" aria-pressed="true"/);
    }
  });
});
