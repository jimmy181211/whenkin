import { useState } from 'react';
import DeleteResponsePopover from '../../components/DeleteResponsePopover';
import { Pencil, Trash2 } from 'lucide-react';
import { zoneLabel } from '../../lib/time';
import { t } from '../../lib/i18n';
import type { Candidate, MeetingEvent, ResponseData } from '../../lib/types';
type Props = {
    event: MeetingEvent;
    editingId?: string | null;
    onEditResponse: (id: string) => void;
    onDeleteResponse: (response: ResponseData) => Promise<boolean>;
    switching?: boolean;
    highlighted: boolean;
    suggestions: Candidate[];
    onToggleHighlight: () => void;
};
export default function EventResults({ event, editingId, onEditResponse, onDeleteResponse, switching, highlighted, suggestions, onToggleHighlight }: Props) {
    const [deletion,setDeletion] = useState<{response:ResponseData;anchor:HTMLElement}|null>(null);
    return <aside className="results-sidebar">
      <section className="people-card" aria-busy={switching}>
        <div className="sidebar-title">
          <h3>{t("Responders")} <span>{event.responses.length}</span></h3>
        </div>
        {event.responses.length ? event.responses.map((r, i) => <div className="person-row" key={r.id}><button type="button" className="person" aria-label={t('Edit {name}', { name: r.name })} aria-pressed={r.id === editingId} disabled={switching} onClick={() => onEditResponse(r.id)}>
          <span className={`avatar avatar-${i % 3}`}>{r.name.slice(0, 1).toUpperCase()}</span>
          <span>
            <strong>{r.name}</strong>
            <small>{zoneLabel(r.timezone)}</small>
          </span>
          <Pencil size={14}/>
        </button><button type="button" id={'delete-response-'+r.id} className="icon-button delete-response" aria-label={t('Delete {name}',{name:r.name})} title={t('Delete {name}',{name:r.name})} disabled={switching} onClick={e=>setDeletion({response:r,anchor:e.currentTarget})}><Trash2 size={16}/></button></div>) : <p className="field-help">
          {t("Responses will appear here. Anyone who hasn’t responded is not counted as unavailable.")}
        </p>}
      </section>
      <section className="suggestions-card">
        <div className="sidebar-title"><h2>{t("When Everyone Is Free")}</h2></div>
        <button type="button" className="button primary highlight-shared-times" aria-pressed={highlighted} disabled={!highlighted && !suggestions.length} onClick={onToggleHighlight}>{t(highlighted ? "Cancel Highlight" : "Highlight Everyone’s Free Times")}</button>
        <p className="shared-time-summary" role="status">{t(suggestions.length===1 ? "{count} shared time period" : "{count} shared time periods", {count:suggestions.length})}</p>
        {!suggestions.length && <p className="field-help">{t(event.responses.length ? "Add more availability to find a time that works." : "Mark your availability, then share the event with your group.")}</p>}
      </section>
      {deletion && <DeleteResponsePopover anchor={deletion.anchor} name={deletion.response.name} onConfirm={()=>onDeleteResponse(deletion.response)} onClose={()=>setDeletion(null)}/>}
    </aside>;
}
