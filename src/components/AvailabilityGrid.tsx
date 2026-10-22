import { t, getLocale } from '../lib/i18n';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownUp, Check, ChevronLeft, ChevronRight, Eraser, Hand, Minus, Plus, Undo2 } from 'lucide-react';
import { displayRange, formatDay, formatTime, gridModel, SLOT } from '../lib/time';
import type { MeetingEvent, TimeRange } from '../lib/types';

type Props={event:MeetingEvent;zone:string;selected:Set<number>;onChange:(v:Set<number>)=>void;view:'mine'|'group';highlight?:TimeRange|null};
type Gesture={base:Set<number>;row:number;col:number;endRow:number;endCol:number;remove:boolean};
export default function AvailabilityGrid({event,zone,selected,onChange,view,highlight}:Props) {
  const [mode,setMode]=useState<'paint'|'erase'|'scroll'>('paint'),[zoom,setZoom]=useState(1),[page,setPage]=useState(0),[small,setSmall]=useState(()=>window.innerWidth<700);
  const [guide,setGuide]=useState<{text:string;x:number;y:number}|null>(null),[lastRange,setLastRange]=useState<{date:string;start:number;end:number}|null>(null);
  const grid=useMemo(()=>gridModel(event.windows,zone,30),[event.windows,zone]);
  const history=useRef<Set<number>[]>([]),gesture=useRef<Gesture|null>(null),[undos,setUndos]=useState(0);
  const cellMaps=useMemo(()=>grid.days.map(([,cells])=>new Map(grid.rows.map(row=>[row.key,cells.filter(c=>c.occurrence===row.occurrence&&c.minute>=row.minute&&c.minute<row.minute+30)]))),[grid]);
  useEffect(()=>{const resize=()=>setSmall(window.innerWidth<700);window.addEventListener('resize',resize);return()=>window.removeEventListener('resize',resize);},[]);
  const perPage=small?3:7,startCol=Math.min(page*perPage,Math.max(0,grid.days.length-perPage)),shown=grid.days.slice(startCol,startCol+perPage);
  function paint(row:number,col:number,x:number,y:number) {
    const g=gesture.current;if(!g)return;g.endRow=row;g.endCol=col;
    const next=new Set(g.base),stamps:number[]=[];
    for(let c=Math.min(g.col,col);c<=Math.max(g.col,col);c++) for(let r=Math.min(g.row,row);r<=Math.max(g.row,row);r++) {
      const cells=cellMaps[c]?.get(grid.rows[r]?.key)||[];for(const cell of cells){if(g.remove)next.delete(cell.stamp);else next.add(cell.stamp);stamps.push(cell.stamp);}
    }
    onChange(next);
    const first=Math.min(...stamps),last=Math.max(...stamps);
    if(stamps.length) {const range={start:new Date(first).toISOString(),end:new Date(last+SLOT).toISOString()};setGuide({text:`${t(g.remove?'Clear':'Available')} · ${displayRange(range,zone)}`,x:Math.max(140,Math.min(window.innerWidth-140,x)),y:Math.max(90,y-70)});if(g.col===col)setLastRange({date:grid.days[col][0],start:first,end:last+SLOT});else setLastRange(null);}
  }
  function begin(e:React.PointerEvent<HTMLDivElement>) {
    if(view!=='mine'||mode==='scroll'||e.button!==0)return;
    const target=(e.target as HTMLElement).closest<HTMLElement>('[data-stamp]');if(!target)return;
    const row=Number(target.dataset.row),col=Number(target.dataset.col);
    history.current=[...history.current.slice(-19),new Set(selected)];setUndos(history.current.length);
    gesture.current={base:new Set(selected),row,col,endRow:row,endCol:col,remove:mode==='erase'};
    e.currentTarget.setPointerCapture(e.pointerId);e.preventDefault();paint(row,col,e.clientX,e.clientY);
  }
  function move(e:React.PointerEvent<HTMLDivElement>) {
    if(!gesture.current)return;e.preventDefault();
    const target=document.elementFromPoint(e.clientX,e.clientY)?.closest<HTMLElement>('[data-stamp]');
    if(target&&e.currentTarget.contains(target))paint(Number(target.dataset.row),Number(target.dataset.col),e.clientX,e.clientY);
  }
  function finish(){gesture.current=null;setGuide(null);}
  function undo(){const last=history.current.pop();if(last){onChange(last);setUndos(history.current.length);setLastRange(null);}}
  function adjust(edge:'start'|'end',value:string){
    if(!lastRange)return;const nextTime=Number(value),{start,end,date}=lastRange;
    const a=edge==='start'?nextTime:start,b=edge==='end'?nextTime:end;if(b<=a)return;
    const next=new Set(selected);for(let t=start;t<end;t+=SLOT)next.delete(t);
    const allowed=new Set(lastCells.map(c=>c.stamp));for(let t=a;t<b;t+=SLOT){if(!allowed.has(t))return;next.add(t);}
    history.current.push(new Set(selected));setUndos(history.current.length);onChange(next);setLastRange({date,start:a,end:b});
  }
  const lastCells=lastRange?grid.days.find(([d])=>d===lastRange.date)?.[1]||[]:[];
  return <section className="availability-section" aria-label={t(view==='mine'?'Your availability grid':'Group availability grid')}>
    <div className="grid-tools">
      {view==='mine'?<div className="segmented small"><button type="button" aria-pressed={mode==='paint'} onClick={()=>setMode('paint')}><Check size={15}/> {t("Mark")}</button><button type="button" aria-pressed={mode==='erase'} onClick={()=>setMode('erase')}><Eraser size={15}/> {t("Clear")}</button><button type="button" aria-pressed={mode==='scroll'} onClick={()=>setMode('scroll')}><Hand size={15}/> {t("Scroll")}</button></div>:<span className="grid-legend"><i/> {t("More people available")}</span>}
      <div className="grid-tool-actions">{view==='mine'&&<button type="button" className="icon-button" aria-label={t("Undo selection")} disabled={!undos} onClick={undo}><Undo2 size={17}/></button>}<button type="button" className="icon-button" aria-label={t("Smaller time slots")} disabled={zoom<=1} onClick={()=>setZoom(zoom-1)}><Minus size={16}/></button><button type="button" className="icon-button" aria-label={t("Larger time slots")} disabled={zoom>=3} onClick={()=>setZoom(zoom+1)}><Plus size={16}/></button></div>
    </div>
    {view==='group'&&<p className="grid-help">{t('Each number shows how many respondents are free for the whole 30-minute block.')}</p>}
    {grid.days.length>perPage&&<div className="grid-pager"><div><button className="icon-button" type="button" aria-label={t("Previous days")} disabled={page===0} onClick={()=>setPage(Math.max(0,page-1))}><ChevronLeft size={17}/></button><button className="icon-button" type="button" aria-label={t("Next days")} disabled={startCol+perPage>=grid.days.length} onClick={()=>setPage(page+1)}><ChevronRight size={17}/></button></div></div>}
    <div className={`time-grid-wrap ${mode==='scroll'||view==='group'?'scroll-mode':''}`} style={{'--slot-height':`${(small?44:32)+(zoom-1)*12}px`,'--days':shown.length} as React.CSSProperties}>
      <div className="time-grid" onPointerDown={begin} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={finish}>
        <div className="time-corner">{zoneOffsetShort(zone,event.windows[0].start)}</div>{shown.map(([date,cells])=><div className="day-heading" key={date}><span>{new Intl.DateTimeFormat(getLocale(),{weekday:'short',timeZone:zone}).format(cells[0].stamp)}</span><strong>{new Intl.DateTimeFormat(getLocale(),{month:'short',day:'numeric',timeZone:zone}).format(cells[0].stamp)}</strong></div>)}
        {grid.rows.map((row,r)=><GridRow key={row.key}>
          <div className={`time-label ${row.minute%60===0?'hour-label':''}`}>{row.minute%60===0?<>{clockLabel(row.minute)}{row.occurrence>0&&<small>{t("again")}</small>}</>:zoom>1?<small>:{String(row.minute%60).padStart(2,'0')}</small>:null}</div>
          {shown.map(([date],j)=>{const col=startCol+j,cells=cellMaps[col].get(row.key)||[],cell=cells[0];if(!cell)return <div key={date} className={`time-cell unavailable ${row.minute%60===0?'hour-start':''}`} aria-hidden="true"/>;
            const blockEnd=cells.at(-1)!.stamp+SLOT,selectedCells=cells.filter(c=>selected.has(c.stamp)),active=selectedCells.length===cells.length,partial=selectedCells.length>0&&!active;
            const count=event.responses.filter(person=>cells.every(c=>person.ranges.some(range=>Date.parse(range.start)<=c.stamp&&Date.parse(range.end)>=c.stamp+SLOT))).length,highlighted=highlight&&cells.some(c=>c.stamp>=Date.parse(highlight.start)&&c.stamp<Date.parse(highlight.end));
            return <button type="button" key={date} data-stamp={cell.stamp} data-row={r} data-col={col} aria-label={`${formatDay(cell.stamp,zone)}, ${formatTime(cell.stamp,zone)}–${formatTime(blockEnd,zone)}, UTC${cell.offset}${view==='mine'?`, ${t(partial?'Partly available':active?'Available':'not selected')}`:`, ${t('{count} of {total} available',{count,total:event.responses.length})}`}`} aria-pressed={view==='mine'?(partial?'mixed':active):undefined} className={`time-cell ${row.minute%60===0?'hour-start':''} ${view==='mine'&&active?'painted':''} ${view==='mine'&&partial?'partial':''} ${view==='group'?'heat':''} ${highlighted?'highlighted':''}`} style={view==='group'?{'--heat':event.responses.length?count/event.responses.length:0} as React.CSSProperties:partial?{'--selection-half':selected.has(cell.stamp)?'bottom':'top'} as React.CSSProperties:undefined} onKeyDown={e=>{if(view==='mine'&&(e.key===' '||e.key==='Enter')){e.preventDefault();const next=new Set(selected);for(const c of cells){if(active)next.delete(c.stamp);else next.add(c.stamp);}setLastRange({date,start:cell.stamp,end:blockEnd});history.current.push(new Set(selected));setUndos(history.current.length);onChange(next);}}}>{view==='group'&&count>0?<span>{count}</span>:partial?<span className="sr-only">{t('Partly available')}</span>:null}</button>;
          })}
        </GridRow>)}
      </div>
    </div>
    {guide&&<div className="selection-guide" role="status" style={{left:guide.x,top:guide.y}}><ArrowDownUp size={15}/>{guide.text}</div>}
    {view==='mine'&&lastRange&&<div className="range-adjust"><span><ArrowDownUp size={15}/> {t("Fine-Tune Your Last Selection")}</span><div><label>{t("From")}<select aria-label={t("Adjust selection start")} value={lastRange.start} onChange={e=>adjust('start',e.target.value)}>{lastCells.filter(c=>c.stamp<lastRange.end).map(c=><option value={c.stamp} key={c.stamp}>{formatTime(c.stamp,zone)} {c.occurrence?`(${t('again')})`:''}</option>)}</select></label><label>{t("To")}<select aria-label={t("Adjust selection end")} value={lastRange.end} onChange={e=>adjust('end',e.target.value)}>{lastCells.filter(c=>c.stamp+SLOT>lastRange.start).map(c=><option value={c.stamp+SLOT} key={c.stamp}>{formatTime(c.stamp+SLOT,zone)} {c.occurrence?`(${t('again')})`:''}</option>)}</select></label></div></div>}
  </section>;
}
function GridRow({children}:{children:React.ReactNode}){return <div className="grid-row">{children}</div>;}
function clockLabel(minute:number){return new Intl.DateTimeFormat(getLocale(),{timeZone:'UTC',hour:'numeric'}).format(new Date(Date.UTC(2000,0,1,Math.floor(minute/60))));}
function zoneOffsetShort(zone:string,at:string){return new Intl.DateTimeFormat(getLocale(),{timeZone:zone,timeZoneName:'short'}).formatToParts(new Date(at)).find(p=>p.type==='timeZoneName')?.value||'';}
