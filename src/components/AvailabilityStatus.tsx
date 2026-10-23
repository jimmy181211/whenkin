import { Check, LoaderCircle } from 'lucide-react';
import { t } from '../lib/i18n';

type Props={state:'saved'|'dirty'|'saving'|'error';hasSavedResponse:boolean};
export default function AvailabilityStatus({state,hasSavedResponse}:Props){
  const status=state==='saved'?(hasSavedResponse?'Saved Changes':'Not Started'):'Unsaved Changes';
  const statusClass=status==='Saved Changes'?'saved':status==='Not Started'?'not-started':state==='error'?'error':'dirty';
  return <span className={`save-status ${statusClass}`} role="status" aria-busy={state==='saving'}>
    {state==='saving'?<LoaderCircle className="spin" size={14}/>:status==='Saved Changes'?<Check size={14}/>:<span className="status-dot"/>}{t(status)}
  </span>;
}
