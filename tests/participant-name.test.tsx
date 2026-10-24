import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ParticipantName from '../src/components/ParticipantName';
import AvailabilityGrid from '../src/components/AvailabilityGrid';
import AvailabilityStatus from '../src/components/AvailabilityStatus';
import { setLanguage, t } from '../src/lib/i18n';
import type { MeetingEvent } from '../src/lib/types';

afterEach(()=>{setLanguage('en');vi.unstubAllGlobals();});
describe('name before availability editing',()=>{
  it('keeps the name field quiet until an edit attempt needs an accessible notice',()=>{
    for(const language of ['en','zh','es'] as const){
      setLanguage(language);
      const html=renderToStaticMarkup(<ParticipantName name="" onChange={()=>{}} editNotice={false}/>);
      expect(html).not.toContain('name-help');
      expect(html).not.toContain('aria-describedby');
      const noticed=renderToStaticMarkup(<ParticipantName name="  " onChange={()=>{}} editNotice/>);
      expect(noticed).toContain('aria-invalid="true"');
      expect(noticed).not.toContain(t('Enter your name before editing availability.'));
    }
  });
  it('does not show the blank-name hint once a name is supplied',()=>{
    const html=renderToStaticMarkup(<ParticipantName name="Sam" onChange={()=>{}} editNotice={false}/>);
    expect(html).not.toContain('name-help');
  });
  it('locks editing before a name while keeping cells able to report a blocked attempt on desktop and mobile',()=>{
    const event:MeetingEvent={id:'test',title:'Event',description:'',organizer_name:'',timezone:'UTC',windows:[{start:'2027-01-15T09:00:00Z',end:'2027-01-15T10:00:00Z'}],responses:[]};
    for(const width of [390,1280]){
      vi.stubGlobal('window',{innerWidth:width});
      const html=renderToStaticMarkup(<AvailabilityGrid event={event} zone="UTC" selected={new Set()} status={<AvailabilityStatus state="saved" hasSavedResponse={false}/>} canEdit={false} onChange={()=>{}} onEditBlocked={()=>{}}/>);
      expect(html).not.toContain('done-mode');
      expect(html).toContain('Your Availability');
      expect(html).toContain('Group Availability');
      expect(html).toContain('Not Started');
      expect(html).not.toMatch(/>.*? Done<\/button>|>.*? Edit<\/button>/);
      expect(html).toMatch(/aria-disabled="true" data-stamp/);
      expect(html).not.toContain('Start on a blank time');
      expect(html).not.toMatch(/disabled="" aria-disabled="true" data-stamp/);
    }
  });
});
