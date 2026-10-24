import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AvailabilityGrid from '../src/components/AvailabilityGrid';
import Toast from '../src/components/Toast';
import { groupAvailability, availabilityColor } from '../src/lib/group-availability';
import { setLanguage, t } from '../src/lib/i18n';
import type { MeetingEvent } from '../src/lib/types';
const stamp=Date.parse('2027-01-15T09:00:00Z');
const range=(from:number,to:number)=>({start:new Date(stamp+from*60000).toISOString(),end:new Date(stamp+to*60000).toISOString()});
const event:MeetingEvent={id:'test',title:'Event',organizer_name:'',description:'',timezone:'UTC',windows:[range(0,60)],responses:[
  {id:'A',name:'A',timezone:'UTC',revision:1,ranges:[range(0,30),range(15,45)]},
  {id:'B',name:'B',timezone:'America/New_York',revision:1,ranges:[range(15,30)]},
]};
afterEach(()=>{vi.unstubAllGlobals();setLanguage('en');});
describe('group availability',()=>{
  it('uses distinct colors for zero through six people and a dark all-available endpoint',()=>{
    const colors=Array.from({length:7},(_,n)=>availabilityColor(n,6));
    expect(new Set(colors).size).toBe(7);expect(colors[0]).toBe('#fafbf8');
    expect(colors[6]).toContain('var(--primary) 100%');expect(availabilityColor(0,0)).toBe('#fafbf8');
  });
  it('counts distinct saved people at each UTC instant, including overlapping ranges',()=>{
    expect([...groupAvailability(event.responses)]).toEqual([[stamp,1],[stamp+900000,2],[stamp+1800000,1]]);
    expect(groupAvailability([]).size).toBe(0);
  });
  it('shows exact 15-minute group counts in the same grid across zones, widths, and languages',()=>{
    for(const width of [390,1280])for(const language of ['en','zh','es'] as const){
      vi.stubGlobal('window',{innerWidth:width});setLanguage(language);
      const html=renderToStaticMarkup(<AvailabilityGrid event={event} zone="America/New_York" selected={new Set()} view="group" canEdit={false} onChange={()=>{throw Error('Group editing is forbidden');}}/>);
      expect(html).toContain('group-mode');expect(html).toContain('group-legend');
      expect(html).toContain('var(--primary) 50%');expect(html).toContain('var(--primary) 100%');
      expect(html).toContain(t('Group Availability'));expect(html).not.toContain('class="time-cell hour-start painted');
    }
  });
});
describe('shared link and name notice',()=>{
  it('uses a compact, nonblocking live notification in every language',()=>{
    for(const language of ['en','zh','es'] as const){
      setLanguage(language);
      const html=renderToStaticMarkup(<Toast anchor={null} message="Enter your name before editing availability." onDismiss={()=>{}}/>);
      expect(html).not.toContain('<dialog');expect(html).toContain('role="status"');expect(html).toContain('aria-live="polite"');
      expect(html).toContain(t('Enter your name before editing availability.'));
    }
  });
});
