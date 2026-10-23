import { CalendarDays, Repeat2 } from 'lucide-react';
import Calendar from './Calendar';
import { getLocale, t } from '../lib/i18n';

type Props = {
  mode: 'dates' | 'weekdays';
  onModeChange: (mode: 'dates' | 'weekdays') => void;
  dates: string[];
  onDatesChange: (dates: string[]) => void;
  weekdays: number[];
  onWeekdaysChange: (days: number[]) => void;
  timezone: string;
};

export function WeekdayPicker({value,onChange}:{value:number[];onChange:(days:number[])=>void}) {
  return <div className="weekly-picker" role="group" aria-label={t('Choose days of the week')}>
    <div className="weekday-options">{Array.from({length:7},(_,i)=>{
      const day=i+1,date=new Date(Date.UTC(2024,0,day)); // Jan 1 was Monday.
      const full=new Intl.DateTimeFormat(getLocale(),{weekday:'long',timeZone:'UTC'}).format(date);
      const short=new Intl.DateTimeFormat(getLocale(),{weekday:'short',timeZone:'UTC'}).format(date);
      const selected=value.includes(day);
      return <button type="button" key={day} aria-label={full} aria-pressed={selected} title={full} onClick={()=>onChange(selected?value.filter(d=>d!==day):[...value,day].sort((a,b)=>a-b))}><span>{short}</span><span className="weekday-indicator" aria-hidden="true">{selected?'✓':'+'}</span></button>;
    })}</div>
    <div className={`calendar-foot ${value.length?'':'empty'}`}><span><i/>{value.length?t(value.length===1?'{count} day selected':'{count} days selected',{count:value.length}):null}</span>{value.length>0&&<button type="button" className="text-button" onClick={()=>onChange([])}>{t('Clear')}</button>}</div>
  </div>;
}

export default function SchedulePicker({mode,onModeChange,dates,onDatesChange,weekdays,onWeekdaysChange,timezone}:Props) {
  return <section className="schedule-picker">
    <div className="schedule-mode-switch" role="group" aria-label={t('Calendar mode')}>
      <button type="button" aria-pressed={mode==='dates'} onClick={()=>onModeChange('dates')}><CalendarDays size={16}/>{t('Specific Dates')}</button>
      <button type="button" aria-pressed={mode==='weekdays'} onClick={()=>onModeChange('weekdays')}><Repeat2 size={16}/>{t('Days of the Week')}</button>
    </div>
    {mode==='dates'?<Calendar value={dates} onChange={onDatesChange} timezone={timezone}/>:<WeekdayPicker value={weekdays} onChange={onWeekdaysChange}/>}
  </section>;
}
