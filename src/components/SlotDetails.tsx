import { Check, X } from 'lucide-react';
import { t } from '../lib/i18n';
import { displayRange } from '../lib/time';
import { inspectAvailability } from '../lib/group-availability';
import type { MeetingEvent, TimeRange } from '../lib/types';

export type SlotInspection = { stamps: number[]; range: TimeRange };
export default function SlotDetails({event,zone,inspection}:{event:MeetingEvent;zone:string;inspection:SlotInspection}) {
  const { available, unavailable } = inspectAvailability(event.responses, inspection.stamps);
  const free = new Set(available.map(person => person.id));
  const partial = new Set(unavailable.filter(person => person.partial).map(person => person.id));
  return <section id="slot-details" className="slot-details" aria-label={t('Availability at This Time')}>
    <h2>{t('Availability at This Time')}</h2>
    <p className="slot-detail-time">{displayRange(inspection.range,event.schedule_mode==='weekdays'?'UTC':zone,event.schedule_mode==='weekdays')}</p>
    <p className="slot-detail-count">{t('{count} of {total} available',{count:available.length,total:event.responses.length})}</p>
    <ul className="slot-responders">
      {event.responses.map(person => <li key={person.id}>
        <span className="slot-responder-name">{person.name}{partial.has(person.id)&&<small>{t('Partly available')}</small>}</span>
        <span className={free.has(person.id)?'slot-presence available':'slot-presence unavailable'} role="img" aria-label={t(free.has(person.id)?'Available':partial.has(person.id)?'Partly available':'Unavailable')}>
          {free.has(person.id)?<Check size={18} aria-hidden="true"/>:<X size={18} aria-hidden="true"/>}
        </span>
      </li>)}
    </ul>
  </section>;
}
