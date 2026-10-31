import { X } from 'lucide-react';
import AnchoredPanel from './AnchoredPanel';
import SlotDetails, {type SlotInspection} from './SlotDetails';
import { t } from '../lib/i18n';
import type { MeetingEvent } from '../lib/types';

export default function AvailabilityPopover({event,zone,inspection,onClose}:{event:MeetingEvent;zone:string;inspection:SlotInspection;onClose:()=>void}){
  if(!inspection.anchor)return null;
  return <AnchoredPanel anchor={inspection.anchor} label={t('Availability at This Time')} onClose={onClose} className="availability-popover">
    <button type="button" className="icon-button panel-close" aria-label={t('Close availability details')} onClick={onClose}><X size={16}/></button>
    <SlotDetails event={event} zone={zone} inspection={inspection}/>
  </AnchoredPanel>;
}
