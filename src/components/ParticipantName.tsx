import type { ReactNode, Ref } from 'react';
import { t } from '../lib/i18n';

type Props={name:string;onChange:(name:string)=>void;inputRef?:Ref<HTMLInputElement>;editNotice:boolean;status:ReactNode};
export default function ParticipantName({name,onChange,inputRef,editNotice,status}:Props){
  const empty=!name.trim();
  return <div className="participant-line"><div className="participant-name">
    <label htmlFor="participant-name">{t('Your Name')}</label>
    <div className="participant-name-field">
      <input id="participant-name" ref={inputRef} maxLength={60} placeholder={t('Enter your name')} value={name} aria-invalid={editNotice} aria-describedby={empty?'name-help':undefined} onChange={e=>onChange(e.target.value)}/>
      {empty&&<p id="name-help" className={editNotice?'name-error':'field-help'} role={editNotice?'alert':undefined}>{t(editNotice?'Enter your name before editing availability.':'Enter your name to save your availability.')}</p>}
    </div>
    <span className="participant-save-status">{status}</span>
  </div></div>;
}
