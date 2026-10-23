import { t, getLocale } from '../lib/i18n';
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Temporal } from '@js-temporal/polyfill';
export function clampCalendarMonth(value:Temporal.PlainDate,today:Temporal.PlainDate) {
  const first=today.with({day:1}),last=first.add({years:1}),month=value.with({day:1});
  return Temporal.PlainDate.compare(month,first)<0?first:Temporal.PlainDate.compare(month,last)>0?last:month;
}
export default function Calendar({value,onChange,timezone}:{value:string[];onChange:(dates:string[])=>void;timezone:string}) {
  const today=Temporal.Now.plainDateISO(timezone),[visibleMonth,setVisibleMonth]=useState(today.with({day:1}));
  const month=clampCalendarMonth(visibleMonth,today),first=today.with({day:1}),last=first.add({years:1});
  const setMonth=(next:Temporal.PlainDate)=>setVisibleMonth(clampCalendarMonth(next,today));
  const offset=month.dayOfWeek%7,dates=Array.from({length:Math.ceil((offset+month.daysInMonth)/7)*7},(_,i)=>month.add({days:i-offset}));
  const monthNames=Array.from({length:12},(_,i)=>new Intl.DateTimeFormat(getLocale(),{month:'long',timeZone:'UTC'}).format(new Date(Date.UTC(2000,i,1))));
  const years=Array.from({length:last.year-first.year+1},(_,i)=>first.year+i);
  return <div className="calendar" role="group" aria-label={t("Event dates")}>
    <div className="calendar-heading"><div className="calendar-selects">
      <select aria-label={t('Month')} value={month.month} onChange={e=>setMonth(month.with({month:Number(e.target.value)}))}>{monthNames.map((name,i)=>{const option=month.with({month:i+1});return <option key={i} value={i+1} disabled={Temporal.PlainDate.compare(option,first)<0||Temporal.PlainDate.compare(option,last)>0}>{name}</option>;})}</select>
      <select aria-label={t('Year')} value={month.year} onChange={e=>setMonth(month.with({year:Number(e.target.value)}))}>{years.map(year=><option key={year} value={year}>{year}</option>)}</select>
    </div><div className="calendar-navigation"><button className="icon-button" type="button" aria-label={t("Previous month")} disabled={month.equals(first)} onClick={()=>setMonth(month.subtract({months:1}))}><ChevronLeft size={19}/></button><button className="icon-button" type="button" aria-label={t("Next month")} disabled={month.equals(last)} onClick={()=>setMonth(month.add({months:1}))}><ChevronRight size={19}/></button></div></div>
    <div className="calendar-grid">{Array.from({length:7},(_,i)=>new Intl.DateTimeFormat(getLocale(),{weekday:'narrow',timeZone:'UTC'}).format(new Date(Date.UTC(2023,0,1+i)))).map((d,i)=><span className="weekday" key={i}>{d}</span>)}{dates.map(d=>{
      const key=d.toString(),selected=value.includes(key),disabled=Temporal.PlainDate.compare(d,today)<0||Temporal.PlainDate.compare(d,today.add({years:1}))>0;
      return <button type="button" key={key} aria-label={key} aria-pressed={selected} disabled={disabled} className={`calendar-day ${d.month!==month.month?'other-month':''} ${key===today.toString()?'today':''}`} onClick={()=>onChange(selected?value.filter(v=>v!==key):value.length<31?[...value,key].sort():value)}>{d.day}</button>;
    })}</div><div className={`calendar-foot ${value.length?'':'empty'}`}><span><i/> {value.length?t(value.length===1?'{count} date selected':'{count} dates selected',{count:value.length}):null}</span>{value.length>0&&<button type="button" className="text-button" onClick={()=>onChange([])}>{t("Clear")}</button>}</div>
  </div>;
}
