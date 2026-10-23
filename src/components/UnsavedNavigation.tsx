import { useEffect, useRef, useState } from 'react';
import { t } from '../lib/i18n';

export function useUnsavedNavigation(unsaved:boolean,message="Your Availability Hasn't Been Saved.") {
  const bypass=useRef(false),[destination,setDestination]=useState('');
  const dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{
    const unload=(event:BeforeUnloadEvent)=>{if(unsaved&&!bypass.current){event.preventDefault();event.returnValue='';}};
    const navigate=(event:MouseEvent)=>{
      if(!unsaved||bypass.current||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
      const anchor=event.target instanceof Element?event.target.closest('a[href]'):null;
      if(!(anchor instanceof HTMLAnchorElement)||anchor.target==='_blank'||anchor.hasAttribute('download'))return;
      const next=new URL(anchor.href,location.href);
      if(next.origin===location.origin&&next.pathname===location.pathname&&next.search===location.search)return;
      event.preventDefault();setDestination(next.href);
    };
    window.addEventListener('beforeunload',unload);document.addEventListener('click',navigate,true);
    return()=>{window.removeEventListener('beforeunload',unload);document.removeEventListener('click',navigate,true);};
  },[unsaved]);
  useEffect(()=>{if(destination&&unsaved){if(!dialog.current?.open)dialog.current?.showModal();}else dialog.current?.close();},[destination,unsaved]);
  const close=()=>{dialog.current?.close();setDestination('');};
  return {allowNavigation:()=>{bypass.current=true;},dialog:<dialog ref={dialog} className="leave-dialog" aria-labelledby="leave-title" onCancel={close} onClose={()=>setDestination('')}>
    <h2 id="leave-title">{t(message)}</h2><p>{t('Leave without saving your changes?')}</p>
    <div className="dialog-actions"><button autoFocus type="button" className="button secondary" onClick={close}>{t('Keep Editing')}</button><button type="button" className="button primary" onClick={()=>{bypass.current=true;window.location.assign(destination);}}>{t('Leave Without Saving')}</button></div>
  </dialog>};
}
