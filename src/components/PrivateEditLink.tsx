import { Check, Copy } from 'lucide-react';
import { t } from '../lib/i18n';

type Props={url?:string;copied:boolean;onCopy:(url:string)=>void};
export default function PrivateEditLink({url,copied,onCopy}:Props){
  return <div className="edit-link-line">
    <button type="button" className="text-button" disabled={!url} aria-describedby={url?'private-edit-help':undefined} onClick={()=>{if(url)onCopy(url);}}>
      {copied?<Check size={14}/>:<Copy size={14}/>} {t(copied?'Copied Private Edit Link':'Copy My Private Edit Link')}
    </button>
    {url&&<span id="private-edit-help">{t('Save this link to edit from another device.')}</span>}
  </div>;
}
