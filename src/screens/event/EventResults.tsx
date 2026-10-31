import SlotDetails, { type SlotInspection } from '../../components/SlotDetails';
import { Clock3, Pencil, Plus, Users } from 'lucide-react';
import { formatDay, formatTime, localDate, zoneLabel } from '../../lib/time';
import { t } from '../../lib/i18n';
import type { Candidate, MeetingEvent } from '../../lib/types';
import type { projectWeekly } from '../../lib/weekly';
type Props = {
    inspection?: SlotInspection | null;
    event: MeetingEvent;
    zone: string;
    editingId?: string | null;
    onEditResponse: (id: string | null) => void;
    switching?: boolean;
    active: Candidate | null;
    suggestions: Candidate[];
    weeklyView: ReturnType<typeof projectWeekly> | null;
    onZoneChange: (zone: string) => void;
    onSelect: (candidate: Candidate) => void;
};
export default function EventResults({ inspection, event, zone, editingId, onEditResponse, switching, active, suggestions, weeklyView, onZoneChange, onSelect }: Props) {
    const weekly = event.schedule_mode === 'weekdays';
    const viewZone = weekly ? 'UTC' : zone;
    return <aside className="results-sidebar">
      {inspection && <SlotDetails event={event} zone={zone} inspection={inspection}/>}
      <section className="suggestions-card">
        <div className="sidebar-title">
          <h2>{t("Everyone Available")}</h2>
        </div>
        <div className="suggestion-zone"><Clock3 size={13}/> {t('Times shown in {zone}', { zone: zoneLabel(zone) })}{zone !== event.timezone && <button className="text-button" onClick={() => onZoneChange(event.timezone)}>
            {t("Use Event’s Zone")}
          </button>}</div>
        {!suggestions.length ? <div className="empty-results">
          <Users size={28}/>
          <strong>{t(event.responses.length ? 'No Shared Times Yet' : 'The Possibilities Start With You.')}</strong>
          <p>
            {t(event.responses.length ? 'Add more availability to find a time that works.' : 'Mark your availability, then share the event with your group.')}
          </p>
        </div> : <div className="suggestions">
          <div className="selection-group">
          {suggestions.map(candidate => {
                const shown = weeklyView ? weeklyView.range(candidate) : candidate;
                return <button className={`suggestion ${active?.start === candidate.start ? 'active' : ''}`} key={candidate.start} onClick={() => onSelect(candidate)}>
            <div className="suggestion-top">
              <strong>{formatDay(shown.start, viewZone, false, weekly)}</strong>
              <span className="best-badge">{t('Everyone')}</span>
            </div>
            <span className="suggestion-time">{formatTime(shown.start, viewZone)} – {localDate(shown.start, viewZone) !== localDate(shown.end, viewZone) ? formatDay(shown.end, viewZone, false, weekly) + ' ' : ''}{formatTime(shown.end, viewZone)}</span>
            <span className="attendance">
              <span className="attendance-dots">
                {Array.from({ length: Math.min(event.responses.length, 8) }, (_, j) => <i key={j} className={j < candidate.available.length ? 'filled' : ''}/>)}
              </span>
              {t('Everyone available')}
            </span>
          </button>;
            })}</div>
        </div>}
      </section>
      <section className="people-card" aria-busy={switching}>
        <div className="sidebar-title">
          <h3>{t("Responders")} <span>{event.responses.length}</span></h3>
          <button className="icon-button" aria-label={t('Add Response')} title={t('Add Response')} disabled={switching} onClick={() => onEditResponse(null)}><Plus size={15}/></button>
        </div>
        {event.responses.length ? event.responses.map((r, i) => <button type="button" className="person" key={r.id} aria-label={t('Edit {name}', { name: r.name })} aria-pressed={r.id === editingId} disabled={switching} onClick={() => onEditResponse(r.id)}>
          <span className={`avatar avatar-${i % 3}`}>{r.name.slice(0, 1).toUpperCase()}</span>
          <span>
            <strong>{r.name}</strong>
            <small>{zoneLabel(r.timezone)}</small>
          </span>
          <Pencil size={14}/>
        </button>) : <p className="field-help">
          {t("Responses will appear here. Anyone who hasn’t responded is not counted as unavailable.")}
        </p>}
      </section>
    </aside>;
}
