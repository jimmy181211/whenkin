import { useState } from 'react';
import AnchoredPanel from './AnchoredPanel';
import { t } from '../lib/i18n';

export default function DeleteResponsePopover({anchor,name,onConfirm,onClose}:{anchor:HTMLElement;name:string;onConfirm:()=>Promise<boolean>;onClose:()=>void}){
  const [busy,setBusy]=useState(false);
  const dismiss=()=>{if(!busy)onClose();};
  const confirm=async()=>{if(busy)return;setBusy(true);try{await onConfirm();onClose();}finally{setBusy(false);}};
  return <AnchoredPanel anchor={anchor} label={t('Delete response?')} onClose={dismiss} focusOnOpen className="delete-response-popover">
    <h2>{t('Delete response?')}</h2>
    <p>{t('Delete {name} and their availability?',{name})}</p>
    <div className="confirm-actions">
      <button type="button" data-panel-autofocus className="button secondary compact" disabled={busy} onClick={dismiss}>{t('Cancel')}</button>
      <button type="button" className="button danger compact" disabled={busy} onClick={()=>void confirm()}>{t(busy?'Deleting…':'Delete')}</button>
    </div>
  </AnchoredPanel>;
}
