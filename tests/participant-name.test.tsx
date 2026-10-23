import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ParticipantName from '../src/components/ParticipantName';
import AvailabilityGrid from '../src/components/AvailabilityGrid';
import AvailabilityStatus from '../src/components/AvailabilityStatus';
import { setLanguage, t } from '../src/lib/i18n';
import type { MeetingEvent } from '../src/lib/types';

afterEach(()=>{setLanguage('en');vi.unstubAllGlobals();});
describe('name before availability editing',()=>{
  it('places the hint immediately under the input and turns an edit attempt into an accessible notice',()=>{
    for(const language of ['en','zh','es'] as const){
      setLanguage(language);
      const html=renderToStaticMarkup(<ParticipantName name="" onChange={()=>{}} editNotice={false}/>);
      expect(html).toMatch(/<div class="participant-name-field"><input[^>]*\/><p id="name-help"/);
      expect(html).toContain(t('Enter your name to save your availability.'));
      const noticed=renderToStaticMarkup(<ParticipantName name="  " onChange={()=>{}} editNotice/>);
      expect(noticed).toContain('role="alert"');expect(noticed).toContain(t('Enter your name before editing availability.'));
    }
  });
  it('does not show the blank-name hint once a name is supplied',()=>{
    const html=renderToStaticMarkup(<ParticipantName name="Sam" onChange={()=>{}} editNotice={false}/>);
    expect(html).not.toContain('name-help');
  });
  it('locks editing before a name while keeping cells able to report a blocked attempt on desktop and mobile',()=>{
    const event:MeetingEvent={id:'test',title:'Event',description:'',organizer_name:'',timezone:'UTC',duration:60,windows:[{start:'2027-01-15T09:00:00Z',end:'2027-01-15T10:00:00Z'}],responses:[],final_start:null,final_end:null};
    for(const width of [390,1280]){
      vi.stubGlobal('window',{innerWidth:width});
      const html=renderToStaticMarkup(<AvailabilityGrid event={event} zone="UTC" selected={new Set()} status={<AvailabilityStatus state="saved" hasSavedResponse={false}/>} canEdit={false} onChange={()=>{}} onEditBlocked={()=>{}}/>);
      expect(html).toContain('done-mode');
      expect(html).toMatch(/class="grid-edit-controls">[\s\S]*?Done<\/button><\/div><span class="save-status not-started"[^>]*>[\s\S]*?Not Started<\/span><\/div><div class="grid-tool-actions"/);
      expect(html).toMatch(/aria-pressed="false"[^>]*>.*? Edit<\/button>/);
      expect(html).toMatch(/aria-disabled="true" data-stamp/);
      expect(html).not.toContain('Start on a blank time');
      expect(html).not.toMatch(/disabled="" aria-disabled="true" data-stamp/);
    }
  });
});
