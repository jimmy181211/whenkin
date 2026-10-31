import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { anchoredPanelPosition } from '../lib/anchored-panel-position';

type Props={anchor:HTMLElement;label:string;onClose:()=>void;children:ReactNode;className?:string;focusOnOpen?:boolean};
export default function AnchoredPanel({anchor,label,onClose,children,className='',focusOnOpen=false}:Props){
  const panel=useRef<HTMLDivElement>(null);
  const close=useRef(onClose);close.current=onClose;
  const [position,setPosition]=useState<CSSProperties>({visibility:'hidden'});
  useLayoutEffect(()=>{
    const place=()=>{
      if(!anchor.isConnected||!panel.current){close.current();return;}
      const vv=window.visualViewport;
      const viewport={left:vv?.offsetLeft??0,top:vv?.offsetTop??0,width:vv?.width??innerWidth,height:vv?.height??innerHeight};
      const box=panel.current.getBoundingClientRect();
      setPosition({...anchoredPanelPosition(anchor.getBoundingClientRect(),box,viewport),maxHeight:Math.min(360,Math.max(80,viewport.height-24))});
    };
    place();
    window.addEventListener('scroll',place,true);window.addEventListener('resize',place);
    window.visualViewport?.addEventListener('resize',place);window.visualViewport?.addEventListener('scroll',place);
    const observer=new ResizeObserver(place);if(panel.current)observer.observe(panel.current);observer.observe(anchor);
    return()=>{window.removeEventListener('scroll',place,true);window.removeEventListener('resize',place);window.visualViewport?.removeEventListener('resize',place);window.visualViewport?.removeEventListener('scroll',place);observer.disconnect();};
  },[anchor]);
  useEffect(()=>{
    const node=panel.current,previous=document.activeElement;
    if(focusOnOpen)node?.querySelector<HTMLElement>('[data-panel-autofocus]')?.focus({preventScroll:true});
    const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();close.current();}};
    const outside=(e:PointerEvent)=>{if(e.target instanceof Node&&!node?.contains(e.target)&&!anchor.contains(e.target))close.current();};
    document.addEventListener('keydown',escape);document.addEventListener('pointerdown',outside,true);
    return()=>{document.removeEventListener('keydown',escape);document.removeEventListener('pointerdown',outside,true);if(focusOnOpen&&node?.contains(document.activeElement)&&previous instanceof HTMLElement&&previous.isConnected)previous.focus({preventScroll:true});};
  },[anchor,focusOnOpen]);
  return createPortal(<div ref={panel} className={'anchored-panel '+className} style={position} role="dialog" aria-label={label} aria-modal="false">{children}</div>,document.body);
}
