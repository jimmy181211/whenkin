import { useState } from 'react';
import { Temporal } from '@js-temporal/polyfill';
import { Clock3, LoaderCircle } from 'lucide-react';
import { api } from '../lib/api';
import { getLocale, t } from '../lib/i18n';
import { zoneLabel } from '../lib/time';
import type { MeetingEvent } from '../lib/types';

const times=Array.from({length:97},(_,i)=>String(Math.floor(i/4)).padStart(2,'0')+':'+String(i%4*15).padStart(2,'0'));
function clock(value:string,zone:string){const local=Temporal.Instant.from(value).toZonedDateTimeISO(zone);return String(local.hour).padStart(2,'0')+':'+String(local.minute).padStart(2,'0');}
function timeLabel(value:string){return value==='24:00'?t('Midnight (next day)'):new Intl.DateTimeFormat(getLocale(),{timeZone:'UTC',hour:'numeric',minute:'2-digit'}).format(new Date('2000-01-01T'+value+':00Z'));}
type Props={event:MeetingEvent;admin:string;onSaved:(event:MeetingEvent)=>void;onDirty:(dirty:boolean)=>void;onBusy:(busy:boolean)=>void;onClose:()=>void};
export default function OrganizerScheduleEditor({event,admin,onSaved,onDirty,onBusy,onClose}:Props){
  const [original]=useState(()=>({start:clock(event.windows[0].start,event.timezone),end:clock(event.windows[0].end,event.timezone)==='00:00'?'24:00':clock(event.windows[0].end,event.timezone),duration:event.duration,revision:event.schedule_revision,zone:event.timezone}));
  const initialStart=original.start,initialEnd=original.end;
  const [start,setStart]=useState(initialStart),[end,setEnd]=useState(initialEnd),[duration,setDuration]=useState(original.duration),[busy,setBusy]=useState(false),[error,setError]=useState('');
  function change(nextStart:string,nextEnd:string,nextDuration:number){setStart(nextStart);setEnd(nextEnd);setDuration(nextDuration);onDirty(nextStart!==initialStart||nextEnd!==initialEnd||nextDuration!==original.duration);}
  async function submit(e:React.FormEvent){e.preventDefault();setError('');if(start>=end){setError('Choose an end time after the start time.');return;}setBusy(true);onBusy(true);
    try{const updated=await api<MeetingEvent>('/events/'+event.id+'/schedule',{method:'PATCH',headers:{Authorization:'Bearer '+admin},body:JSON.stringify({startTime:start,endTime:end,duration,schedule_revision:original.revision})});onSaved(updated);onDirty(false);onClose();}
    catch(error){setError(error instanceof Error?error.message:'Could not save. Your draft stays on this device.');}
    finally{setBusy(false);onBusy(false);}
  }
  return <form className="schedule-editor" onSubmit={submit} aria-labelledby="schedule-editor-title"><h2 id="schedule-editor-title"><Clock3 size={18}/>{t('Edit Event Hours')}</h2><p className="field-help">{t('These hours apply to every event date. Times use {zone}.',{zone:zoneLabel(original.zone)})}</p><div className="fields-row"><label className="field">{t('From')}<select aria-label={t('Event start time')} value={start} disabled={busy} onChange={e=>change(e.target.value,end,duration)}>{times.slice(0,-1).map(value=><option value={value} key={value}>{timeLabel(value)}</option>)}</select></label><label className="field">{t('Until')}<select aria-label={t('Event end time')} value={end} disabled={busy} onChange={e=>change(start,e.target.value,duration)}>{times.slice(1).map(value=><option value={value} key={value}>{timeLabel(value)}</option>)}</select></label><label className="field">{t('Meeting length')}<select aria-label={t('Event meeting length')} value={duration} disabled={busy} onChange={e=>change(start,end,Number(e.target.value))}>{[15,30,45,60,90,120,180,240].map(value=><option value={value} key={value}>{value<60?t('{count} min',{count:value}):t(value===60?'{count} hour':'{count} hours',{count:value/60})}</option>)}</select></label></div><p className="schedule-warning">{t('Availability outside the revised hours will be removed. Availability inside the hours keeps its actual time. All participant links will use the updated schedule.')}</p>{error&&<p className="error-message" role="alert">{t(error)}</p>}<div className="dialog-actions"><button type="button" className="button secondary compact" disabled={busy} onClick={()=>{onDirty(false);onClose();}}>{t('Cancel')}</button><button className="button primary compact" disabled={busy} type="submit">{busy?<><LoaderCircle className="spin" size={16}/>{t('Saving…')}</>:t('Save Event Hours')}</button></div></form>;
}
