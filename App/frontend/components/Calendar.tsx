import { t, getLocale } from '../i18n/index';
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Temporal } from '@js-temporal/polyfill';
import { FIRST_EVENT_DATE, LAST_EVENT_DATE, isEventDateAllowed } from '../../shared/date-limits';
import EditableSelect from './EditableSelect';
export function clampCalendarMonth(value:Temporal.PlainDate) {
  const first=FIRST_EVENT_DATE,last=LAST_EVENT_DATE.with({day:1}),month=value.with({day:1});
  return Temporal.PlainDate.compare(month,first)<0?first:Temporal.PlainDate.compare(month,last)>0?last:month;
}
export default function Calendar({value,onChange,timezone}:{value:string[];onChange:(dates:string[])=>void;timezone:string}) {
  const today=Temporal.Now.plainDateISO(timezone),[visibleMonth,setVisibleMonth]=useState(today.with({day:1}));
  const month=clampCalendarMonth(visibleMonth),first=FIRST_EVENT_DATE,last=LAST_EVENT_DATE.with({day:1});
  const setMonth=(next:Temporal.PlainDate)=>setVisibleMonth(clampCalendarMonth(next));
  const offset=month.dayOfWeek%7,dates=Array.from({length:Math.ceil((offset+month.daysInMonth)/7)*7},(_,i)=>month.add({days:i-offset}));
  const monthNames=Array.from({length:12},(_,i)=>new Intl.DateTimeFormat(getLocale(),{month:'long',timeZone:'UTC'}).format(new Date(Date.UTC(2000,i,1))));
  const years=Array.from({length:last.year-first.year+1},(_,i)=>first.year+i);
  return <div className="calendar" role="group" aria-label={t("Event dates")}>
    <div className="calendar-heading"><div className="calendar-selects">
      <EditableSelect label={t('Month')} value={String(month.month)} options={monthNames.map((label,i)=>({label,value:String(i+1),keywords:[new Intl.DateTimeFormat('en',{month:'long',timeZone:'UTC'}).format(new Date(Date.UTC(2000,i,1)))]}))} onChange={value=>setMonth(month.with({month:Number(value)}))} invalidMessage={t('Choose a valid month.')}/>
      <EditableSelect label={t('Year')} value={String(month.year)} options={years.map(year=>({label:String(year),value:String(year)}))} onChange={value=>setMonth(month.with({year:Number(value)}))} numeric invalidMessage={t('Choose a year from {first} to {last}.',{first:String(first.year),last:String(last.year)})}/>
    </div><div className="calendar-navigation"><button className="icon-button" type="button" aria-label={t("Previous month")} disabled={month.equals(first)} onClick={()=>setMonth(month.subtract({months:1}))}><ChevronLeft size={19}/></button><button className="icon-button" type="button" aria-label={t("Next month")} disabled={month.equals(last)} onClick={()=>setMonth(month.add({months:1}))}><ChevronRight size={19}/></button></div></div>
    <div className="calendar-grid">{Array.from({length:7},(_,i)=>new Intl.DateTimeFormat(getLocale(),{weekday:'narrow',timeZone:'UTC'}).format(new Date(Date.UTC(2023,0,1+i)))).map((d,i)=><span className="weekday" key={i}>{d}</span>)}{dates.map(d=>{
      const key=d.toString(),selected=value.includes(key),disabled=!isEventDateAllowed(d,today);
      return <button type="button" key={key} aria-label={key} aria-pressed={selected} disabled={disabled} className={`calendar-day ${d.month!==month.month?'other-month':''} ${key===today.toString()?'today':''}`} onClick={()=>onChange(selected?value.filter(v=>v!==key):value.length<31?[...value,key].sort():value)}>{d.day}</button>;
    })}</div><div className={`calendar-foot ${value.length?'':'empty'}`}><span><i/> {value.length?t(value.length===1?'{count} date selected':'{count} dates selected',{count:value.length}):null}</span>{value.length>0&&<button type="button" className="text-button" onClick={()=>onChange([])}>{t("Clear")}</button>}</div>
  </div>;
}
