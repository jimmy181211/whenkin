import type { Ref } from 'react';
import { t } from '../lib/i18n';

type Props={name:string;onChange:(name:string)=>void;inputRef?:Ref<HTMLInputElement>;editNotice:boolean};
export default function ParticipantName({name,onChange,inputRef,editNotice}:Props){
  const showNotice=!name.trim()&&editNotice;
  return <div className="participant-line"><div className="participant-name">
    <label htmlFor="participant-name">{t('Your Name')}</label>
    <div className="participant-name-field">
      <input id="participant-name" ref={inputRef} maxLength={60} placeholder={t('Enter your name')} value={name} aria-invalid={showNotice} onChange={e=>onChange(e.target.value)}/>
    </div>
  </div></div>;
}
