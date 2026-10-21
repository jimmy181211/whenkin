import { t } from '../lib/i18n';
import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, Globe2, LocateFixed, Search, X } from 'lucide-react';
import { deviceTimezone, zoneLabel, zoneOffset } from '../lib/time';

const popular=['America/Los_Angeles','America/New_York','America/Chicago','America/Denver','Europe/London','Europe/Paris','Asia/Shanghai','Asia/Tokyo','Asia/Kolkata','Australia/Sydney','UTC'];
const aliases:Record<string,string>={
  'America/Los_Angeles':'Pacific Time PST PDT San Francisco San Diego Seattle Vancouver 洛杉矶 太平洋时间 旧金山 西雅图 温哥华 洛杉磯 Los Ángeles hora del Pacífico',
  'America/New_York':'Eastern Time EST EDT Boston Washington Miami 纽约 紐約 东部时间 東部時間 Nueva York hora del Este',
  'America/Chicago':'Central Time CST CDT Dallas Houston 芝加哥 中部时间 hora central',
  'America/Denver':'Mountain Time MST MDT 丹佛 山地时间 hora de la montaña',
  'Asia/Shanghai':'China Beijing Shenzhen Hong Kong Chinese 上海 北京 深圳 香港 中国 中國 hora de China Pekín',
  'Asia/Kolkata':'India Mumbai New Delhi Indian 印度 加尔各答 孟买 Calcuta Nueva Delhi',
  'Europe/London':'United Kingdom British UK GMT BST 伦敦 倫敦 英国 英國 Londres Reino Unido',
  'Europe/Paris':'Paris París 法国 法國 巴黎',
  'Asia/Tokyo':'Tokyo Tokio 日本 东京 東京',
  'Australia/Sydney':'Sydney Sídney Australia 悉尼 澳大利亚',
  'UTC':'Coordinated Universal Time GMT 协调世界时 世界標準時間 tiempo universal coordinado',
};
export default function TimezonePicker({value,onChange,at}:{value:string;onChange:(zone:string)=>void;at?:number}) {
  const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[manual,setManual]=useState(false);const root=useRef<HTMLDivElement>(null),search=useRef<HTMLInputElement>(null),trigger=useRef<HTMLButtonElement>(null),menuId=useId();
  const detectedZone=deviceTimezone(),usingDevice=!manual&&value===detectedZone;
  useEffect(()=>{if(open)search.current?.focus();},[open]);
  useEffect(()=>{const close=(event:MouseEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false);};document.addEventListener('mousedown',close);return()=>document.removeEventListener('mousedown',close);},[]);
  const zones=[...new Set([value,...popular,...Intl.supportedValuesOf('timeZone')])];
  const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replaceAll('_',' ');
  const shown=query.trim()?zones.filter(z=>normalize(z+' '+zoneLabel(z)+' '+(aliases[z]||'')).includes(normalize(query.trim()))).slice(0,70):[...new Set([value,...popular])];
  const choose=(zone:string,fromDevice=false)=>{onChange(zone);setManual(!fromDevice);setOpen(false);setQuery('');trigger.current?.focus();};
  return <div className="timezone" ref={root} onKeyDown={e=>{if(e.key==='Escape')setOpen(false);}}>
    <button ref={trigger} className="zone-trigger" aria-expanded={open} aria-controls={menuId} onClick={()=>setOpen(!open)} type="button"><Globe2 size={17}/><span><small>{t(usingDevice?'Your time zone · detected':'Your time zone · selected')}</small><strong>{zoneLabel(value)} <span className="zone-offset">{zoneOffset(value,at)}</span></strong></span><ChevronDown size={16}/></button>
    {open&&<div id={menuId} className="zone-menu" role="dialog" aria-label={t("Choose your time zone")}>
      <label className="zone-search-label" htmlFor={menuId+'-search'}>{t("Search by city or time zone")}</label><div className="zone-search"><Search size={17}/><input ref={search} id={menuId+'-search'} autoFocus autoComplete="off" spellCheck={false} type="search" aria-label={t("Search time zones")} placeholder={t("Search a city or time zone")} value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='ArrowDown'){e.preventDefault();root.current?.querySelector<HTMLButtonElement>('.zone-option')?.focus();}if(e.key==='Enter'&&shown.length===1){e.preventDefault();choose(shown[0]);}}}/><button type="button" className="icon-button" aria-label={t("Close time zones")} onClick={()=>{setOpen(false);trigger.current?.focus();}}><X size={16}/></button></div>
      <button type="button" className="device-zone" onClick={()=>choose(detectedZone,true)}><LocateFixed size={16}/> {t("Use device time zone")} <small>{zoneLabel(detectedZone)}</small></button>
      <p className="zone-detected">{t('This device reports: {zone}. No location access needed.',{zone:detectedZone})}</p>
      <div className="zone-options">{shown.map(z=><button type="button" className={value===z?'zone-option selected':'zone-option'} key={z} onClick={()=>choose(z)}><span><strong>{zoneLabel(z)}</strong><small>{z}</small></span><small>{zoneOffset(z,at)}</small>{value===z&&<Check size={16}/>}</button>)}{!shown.length&&<p className="empty">{t("No time zones found. Try a nearby major city.")}</p>}</div>
    </div>}
  </div>;
}
