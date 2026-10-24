import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AvailabilityGrid from '../src/components/AvailabilityGrid';
import ShareEventDialog from '../src/screens/event/ShareEventDialog';
import Toast from '../src/components/Toast';
import { groupAvailability } from '../src/lib/group-availability';
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
  it('counts distinct saved people at each UTC instant, including overlapping ranges',()=>{
    expect([...groupAvailability(event.responses)]).toEqual([[stamp,1],[stamp+900000,2],[stamp+1800000,1]]);
    expect(groupAvailability([]).size).toBe(0);
  });
  it('shows exact 15-minute group counts in the same grid across zones, widths, and languages',()=>{
    for(const width of [390,1280])for(const language of ['en','zh','es'] as const){
      vi.stubGlobal('window',{innerWidth:width});setLanguage(language);
      const html=renderToStaticMarkup(<AvailabilityGrid event={event} zone="America/New_York" selected={new Set()} view="group" canEdit={false} onChange={()=>{throw Error('Group editing is forbidden');}}/>);
      expect(html).toContain('group-mode');expect(html).toContain('group-legend');
      expect(html).toContain('var(--lime) 50%');expect(html).toContain('var(--lime) 100%');
      expect(html).toContain(t('Group Availability'));expect(html).not.toContain('class="time-cell hour-start painted');
    }
  });
});
describe('private edit entry points and name notice',()=>{
  it('renders two identically styled links and different copy controls',()=>{
    const html=renderToStaticMarkup(<ShareEventDialog onPrivateLinkUnavailable={()=>{}} eventLink="https://whenkin.example/e/test" privateEditLink="https://whenkin.example/e/test#edit=A.secret" copied="" onClose={()=>{}} onCopy={async()=>{}}/>);
    expect((html.match(/class="share-link-input"/g)||[]).length).toBe(2);
    expect(html).toContain('Copy Event Link');expect(html).toContain('Copy My Private Edit Link');
    expect(html).toContain('#edit=A.secret');
  });
  it('keeps the private copy action enabled so it can explain the missing link',()=>{
    const html=renderToStaticMarkup(<ShareEventDialog onPrivateLinkUnavailable={()=>{}} eventLink="https://whenkin.example/e/test" copied="" onClose={()=>{}} onCopy={async()=>{}}/>);
    expect(html).not.toMatch(/<button[^>]*disabled/);
  });
  it('uses a compact, nonblocking live notification in every language',()=>{
    for(const language of ['en','zh','es'] as const){
      setLanguage(language);
      const html=renderToStaticMarkup(<Toast anchor={null} message="Enter your name before editing availability." onDismiss={()=>{}}/>);
      expect(html).not.toContain('<dialog');expect(html).toContain('role="status"');expect(html).toContain('aria-live="polite"');
      expect(html).toContain(t('Enter your name before editing availability.'));
    }
  });
});
