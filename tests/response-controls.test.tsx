import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import AvailabilityStatus from '../src/components/AvailabilityStatus';
import PrivateEditLink from '../src/components/PrivateEditLink';
import { setLanguage, t } from '../src/lib/i18n';

afterEach(()=>setLanguage('en'));
describe('participant response status',()=>{
  it('starts without claiming that an untouched response is saved or unsaved',()=>{
    const html=renderToStaticMarkup(<AvailabilityStatus state="saved" hasSavedResponse={false}/>);
    expect(html).toContain('Not Started');
    expect(html).not.toMatch(/Saved Changes|Unsaved Changes|lucide-check/);
  });
  it('keeps draft, pending, and failed writes unsaved until confirmation',()=>{
    for(const state of ['dirty','saving','error'] as const){
      for(const hasSavedResponse of [false,true]){
        const html=renderToStaticMarkup(<AvailabilityStatus state={state} hasSavedResponse={hasSavedResponse}/>);
        expect(html).toContain('Unsaved Changes');
        expect(html).not.toContain('Saved Changes');
        expect(html).toContain(`aria-busy="${state==='saving'}"`);
      }
    }
  });
  it('shows a confirmed response as saved in every supported language',()=>{
    for(const language of ['en','zh','es'] as const){
      setLanguage(language);
      const html=renderToStaticMarkup(<AvailabilityStatus state="saved" hasSavedResponse/>);
      expect(html).toContain(t('Saved Changes'));
      expect(html).toContain('lucide-check');
    }
  });
});
describe('private edit link availability',()=>{
  it('always shows the section but disables copying before the first saved response',()=>{
    const html=renderToStaticMarkup(<PrivateEditLink copied={false} onCopy={()=>{}}/>);
    expect(html).toContain('Copy My Private Edit Link');
    expect(html).toContain('disabled=""');
    expect(html).not.toContain('private-edit-help');
    expect(html).not.toContain('Save your availability to get a private edit link.');
  });
  it('enables copying a saved response link without rendering its token into the page markup',()=>{
    const html=renderToStaticMarkup(<PrivateEditLink url="https://example.test/e/event#edit=participant.private-token" copied={false} onCopy={()=>{}}/>);
    expect(html).not.toContain('disabled=""');
    expect(html).not.toContain('private-token');
    expect(html).toContain('Save this link to edit from another device.');
  });
});
