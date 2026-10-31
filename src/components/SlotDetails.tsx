import { Check, X } from 'lucide-react';
import { t } from '../lib/i18n';
import { displayRange } from '../lib/time';
import { inspectAvailability } from '../lib/group-availability';
import type { MeetingEvent, TimeRange } from '../lib/types';

export type SlotInspection = { stamps: number[]; range: TimeRange };
export default function SlotDetails({event,zone,inspection}:{event:MeetingEvent;zone:string;inspection:SlotInspection}) {
  const { available, unavailable } = inspectAvailability(event.responses, inspection.stamps);
  return <section id="slot-details" className="slot-details" aria-label={t('Availability at This Time')}>
    <h2>{t('Availability at This Time')}</h2>
    <p className="slot-detail-time">{displayRange(inspection.range,event.schedule_mode==='weekdays'?'UTC':zone,event.schedule_mode==='weekdays')}</p>
    <p className="slot-detail-count">{t('{count} of {total} available',{count:available.length,total:event.responses.length})}</p>
    <div className="slot-person-list"><h3><Check size={16}/>{t('Available')} <span>{available.length}</span></h3>
      {available.map(person=><p key={person.id}>{person.name}</p>)}
      {!available.length&&<p className="field-help">{t('No responders available.')}</p>}
    </div>
    <div className="slot-person-list not-free"><h3><X size={16}/>{t('Unavailable')} <span>{unavailable.length}</span></h3>
      {unavailable.map(person=><p key={person.id}>{person.name}{person.partial&&<small>{t('Partly available')}</small>}</p>)}
      {!unavailable.length&&<p className="field-help">{t('No unavailable responders.')}</p>}
    </div>
  </section>;
}
