import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SchedulePicker from '../src/components/SchedulePicker';
import AvailabilityGrid from '../src/components/AvailabilityGrid';
import { setLanguage } from '../src/lib/i18n';
import type { MeetingEvent } from '../src/lib/types';

afterEach(()=>{setLanguage('en');vi.unstubAllGlobals();});
describe('date and weekday scheduling modes',()=>{
  it('offers both modes and shows the date calendar by default',()=>{
    const html=renderToStaticMarkup(<SchedulePicker mode="dates" onModeChange={()=>{}} dates={[]} onDatesChange={()=>{}} weekdays={[1,7]} onWeekdaysChange={()=>{}} timezone="UTC"/>);
    expect(html).toContain('Specific Dates');expect(html).toContain('Days of the Week');
    expect(html).toContain('calendar-grid');expect(html).not.toContain('weekday-options');
  });
  it('shows seven localized weekday choices with no month or calendar dates',()=>{
    for(const [language,monday,sunday] of [['en','Monday','Sunday'],['zh','星期一','星期日'],['es','lunes','domingo']] as const){
      setLanguage(language);
      const html=renderToStaticMarkup(<SchedulePicker mode="weekdays" onModeChange={()=>{}} dates={['2027-01-15']} onDatesChange={()=>{}} weekdays={[1,7]} onWeekdaysChange={()=>{}} timezone="America/Los_Angeles"/>);
      expect(html).toContain(`aria-label="${monday}" aria-pressed="true"`);
      expect(html).toContain(`aria-label="${sunday}" aria-pressed="true"`);
      expect((html.match(/class="weekday-indicator"/g)||[]).length).toBe(7);
      expect(html).not.toContain('calendar-grid');expect(html).not.toContain('2027-01-15');
    }
  });
  it('uses Edit and Done and renders weekday labels without synthetic dates',()=>{
    vi.stubGlobal('window',{innerWidth:390});
    const event:MeetingEvent={id:'test',title:'Weekly',description:'',organizer_name:'',timezone:'America/Los_Angeles',schedule_mode:'weekdays',duration:60,windows:[{start:'2000-01-03T09:00:00Z',end:'2000-01-03T11:00:00Z'}],responses:[],final_start:null,final_end:null};
    const html=renderToStaticMarkup(<AvailabilityGrid event={event} zone="America/Los_Angeles" selected={new Set()} onChange={()=>{}}/>);
    expect(html).toContain('>Mon</strong>');expect(html).toContain('Los Angeles');
    expect(html).toContain('Edit</button>');expect(html).toContain('Done</button>');
    expect(html).not.toMatch(/range-adjust|> Mark<\/button>|> Clear<\/button>|> Scroll<\/button>/);
    expect(html.replace(/<[^>]*>/g,'')).not.toMatch(/Fine.Tune|Jan 3|2000|Start on a blank time/);
  });
});
