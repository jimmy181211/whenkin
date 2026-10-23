import { Check, Clock3, RefreshCw, Sparkles, Users, X } from 'lucide-react';
import { formatDay, formatTime, localDate, zoneLabel } from '../../lib/time';
import { t } from '../../lib/i18n';
import type { Candidate, MeetingEvent } from '../../lib/types';
import type { projectWeekly } from '../../lib/weekly';
type Props = {
    event: MeetingEvent;
    zone: string;
    identityId?: string;
    active: Candidate | null;
    suggestions: Candidate[];
    weeklyView: ReturnType<typeof projectWeekly> | null;
    onZoneChange: (zone: string) => void;
    onSelect: (candidate: Candidate) => void;
    onRefresh: () => void;
};
export default function EventResults({ event, zone, identityId, active, suggestions, weeklyView, onZoneChange, onSelect, onRefresh }: Props) {
    const organizer = event.is_organizer === true;
    const weekly = event.schedule_mode === 'weekdays';
    const viewZone = weekly ? 'UTC' : zone;
    return <aside className="results-sidebar">
      <section className="suggestions-card">
        <div className="sidebar-title">
          <span className="sparkle-icon"><Sparkles size={18}/></span>
          <h2>{t("Your Common Ground")}</h2>
        </div>
        <div className="suggestion-zone"><Clock3 size={13}/> {t('Times shown in {zone}', { zone: zoneLabel(zone) })}{organizer && zone !== event.timezone && <button className="text-button" onClick={() => onZoneChange(event.timezone)}>
            {t("Use Organizer’s Zone")}
          </button>}</div>
        {!suggestions.length ? <div className="empty-results">
          <Users size={28}/>
          <strong>{t(event.responses.length ? 'No Shared Times Yet' : 'The Possibilities Start With You.')}</strong>
          <p>
            {t(event.responses.length ? 'Add more availability to find a time that works.' : 'Mark your availability, then share the event with your group.')}
          </p>
        </div> : <div className="suggestions">
          {suggestions.map((candidate, i) => {
                const shown = weeklyView ? weeklyView.range(candidate) : candidate;
                return <button className={`suggestion ${active?.start === candidate.start ? 'active' : ''}`} key={candidate.start} onClick={() => onSelect(candidate)}>
            <div className="suggestion-top">
              <strong>{formatDay(shown.start, viewZone, false, weekly)}</strong>
              {i === 0 && <span className="best-badge">{t("Best Fit")}</span>}
            </div>
            <span className="suggestion-time">{formatTime(shown.start, viewZone)} – {localDate(shown.start, viewZone) !== localDate(shown.end, viewZone) ? formatDay(shown.end, viewZone, false, weekly) + ' ' : ''}{formatTime(shown.end, viewZone)}</span>
            <span className="attendance">
              <span className="attendance-dots">
                {Array.from({ length: Math.min(event.responses.length, 8) }, (_, j) => <i key={j} className={j < candidate.available.length ? 'filled' : ''}/>)}
              </span>
              {candidate.available.length === event.responses.length ? t('Everyone available') : t('{count} of {total} available', { count: candidate.available.length, total: event.responses.length })}
            </span>
          </button>;
            })}
        </div>}
        {active && <div className="candidate-detail">
          <strong>{t("Who Can Make It?")}</strong>
          {event.responses.map(r => <p key={r.id}>
            <span className={`presence ${active.available.includes(r.id) ? 'yes' : ''}`}>
              {active.available.includes(r.id) ? <Check size={12}/> : <X size={12}/>}
            </span>
            {r.name}
            <small>{t(active.available.includes(r.id) ? 'Available' : 'Unavailable')}</small>
          </p>)}
        </div>}
      </section>
      <section className="people-card">
        <div className="sidebar-title">
          <Users size={17}/>
          <h3>{t("The Group")} <span>{event.responses.length}</span></h3>
          <button className="icon-button" aria-label={t("Refresh responses")} onClick={onRefresh}>
            <RefreshCw size={14}/>
          </button>
        </div>
        {event.responses.length ? event.responses.map((r, i) => <div className="person" key={r.id}>
          <span className={`avatar avatar-${i % 3}`}>{r.name.slice(0, 1).toUpperCase()}</span>
          <span>
            <strong>{r.name}{r.id === identityId && <small> {t("(you)")}</small>}</strong>
            <small>{zoneLabel(r.timezone)}</small>
          </span>
          <Check size={14}/>
        </div>) : <p className="field-help">
          {t("Responses will appear here. Anyone who hasn’t responded is not counted as unavailable.")}
        </p>}
      </section>
    </aside>;
}
