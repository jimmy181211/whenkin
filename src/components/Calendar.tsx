import { t, getLocale } from '../lib/i18n';
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Temporal } from '@js-temporal/polyfill';
export default function Calendar({value,onChange,timezone}:{value:string[];onChange:(dates:string[])=>void;timezone:string}) {
  const today=Temporal.Now.plainDateISO(timezone),[month,setMonth]=useState(today.with({day:1}));
  const offset=month.dayOfWeek%7,dates=Array.from({length:Math.ceil((offset+month.daysInMonth)/7)*7},(_,i)=>month.add({days:i-offset}));
  const label=new Intl.DateTimeFormat(getLocale(),{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(month.toString()+'T12:00:00Z'));
  return <div className="calendar" role="group" aria-label={t("Event dates")}>
    <div className="calendar-heading"><strong>{label}</strong><div><button className="icon-button" type="button" aria-label={t("Previous month")} onClick={()=>setMonth(month.subtract({months:1}))}><ChevronLeft size={19}/></button><button className="icon-button" type="button" aria-label={t("Next month")} onClick={()=>setMonth(month.add({months:1}))}><ChevronRight size={19}/></button></div></div>
    <div className="calendar-grid">{Array.from({length:7},(_,i)=>new Intl.DateTimeFormat(getLocale(),{weekday:'narrow',timeZone:'UTC'}).format(new Date(Date.UTC(2023,0,1+i)))).map((d,i)=><span className="weekday" key={i}>{d}</span>)}{dates.map(d=>{
      const key=d.toString(),selected=value.includes(key),disabled=Temporal.PlainDate.compare(d,today)<0||Temporal.PlainDate.compare(d,today.add({years:1}))>0;
      return <button type="button" key={key} aria-label={key} aria-pressed={selected} disabled={disabled} className={`calendar-day ${d.month!==month.month?'other-month':''} ${key===today.toString()?'today':''}`} onClick={()=>onChange(selected?value.filter(v=>v!==key):value.length<31?[...value,key].sort():value)}>{d.day}</button>;
    })}</div><div className={`calendar-foot ${value.length?'':'empty'}`}><span><i/> {value.length?t(value.length===1?'{count} date selected':'{count} dates selected',{count:value.length}):null}</span>{value.length>0&&<button type="button" className="text-button" onClick={()=>onChange([])}>{t("Clear")}</button>}</div>
  </div>;
}
