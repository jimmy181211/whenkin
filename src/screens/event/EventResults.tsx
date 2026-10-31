import { useState } from 'react';
import DeleteResponsePopover from '../../components/DeleteResponsePopover';
import { Clock3, Pencil, Trash2, Users } from 'lucide-react';
import { displayRange, formatDay, formatTime, localDate, zoneLabel } from '../../lib/time';
import { t } from '../../lib/i18n';
import { groupSharedTimes } from '../../lib/shared-time-groups';
import type { Candidate, MeetingEvent, ResponseData } from '../../lib/types';
import type { projectWeekly } from '../../lib/weekly';
type Props = {
    event: MeetingEvent;
    zone: string;
    editingId?: string | null;
    onEditResponse: (id: string) => void;
    onDeleteResponse: (response: ResponseData) => Promise<boolean>;
    switching?: boolean;
    active: Candidate | null;
    suggestions: Candidate[];
    weeklyView: ReturnType<typeof projectWeekly> | null;
    onZoneChange: (zone: string) => void;
    onSelect: (candidate: Candidate) => void;
};
export default function EventResults({ event, zone, editingId, onEditResponse, onDeleteResponse, switching, active, suggestions, weeklyView, onZoneChange, onSelect }: Props) {
    const [deletion,setDeletion] = useState<{response:ResponseData;anchor:HTMLElement}|null>(null);
    const weekly = event.schedule_mode === 'weekdays';
    const viewZone = weekly ? 'UTC' : zone;
    const groups = groupSharedTimes(suggestions, viewZone, weeklyView?.range);
    return <aside className="results-sidebar">
      <section className="suggestions-card">
        <div className="sidebar-title">
          <h2>{t("When Everyone Is Free")}</h2>
        </div>
        {!suggestions.length ? <div className="empty-results">
          <Users size={28}/>
          <strong>{t(event.responses.length ? 'No Shared Times Yet' : 'The Possibilities Start With You.')}</strong>
          <p>
            {t(event.responses.length ? 'Add more availability to find a time that works.' : 'Mark your availability, then share the event with your group.')}
          </p>
        </div> : <div className="suggestions">
          <div className="selection-group">
          {groups.map(group => {
            const headingId = 'shared-date-' + group.date;
            return <article className="suggestion" key={group.date} aria-labelledby={headingId}>
              <div className="suggestion-top">
                <strong id={headingId}>{formatDay(group.entries[0].shown.start, viewZone, false, weekly)}</strong>
              </div>
              <div className="suggestion-times" role="group" aria-labelledby={headingId}>
                {group.entries.map(({candidate, shown}) => <button type="button" className="suggestion-select" key={candidate.start} aria-label={displayRange(shown, viewZone, weekly)} aria-pressed={active?.start === candidate.start && active?.end === candidate.end} onClick={() => onSelect(candidate)}>
                  <span className="suggestion-time">{formatTime(shown.start, viewZone)} – {localDate(shown.start, viewZone) !== localDate(shown.end, viewZone) ? formatDay(shown.end, viewZone, false, weekly) + ' ' : ''}{formatTime(shown.end, viewZone)}</span>
                </button>)}
              </div>
              <div className="suggestion-zone"><Clock3 size={13}/> {t('Times shown in {zone}', { zone: zoneLabel(zone) })}{zone !== event.timezone && <button className="text-button" onClick={() => onZoneChange(event.timezone)}>
                {t("Use Event’s Zone")}
              </button>}</div>
            </article>;
          })}</div>
        </div>}
      </section>
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
      {deletion && <DeleteResponsePopover anchor={deletion.anchor} name={deletion.response.name} onConfirm={()=>onDeleteResponse(deletion.response)} onClose={()=>setDeletion(null)}/>}
    </aside>;
}
