import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import AvailabilityStatus from '../src/components/AvailabilityStatus';
import { setLanguage, t } from '../src/lib/i18n';

afterEach(()=>setLanguage('en'));
describe('participant response status',()=>{
  it('starts without claiming that an untouched response is saved or unsaved',()=>{
    const html=renderToStaticMarkup(<AvailabilityStatus state="saved" hasSavedResponse={false}/>);
    expect(html).toContain('Not Started');
    expect(html).not.toMatch(/Saved|Unsaved|lucide-check/);
  });
  it('keeps draft, pending, and failed writes unsaved until confirmation',()=>{
    for(const state of ['dirty','saving','error'] as const){
      for(const hasSavedResponse of [false,true]){
        const html=renderToStaticMarkup(<AvailabilityStatus state={state} hasSavedResponse={hasSavedResponse}/>);
        expect(html).toContain('Unsaved');
        expect(html).not.toContain('Saved');
        expect(html).toContain(`aria-busy="${state==='saving'}"`);
      }
    }
  });
  it('shows a confirmed response as saved in every supported language',()=>{
    for(const language of ['en','zh','es'] as const){
      setLanguage(language);
      const html=renderToStaticMarkup(<AvailabilityStatus state="saved" hasSavedResponse/>);
      expect(html).toContain(t('Saved'));
      expect(html).toContain('lucide-check');
    }
  });
});
