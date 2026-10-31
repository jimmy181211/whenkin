import React, { useEffect, useState } from 'react';
import { ArrowRight, CalendarDays, Info, LoaderCircle, Users, Plus, RefreshCw } from 'lucide-react';
import SchedulePicker from '../components/SchedulePicker';
import TimezonePicker from '../components/TimezonePicker';
import PageLink from '../components/PageLink';
import EventLimits from '../components/EventLimits';
import { api } from '../lib/api';
import { deviceTimezone } from '../lib/time';
import { getLocale, t } from '../lib/i18n';
const times = Array.from({ length: 97 }, (_, i) => `${String(Math.floor(i / 4)).padStart(2, '0')}:${String(i % 4 * 15).padStart(2, '0')}`);
function labelTime(value: string) {
    if (value === '24:00') {
        return t('Midnight (next day)');
    }
    return new Intl.DateTimeFormat(getLocale(), { timeZone: 'UTC', hour: 'numeric', minute: '2-digit' }).format(new Date(`2000-01-01T${value}:00Z`));
}
async function connectionStatus(): Promise<'ready' | 'setup' | 'unreachable'> {
    try {
        const result = await api<{
            ready: boolean;
        }>('/health');
        return result.ready === true ? 'ready' : 'setup';
    }
    catch {
        return 'unreachable';
    }
}
export default function CreateEventPage() {
    const [scheduleMode, setScheduleMode] = useState<'dates' | 'weekdays'>('dates');
    const [weekdays, setWeekdays] = useState<number[]>([]);
    const [zone, setZone] = useState(deviceTimezone);
    const [dates, setDates] = useState<string[]>([]);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [notes, setNotes] = useState(false);
    const [start, setStart] = useState('09:00');
    const [end, setEnd] = useState('18:00');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [connection, setConnection] = useState<'checking' | 'ready' | 'setup' | 'unreachable'>('checking');
    const checkConnection = async () => {
        setConnection('checking');
        setConnection(await connectionStatus());
    };
    useEffect(() => {
        let alive = true;
        void connectionStatus().then(status => {
            if (alive) {
                setConnection(status);
            }
        });
        return () => {
            alive = false;
        };
    }, []);
    async function create(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        if (connection !== 'ready') {
            return;
        }
        if (scheduleMode === 'weekdays' ? !weekdays.length : !dates.length) {
            setError(scheduleMode === 'weekdays' ? 'Choose at least one day of the week.' : 'Choose at least one date on the calendar.');
            return;
        }
        if (start >= end) {
            setError('Choose an end time after the start time.');
            return;
        }
        setBusy(true);
        try {
            const result = await api<{
                id: string;
            }>('/events', { method: 'POST', body: JSON.stringify({ title, description, timezone: zone, dates, schedule_mode: scheduleMode, weekdays, startTime: start, endTime: end }) });
            window.location.assign(new URL(`/e/${result.id}`, location.href).href);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Could not create your event. Please try again.');
            setBusy(false);
        }
    }
    return <main className="create-page">
      <section className="intro">
        <PageLink className="mobile-guide-link" href="/how-it-works">{t("How It Works")} <ArrowRight size={16}/></PageLink>
      </section>
      <section className="create-card">
        <div className="form-heading">
          <div><h2>{t("Create Your Event")}</h2></div>
          <div className="heading-icon"><CalendarDays size={22}/></div>
        </div>
        <form onSubmit={create}>
          <label className="field">
            {t("Event Name")}
            <input autoComplete="off" required maxLength={100} value={title} onChange={e => setTitle(e.target.value)}/>
          </label>
          {notes ? <label className="field">
            <span>{t("Note")} <span className="optional">{t("optional")}</span></span>
            <textarea maxLength={1000} rows={2} value={description} onChange={e => setDescription(e.target.value)}/>
          </label> : <button className="text-button add-note" type="button" onClick={() => setNotes(true)}><Plus size={14}/> {t("Add a Note")}</button>}
          <div className="form-divider"/>
          <SchedulePicker mode={scheduleMode} onModeChange={mode => {
        setScheduleMode(mode);
        setError('');
    }} dates={dates} onDatesChange={setDates} weekdays={weekdays} onWeekdaysChange={setWeekdays} timezone={zone}/>
          <div className="fields-row two-fields">
            <label className="field">
              {t("From")}
              <select value={start} onChange={e => setStart(e.target.value)}>
                {times.slice(0, -1).map(t => <option key={t} value={t}>{labelTime(t)}</option>)}
              </select>
            </label>
            <label className="field">
              {t("Until")}
              <select value={end} onChange={e => setEnd(e.target.value)}>
                {times.slice(1).map(t => <option key={t} value={t}>{labelTime(t)}</option>)}
              </select>
            </label>
          </div>
          <TimezonePicker value={zone} onChange={setZone}/>
          <p className="field-help">{t("Your guests will see their own local time")}</p>
          {(connection === 'setup' || connection === 'unreachable') && <div className="connection-notice" role="status">
            <Info size={17}/>
            <div>
              <strong>
                {t(connection === 'setup' ? 'Event creation is still being set up.' : 'We can’t reach event saving right now.')}
              </strong>
              <p>
                {t(connection === 'setup' ? 'Shareable links will be available when setup is complete.' : 'Your form is still here. Please retry the connection.')}
              </p>
              <div>
                <button type="button" className="text-button" onClick={() => void checkConnection()}><RefreshCw size={12}/> {t("Retry Connection")}</button>
              </div>
            </div>
          </div>}
          {error && <p className="error-message" role="alert">{t(error)}</p>}
          <EventLimits />
          <button disabled={busy || connection !== 'ready'} className="button primary create-submit" type="submit">
            {busy ? <><LoaderCircle className="spin" size={18}/> {t("Creating your event…")}</> : connection === 'checking' ? <><LoaderCircle className="spin" size={18}/> {t("Checking connection…")}</> : <>{t("Create Event & Get a Link")} <ArrowRight size={18}/></>}
          </button>
          <p className="privacy-note mobile-hide"><Users size={12}/> {t("Everyone with the link can view and edit all responses.")}</p>
        </form>
      </section>
    </main>;
}
