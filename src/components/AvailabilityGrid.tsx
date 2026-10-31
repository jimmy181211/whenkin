import { t, getLocale } from '../lib/i18n';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownUp, ChevronLeft, ChevronRight, Minus, Plus, Undo2 } from 'lucide-react';
import { displayRange, formatDay, formatTime, gridModel, SLOT, zoneLabel } from '../lib/time';
import type { MeetingEvent, TimeRange } from '../lib/types';
import { clearsSelection, paintSelection } from '../lib/selection';
import { groupAvailability, availabilityColor } from '../lib/group-availability';
import { scrollGrid } from '../lib/grid-scroll';
import type { SlotInspection } from './SlotDetails';
import { projectWeekly } from '../lib/weekly';

type Props={inspection?:SlotInspection|null;onInspect?:(value:SlotInspection|null)=>void;event:MeetingEvent;zone:string;selected:Set<number>;onChange:(v:Set<number>)=>void;highlight?:TimeRange|null;canEdit?:boolean;onEditBlocked?:()=>void;status?:ReactNode;view?:'personal'|'group';onViewChange?:(view:'personal'|'group')=>void};
type Gesture={base:Set<number>;row:number;col:number;endRow:number;endCol:number;remove:boolean};
export default function AvailabilityGrid({event,zone,selected,onChange,highlight,canEdit=true,onEditBlocked,status,view='personal',onViewChange,onInspect,inspection}:Props) {
  const weekly=event.schedule_mode==='weekdays';
  const [zoom,setZoom]=useState(1),[page,setPage]=useState(0),[small,setSmall]=useState(()=>window.innerWidth<700);
  const group=view==='group',editing=canEdit&&!group,clockZone=weekly?'UTC':zone;
  const [guide,setGuide]=useState<{text:string;x:number;y:number}|null>(null);
  const projection=useMemo(()=>weekly?projectWeekly(event,zone):null,[weekly,event.windows,event.timezone,event.created_at,zone]);
  const canonical=(stamp:number)=>projection?projection.toCanonical(stamp):stamp;
  const grid=useMemo(()=>gridModel(projection?.windows??event.windows,clockZone,30),[projection,event.windows,clockZone]);
  const scroll=useRef<HTMLDivElement>(null);
  const counts=useMemo(()=>groupAvailability(event.responses),[event.responses]);
  useEffect(()=>{
    const element=scroll.current;if(!element)return;
    const wheel=(event:WheelEvent)=>scrollGrid(element,event);
    element.addEventListener('wheel',wheel,{passive:false});
    return()=>element.removeEventListener('wheel',wheel);
  },[]);
  const history=useRef<Set<number>[]>([]),gesture=useRef<Gesture|null>(null),[undos,setUndos]=useState(0);
  const cellMaps=useMemo(()=>grid.days.map(([,cells])=>new Map(grid.rows.map(row=>[row.key,cells.filter(c=>c.occurrence===row.occurrence&&c.minute>=row.minute&&c.minute<row.minute+30)]))),[grid]);
  useEffect(()=>{const resize=()=>setSmall(window.innerWidth<700);window.addEventListener('resize',resize);return()=>window.removeEventListener('resize',resize);},[]);
  useEffect(()=>{gesture.current=null;setGuide(null);setPage(0);},[zone,view]);
  const perPage=small?3:7,startCol=Math.min(page*perPage,Math.max(0,grid.days.length-perPage)),shown=grid.days.slice(startCol,startCol+perPage);
  function paint(row:number,col:number,x:number,y:number) {
    const g=gesture.current;if(!g||!editing)return;g.endRow=row;g.endCol=col;
    const stamps:number[]=[];
    for(let c=Math.min(g.col,col);c<=Math.max(g.col,col);c++) for(let r=Math.min(g.row,row);r<=Math.max(g.row,row);r++) {
      const cells=cellMaps[c]?.get(grid.rows[r]?.key)||[];for(const cell of cells)stamps.push(cell.stamp);
    }
    onChange(paintSelection(g.base,stamps.map(canonical),g.remove));
    const first=Math.min(...stamps),last=Math.max(...stamps);
    if(stamps.length) {const range={start:new Date(first).toISOString(),end:new Date(last+SLOT).toISOString()};setGuide({text:`${t(g.remove?'Clear':'Available')} · ${displayRange(range,clockZone,weekly)}`,x:Math.max(140,Math.min(window.innerWidth-140,x)),y:Math.max(90,y-70)});}
  }
  function begin(e:React.PointerEvent<HTMLDivElement>) {
    if(e.button!==0)return;
    const target=(e.target as HTMLElement).closest<HTMLElement>('[data-stamp]');if(!target)return;
    if(group)return;
    if(!canEdit){onEditBlocked?.();return;}
    const row=Number(target.dataset.row),col=Number(target.dataset.col);
    history.current=[...history.current.slice(-19),new Set(selected)];setUndos(history.current.length);
    const cells=cellMaps[col]?.get(grid.rows[row]?.key)||[];
    gesture.current={base:new Set(selected),row,col,endRow:row,endCol:col,remove:clearsSelection(cells.map(c=>canonical(c.stamp)),selected)};
    e.currentTarget.setPointerCapture(e.pointerId);e.preventDefault();paint(row,col,e.clientX,e.clientY);
  }
  function move(e:React.PointerEvent<HTMLDivElement>) {
    if(!gesture.current)return;e.preventDefault();
    const target=document.elementFromPoint(e.clientX,e.clientY)?.closest<HTMLElement>('[data-stamp]');
    if(target&&e.currentTarget.contains(target))paint(Number(target.dataset.row),Number(target.dataset.col),e.clientX,e.clientY);
  }
  function finish(){gesture.current=null;setGuide(null);}
  function undo(){if(!editing)return;const last=history.current.pop();if(last){onChange(last);setUndos(history.current.length);}}
  return <section className="availability-section" aria-label={t(group?"Group Availability":"Your availability grid")}>
    <div className="grid-tools">
      <div className="grid-edit-controls">
        <div className="segmented small availability-view-switch" role="group" aria-label={t('Availability View')}>
          <button type="button" aria-pressed={!group} onClick={()=>onViewChange?.('personal')}>{t('Your Availability')}</button>
          <button type="button" aria-pressed={group} onClick={()=>onViewChange?.('group')}>{t('Group Availability')}</button>
        </div>
        {status}
      </div>
      <div className="grid-tool-actions"><button type="button" className="icon-button" aria-label={t("Undo selection")} disabled={!editing||!undos} onClick={undo}><Undo2 size={17}/></button><button type="button" className="icon-button" aria-label={t("Smaller time slots")} disabled={zoom<=1} onClick={()=>setZoom(zoom-1)}><Minus size={16}/></button><button type="button" className="icon-button" aria-label={t("Larger time slots")} disabled={zoom>=3} onClick={()=>setZoom(zoom+1)}><Plus size={16}/></button></div>
    </div>
    {grid.days.length>perPage&&<div className="grid-pager"><div><button className="icon-button" type="button" aria-label={t("Previous days")} disabled={page===0} onClick={()=>setPage(Math.max(0,page-1))}><ChevronLeft size={17}/></button><button className="icon-button" type="button" aria-label={t("Next days")} disabled={startCol+perPage>=grid.days.length} onClick={()=>setPage(page+1)}><ChevronRight size={17}/></button></div></div>}
    {group&&<div className="group-legend" aria-label={t('People Available')}><span>0</span><span className="group-legend-scale" aria-hidden="true"/><span>{event.responses.length} {t('Available')}</span></div>}
    <div ref={scroll} className={`time-grid-wrap ${group?'group-mode':''}`} style={{'--slot-height':`${(small?26:32)+(zoom-1)*12}px`,'--days':shown.length} as React.CSSProperties}>
      <div className="time-grid" onPointerDown={begin} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={finish}>
        <div className="time-corner">{weekly?t('Week'):zoneOffsetShort(zone,event.windows[0].start)}</div>{shown.map(([date,cells])=><div className="day-heading" key={date}>{weekly?<strong>{new Intl.DateTimeFormat(getLocale(),{weekday:'short',timeZone:clockZone}).format(cells[0].stamp)}</strong>:<><span>{new Intl.DateTimeFormat(getLocale(),{weekday:'short',timeZone:clockZone}).format(cells[0].stamp)}</span><strong>{new Intl.DateTimeFormat(getLocale(),{month:'short',day:'numeric',timeZone:clockZone}).format(cells[0].stamp)}</strong></>}</div>)}
        {grid.rows.map((row,r)=><GridRow key={row.key}>
          <div className={`time-label ${row.minute%60===0?'hour-label':''}`}>{row.minute%60===0?<>{clockLabel(row.minute)}{row.occurrence>0&&<small>{t("again")}</small>}</>:zoom>1?<small>:{String(row.minute%60).padStart(2,'0')}</small>:null}</div>
          {shown.map(([date],j)=>{const col=startCol+j,cells=cellMaps[col].get(row.key)||[],cell=cells[0];if(!cell)return <div key={date} className={`time-cell unavailable ${row.minute%60===0?'hour-start':''}`} aria-hidden="true"/>;
            const blockEnd=cells.at(-1)!.stamp+SLOT,selectedCells=cells.filter(c=>selected.has(canonical(c.stamp))),active=selectedCells.length===cells.length,partial=selectedCells.length>0&&!active;
            const inspected=group&&inspection&&cells.some(c=>inspection.stamps.includes(canonical(c.stamp)));
            const highlighted=highlight&&cells.some(c=>canonical(c.stamp)>=Date.parse(highlight.start)&&canonical(c.stamp)<Date.parse(highlight.end));
            const cellCounts=cells.map(c=>counts.get(canonical(c.stamp))??0);
            const minimum=Math.min(...cellCounts),maximum=Math.max(...cellCounts);
            const groupLabel=t('{count} of {total} available',{count:minimum===maximum?minimum:`${minimum}–${maximum}`,total:event.responses.length});
            const label=`${formatDay(cell.stamp,clockZone,false,weekly)}, ${formatTime(cell.stamp,clockZone)}–${formatTime(blockEnd,clockZone)}, ${weekly?zoneLabel(zone):'UTC'+cell.offset}, ${group?groupLabel:t(partial?'Partly available':active?'Available':'not selected')}`;
            const background=group?`linear-gradient(to bottom, ${cellCounts.map((count,index)=>`${availabilityColor(count,event.responses.length)} ${index*100/cells.length}% ${(index+1)*100/cells.length}%`).join(', ')})`:undefined;
            return <button type="button" key={date} aria-disabled={!group&&!canEdit} data-stamp={cell.stamp} data-row={r} data-col={col} aria-label={label}  aria-pressed={group?undefined:partial?'mixed':active} className={`time-cell ${row.minute%60===0?'hour-start':''} ${!group&&active?'painted':''} ${!group&&partial?'partial':''} ${highlighted?'highlighted':''} ${inspected?'inspected':''}`} style={group?{background}:partial?{'--selection-half':selected.has(canonical(cell.stamp))?'bottom':'top'} as React.CSSProperties:undefined} onPointerEnter={e=>{if(group&&e.pointerType!=='touch')onInspect?.({stamps:cells.map(c=>canonical(c.stamp)),range:{start:new Date(cell.stamp).toISOString(),end:new Date(blockEnd).toISOString()}});}} onFocus={()=>{if(group)onInspect?.({stamps:cells.map(c=>canonical(c.stamp)),range:{start:new Date(cell.stamp).toISOString(),end:new Date(blockEnd).toISOString()}});}} onClick={()=>{if(group){onInspect?.({stamps:cells.map(c=>canonical(c.stamp)),range:{start:new Date(cell.stamp).toISOString(),end:new Date(blockEnd).toISOString()}});if(small)requestAnimationFrame(()=>document.getElementById('slot-details')?.scrollIntoView({behavior:'smooth',block:'nearest'}));}else if(!canEdit)onEditBlocked?.();}} onKeyDown={e=>{
              if(e.key!==' '&&e.key!=='Enter')return;
              if(group)return;
              e.preventDefault();
              if(!canEdit){onEditBlocked?.();return;}
              history.current=[...history.current.slice(-19),new Set(selected)];setUndos(history.current.length);
              onChange(paintSelection(selected,cells.map(c=>canonical(c.stamp)),selectedCells.length>0));
            }}>{!group&&partial?<span className="sr-only">{t('Partly available')}</span>:null}</button>;
          })}
        </GridRow>)}
      </div>
    </div>
    {guide&&<div className="selection-guide" role="status" style={{left:guide.x,top:guide.y}}><ArrowDownUp size={15}/>{guide.text}</div>}
  </section>;
}
function GridRow({children}:{children:React.ReactNode}){return <div className="grid-row">{children}</div>;}
function clockLabel(minute:number){return new Intl.DateTimeFormat(getLocale(),{timeZone:'UTC',hour:'numeric'}).format(new Date(Date.UTC(2000,0,1,Math.floor(minute/60))));}
function zoneOffsetShort(zone:string,at:string){return new Intl.DateTimeFormat(getLocale(),{timeZone:zone,timeZoneName:'short'}).formatToParts(new Date(at)).find(p=>p.type==='timeZoneName')?.value||'';}
