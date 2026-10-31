import { useEffect, useRef } from 'react';
import AnchoredPanel from './AnchoredPanel';
import SlotDetails, {type SlotInspection} from './SlotDetails';
import { t } from '../lib/i18n';
import type { MeetingEvent } from '../lib/types';

export default function AvailabilityPopover({event,zone,inspection,onClose}:{event:MeetingEvent;zone:string;inspection:SlotInspection;onClose:()=>void}){
  const close=useRef(onClose);close.current=onClose;
  useEffect(()=>{
    const calendar=inspection.anchor?.closest('.time-grid-wrap');
    if(!calendar)return;
    // Use calendar bounds so the portaled panel cannot interrupt hovering a cell.
    const move=(e:PointerEvent)=>{
      if(e.pointerType==='touch')return;
      const rect=calendar.getBoundingClientRect();
      if(e.clientX<rect.left||e.clientX>=rect.right||e.clientY<rect.top||e.clientY>=rect.bottom)close.current();
    };
    const leaveWindow=(e:PointerEvent)=>{if(e.pointerType!=='touch'&&e.relatedTarget===null)close.current();};
    const blur=()=>close.current();
    document.addEventListener('pointermove',move);
    document.addEventListener('pointerout',leaveWindow);
    window.addEventListener('blur',blur);
    return()=>{document.removeEventListener('pointermove',move);document.removeEventListener('pointerout',leaveWindow);window.removeEventListener('blur',blur);};
  },[inspection.anchor]);
  if(!inspection.anchor)return null;
  return <AnchoredPanel anchor={inspection.anchor} label={t('Availability at This Time')} onClose={onClose} className="availability-popover">
    <SlotDetails event={event} zone={zone} inspection={inspection}/>
  </AnchoredPanel>;
}
