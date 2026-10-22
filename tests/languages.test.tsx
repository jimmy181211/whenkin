import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import AvailabilityGrid from '../src/components/AvailabilityGrid';
import { getLanguage, getLocale, setLanguage, t } from '../src/lib/i18n';
import { allSlots, gridModel, localToUTC, slotsToRanges } from '../src/lib/time';
import type { MeetingEvent } from '../src/lib/types';

vi.mock('next/navigation',()=>({usePathname:()=>window.location.pathname,useRouter:()=>({push:vi.fn()})}));

afterEach(()=>{setLanguage('en');vi.unstubAllGlobals();});
const page=(path='/')=>{vi.stubGlobal('window',{location:{pathname:path,href:'http://localhost'+path,origin:'http://localhost'},innerWidth:390});return renderToStaticMarkup(<App/>);};
describe('language changes across the website',()=>{
  it('starts in English with the brief home-page steps and no guide route',()=>{
    expect(getLanguage()).toBe('en');
    const html=page();
    expect(html).toContain('The Organizer Creates an Event');
    expect(html).toContain('Participants Mark When They’re Free');
    expect(html).toContain('Whenkin Suggests the Best Times');
    expect(html).not.toMatch(/href="\/demo"|Try an example|Try the demo/);
  });
  it('renders Chinese forms, instructions, and the selected language',()=>{
    setLanguage('zh');const html=page();
    expect(html).toContain('创建你的活动');
    expect(html).toContain('组织者创建活动');
    expect(html).toContain('参与者标记空闲时间');
    expect(html).toContain('value="zh" selected=""');
    expect(html).not.toContain('What are you planning?');
    expect(page('/how-it-works')).not.toContain('guide-page');
    expect(getLocale()).toBe('zh-CN');
  });
  it('renders Spanish forms, guide, dates, and explanatory errors',()=>{
    setLanguage('es');const html=page();
    expect(html).toContain('Crea tu Evento');
    expect(html).toContain('Los Participantes Marcan Cuándo Están Libres');
    expect(html).toContain('Elige las fechas que podrían servir');
    expect(page('/how-it-works')).not.toContain('guide-page');
    expect(t('Use your private edit link to change this response.')).toContain('Usa tu enlace privado');
    expect(t('{count} hours',{count:1.5})).toBe('1,5 horas');
  });
  it('does not expose a demo route',()=>{
    const html=page('/demo');expect(html).toContain('That Page Is a Little Off-Grid.');
    expect(html).not.toContain('availability-section');
  });
  it('preserves typed text when translating templates',()=>{
    setLanguage('zh');expect(t('ORGANIZED BY {name}',{name:'Ana & 李'})).toBe('组织者：Ana & 李');
  });
  it('remembers the explicit language preference on this device',()=>{
    const storage={setItem:vi.fn()};vi.stubGlobal('localStorage',storage);
    setLanguage('es');expect(storage.setItem).toHaveBeenCalledWith('whenkin:language','es');
  });
});
describe('language is independent of scheduling data',()=>{
  it('keeps selected instants and UTC ranges unchanged in every language',()=>{
    vi.stubGlobal('window',{innerWidth:390});
    const start=localToUTC('2027-01-15','10:00','America/Los_Angeles');
    const event:MeetingEvent={id:'test',title:'原文 / texto original',description:'',organizer_name:'Ana',timezone:'America/Los_Angeles',duration:60,windows:[{start,end:'2027-01-15T19:00:00Z'}],responses:[],final_start:null,final_end:null};
    const selected=new Set(allSlots(event.windows).slice(0,2)),before=slotsToRanges(selected);
    for(const language of ['en','zh','es'] as const){
      setLanguage(language);
      const html=renderToStaticMarkup(<AvailabilityGrid event={event} zone="America/New_York" selected={selected} onChange={()=>{}} view="mine"/>);
      expect((html.match(/aria-pressed="true" class="time-cell/g)||[]).length).toBe(1);
      expect(slotsToRanges(selected)).toEqual(before);
      expect(gridModel(event.windows,'America/New_York').days[0][1].map(c=>c.stamp)).toEqual(allSlots(event.windows));
    }
  });
});
