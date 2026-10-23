import { t, getLocale } from '../lib/i18n';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownUp, Check, ChevronLeft, ChevronRight, Pencil, Minus, Plus, Undo2 } from 'lucide-react';
import { displayRange, formatDay, formatTime, gridModel, SLOT, zoneLabel } from '../lib/time';
import type { MeetingEvent, TimeRange } from '../lib/types';
import { clearsSelection, paintSelection } from '../lib/selection';
import { projectWeekly } from '../lib/weekly';

type Props={event:MeetingEvent;zone:string;selected:Set<number>;onChange:(v:Set<number>)=>void;highlight?:TimeRange|null;canEdit?:boolean;onEditBlocked?:()=>void};
type Gesture={base:Set<number>;row:number;col:number;endRow:number;endCol:number;remove:boolean};
export default function AvailabilityGrid({event,zone,selected,onChange,highlight,canEdit=true,onEditBlocked}:Props) {
  const weekly=event.schedule_mode==='weekdays';
  const [editMode,setEditMode]=useState(true),[zoom,setZoom]=useState(1),[page,setPage]=useState(0),[small,setSmall]=useState(()=>window.innerWidth<700);
  const editing=canEdit&&editMode,clockZone=weekly?'UTC':zone;
  const [guide,setGuide]=useState<{text:string;x:number;y:number}|null>(null);
  const projection=useMemo(()=>weekly?projectWeekly(event,zone):null,[weekly,event.windows,event.timezone,event.created_at,zone]);
  const canonical=(stamp:number)=>projection?projection.toCanonical(stamp):stamp;
  const grid=useMemo(()=>gridModel(projection?.windows??event.windows,clockZone,30),[projection,event.windows,clockZone]);
  const history=useRef<Set<number>[]>([]),gesture=useRef<Gesture|null>(null),[undos,setUndos]=useState(0);
  const cellMaps=useMemo(()=>grid.days.map(([,cells])=>new Map(grid.rows.map(row=>[row.key,cells.filter(c=>c.occurrence===row.occurrence&&c.minute>=row.minute&&c.minute<row.minute+30)]))),[grid]);
  useEffect(()=>{const resize=()=>setSmall(window.innerWidth<700);window.addEventListener('resize',resize);return()=>window.removeEventListener('resize',resize);},[]);
  useEffect(()=>{gesture.current=null;setGuide(null);setPage(0);},[zone]);
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
    if(!canEdit){onEditBlocked?.();return;}if(!editing)return;
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
  return <section className="availability-section" aria-label={t("Your availability grid")}>
    <div className="grid-tools">
      <div className="segmented small" role="group" aria-label={t('Availability editing')}><button type="button" aria-pressed={editing} onClick={()=>{if(!canEdit){onEditBlocked?.();return;}setEditMode(true);}}><Pencil size={15}/> {t('Edit')}</button><button type="button" aria-pressed={!editing} onClick={()=>{finish();setEditMode(false);}}><Check size={15}/> {t('Done')}</button></div>
      <div className="grid-tool-actions"><button type="button" className="icon-button" aria-label={t("Undo selection")} disabled={!editing||!undos} onClick={undo}><Undo2 size={17}/></button><button type="button" className="icon-button" aria-label={t("Smaller time slots")} disabled={zoom<=1} onClick={()=>setZoom(zoom-1)}><Minus size={16}/></button><button type="button" className="icon-button" aria-label={t("Larger time slots")} disabled={zoom>=3} onClick={()=>setZoom(zoom+1)}><Plus size={16}/></button></div>
    </div>
    {grid.days.length>perPage&&<div className="grid-pager"><div><button className="icon-button" type="button" aria-label={t("Previous days")} disabled={page===0} onClick={()=>setPage(Math.max(0,page-1))}><ChevronLeft size={17}/></button><button className="icon-button" type="button" aria-label={t("Next days")} disabled={startCol+perPage>=grid.days.length} onClick={()=>setPage(page+1)}><ChevronRight size={17}/></button></div></div>}
    <div className={`time-grid-wrap ${editing?'':'done-mode'}`} style={{'--slot-height':`${(small?26:32)+(zoom-1)*12}px`,'--days':shown.length} as React.CSSProperties}>
      <div className="time-grid" onPointerDown={begin} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={finish}>
        <div className="time-corner">{weekly?t('Week'):zoneOffsetShort(zone,event.windows[0].start)}</div>{shown.map(([date,cells])=><div className="day-heading" key={date}>{weekly?<strong>{new Intl.DateTimeFormat(getLocale(),{weekday:'short',timeZone:clockZone}).format(cells[0].stamp)}</strong>:<><span>{new Intl.DateTimeFormat(getLocale(),{weekday:'short',timeZone:clockZone}).format(cells[0].stamp)}</span><strong>{new Intl.DateTimeFormat(getLocale(),{month:'short',day:'numeric',timeZone:clockZone}).format(cells[0].stamp)}</strong></>}</div>)}
        {grid.rows.map((row,r)=><GridRow key={row.key}>
          <div className={`time-label ${row.minute%60===0?'hour-label':''}`}>{row.minute%60===0?<>{clockLabel(row.minute)}{row.occurrence>0&&<small>{t("again")}</small>}</>:zoom>1?<small>:{String(row.minute%60).padStart(2,'0')}</small>:null}</div>
          {shown.map(([date],j)=>{const col=startCol+j,cells=cellMaps[col].get(row.key)||[],cell=cells[0];if(!cell)return <div key={date} className={`time-cell unavailable ${row.minute%60===0?'hour-start':''}`} aria-hidden="true"/>;
            const blockEnd=cells.at(-1)!.stamp+SLOT,selectedCells=cells.filter(c=>selected.has(canonical(c.stamp))),active=selectedCells.length===cells.length,partial=selectedCells.length>0&&!active;
            const highlighted=highlight&&cells.some(c=>canonical(c.stamp)>=Date.parse(highlight.start)&&canonical(c.stamp)<Date.parse(highlight.end));
            return <button type="button" key={date} disabled={canEdit&&!editing} aria-disabled={!editing} data-stamp={cell.stamp} data-row={r} data-col={col} aria-label={`${formatDay(cell.stamp,clockZone,false,weekly)}, ${formatTime(cell.stamp,clockZone)}–${formatTime(blockEnd,clockZone)}, ${weekly?zoneLabel(zone):'UTC'+cell.offset}, ${t(partial?'Partly available':active?'Available':'not selected')}`} aria-pressed={partial?'mixed':active} className={`time-cell ${row.minute%60===0?'hour-start':''} ${active?'painted':''} ${partial?'partial':''} ${highlighted?'highlighted':''}`} style={partial?{'--selection-half':selected.has(canonical(cell.stamp))?'bottom':'top'} as React.CSSProperties:undefined} onClick={()=>{if(!canEdit)onEditBlocked?.();}} onKeyDown={e=>{if(e.key===' '||e.key==='Enter'){if(!canEdit){e.preventDefault();onEditBlocked?.();return;}if(!editing)return;e.preventDefault();history.current=[...history.current.slice(-19),new Set(selected)];setUndos(history.current.length);onChange(paintSelection(selected,cells.map(c=>canonical(c.stamp)),selectedCells.length>0));}}}>{partial?<span className="sr-only">{t('Partly available')}</span>:null}</button>;
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
