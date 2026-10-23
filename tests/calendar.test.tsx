import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Temporal } from '@js-temporal/polyfill';
import Calendar, { clampCalendarMonth } from '../src/components/Calendar';
import { setLanguage, t } from '../src/lib/i18n';

afterEach(()=>{setLanguage('en');vi.useRealTimers();});
describe('calendar month and year navigation',()=>{
  it('clamps year jumps to the selectable range and handles leap years',()=>{
    const today=Temporal.PlainDate.from('2026-10-23');
    expect(clampCalendarMonth(Temporal.PlainDate.from('2026-02-01'),today).toString()).toBe('2026-10-01');
    expect(clampCalendarMonth(Temporal.PlainDate.from('2027-12-01'),today).toString()).toBe('2027-10-01');
    expect(clampCalendarMonth(Temporal.PlainDate.from('2027-03-01'),today).toString()).toBe('2027-03-01');
    expect(clampCalendarMonth(Temporal.PlainDate.from('2028-02-29'),Temporal.PlainDate.from('2028-01-31')).toString()).toBe('2028-02-01');
  });
  it('renders localized month/year choices and disables months before the date range',()=>{
    vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-23T12:00:00Z'));
    for(const [language,october] of [['en','October'],['zh','十月'],['es','octubre']] as const){
      setLanguage(language);
      const html=renderToStaticMarkup(<Calendar timezone="UTC" value={['2026-10-25']} onChange={()=>{}}/>);
      expect(html).toContain(`aria-label="${t('Month')}"`);expect(html).toContain(`aria-label="${t('Year')}"`);
      expect(html).toContain(`<option value="10" selected="">${october}</option>`);
      expect(html).toContain('<option value="2026" selected="">2026</option>');expect(html).toContain('<option value="2027">2027</option>');
      expect(html).toMatch(/<option value="1" disabled=""/);
      expect(html).toMatch(/aria-label="2026-10-25" aria-pressed="true"/);
    }
  });
});
