import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Link2, LoaderCircle, Users } from 'lucide-react';
import ParticipantName from '../components/ParticipantName';
import AvailabilityStatus from '../components/AvailabilityStatus';
import AvailabilityGrid from '../components/AvailabilityGrid';
import TimezonePicker from '../components/TimezonePicker';
import PageLink from '../components/PageLink';
import { useUnsavedNavigation } from '../components/UnsavedNavigation';
import { projectWeekly } from '../lib/weekly';
import { loadEvent } from '../lib/load-event';
import { api } from '../lib/api';
import { allSlots, deviceTimezone, slotsToRanges } from '../lib/time';
import { t } from '../lib/i18n';
import type { Candidate, MeetingEvent } from '../lib/types';
import EventResults from './event/EventResults';
import ShareEventDialog from './event/ShareEventDialog';
import EventLimits from '../components/EventLimits';
import Toast from '../components/Toast';
import { ApiError } from '../lib/api';
import { EVENT_EXPIRED_MESSAGE } from '../lib/event-limits';
export default function EventPage({ id }: {
    id: string;
}) {
    const [event, setEvent] = useState<MeetingEvent | null>(null);
    const [zone, setZone] = useState(deviceTimezone);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [switching, setSwitching] = useState(false);
    const switchingRef = useRef(false);
    const [responseSession, setResponseSession] = useState(0);
    const [name, setName] = useState('');
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [isSaving, setIsSaving] = useState(false);
    const [editNotice, setEditNotice] = useState(false);
    const [notice, setNotice] = useState<{ message: string; id: number; anchor: HTMLElement | null } | null>(null);
    const noticeId = useRef(0);
    const dismissNotice = useCallback(() => setNotice(null), []);
    const notify = useCallback((message: string, anchor: HTMLElement | null) => setNotice({ message, anchor, id: ++noticeId.current }), []);
    const nameInput = useRef<HTMLInputElement>(null);
    const [error, setError] = useState('');
    const [unavailable, setUnavailable] = useState(false);
    const [saveState, setSaveState] = useState<'saved' | 'dirty' | 'saving' | 'error'>('saved');
    const [view, setView] = useState<'personal' | 'group'>('personal');
    const [share, setShare] = useState(false);
    const [copied, setCopied] = useState('');
    const [active, setActive] = useState<Candidate | null>(null);
    const eventRef = useRef<MeetingEvent | null>(null);
    const dirty = useRef(false);
    const saving = useRef(false);
    const generation = useRef(0);
    const editingIdRef = useRef<string | null>(null);
    const savingTask = useRef<Promise<boolean> | null>(null);
    const conflict = useRef(false);
    const revisionRef = useRef(0);
    const responseZoneRef = useRef<string | null>(null);
    const latest = useRef({ name, zone, selected });
    useEffect(() => {
        latest.current = { name, zone, selected };
        eventRef.current = event;
    }, [name, zone, selected, event]);
    const applyEvent = useCallback((result: MeetingEvent) => {
        const previous = eventRef.current;
        if (previous && previous.schedule_revision !== result.schedule_revision) {
            const value = latest.current;
            const allowed = new Set(allSlots(result.windows));
            const person = result.responses.find(r => r.id === editingIdRef.current);
            const next = dirty.current ? new Set([...value.selected].filter(stamp => allowed.has(stamp))) : new Set(allSlots(person?.ranges || []));
            setSelected(next);
            latest.current = { ...value, selected: next };
            revisionRef.current = person?.revision ?? 0;
            generation.current++;
            setActive(null);
        }
        const current = result.responses.find(response => response.id === editingIdRef.current);
        if (current && !dirty.current && !saving.current && current.revision !== revisionRef.current) {
            const next = new Set(allSlots(current.ranges));
            revisionRef.current = current.revision;
            responseZoneRef.current = current.timezone;
            latest.current = { ...latest.current, name: current.name, selected: next };
            setName(current.name);
            setSelected(next);
            setResponseSession(value => value + 1);
        }
        eventRef.current = result;
        setEvent(result);
        setActive(current => current ? result.candidates?.find(candidate => candidate.start === current.start && candidate.end === current.end) ?? null : null);
    }, []);
    const load = useCallback(() => loadEvent(id), [id]);
    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const result = await loadEvent(id);
                if (!alive) return;
                applyEvent(result);
            }
            catch (e) {
                if (alive) {
                    setError(e instanceof Error ? e.message : 'Could not load this event.');
                }
            }
        })();
        return () => {
            alive = false;
        };
    }, [id, load, applyEvent]);
    const hasEvent = event !== null && !unavailable;
    const expire = useCallback(() => {
        setUnavailable(true);
        eventRef.current = null;
        dirty.current = false;
        setSaveState('saved');
        setError(EVENT_EXPIRED_MESSAGE);
    }, []);
    useEffect(() => {
        if (!event?.expires_at) return;
        let timer: ReturnType<typeof setTimeout>;
        const checkExpiry = () => {
            const remaining = Date.parse(event.expires_at!) - Date.now();
            if (remaining <= 0) expire();
            // A calendar year can exceed the browser's maximum timer length.
            else timer = setTimeout(checkExpiry, Math.min(remaining, 2147483647));
        };
        checkExpiry();
        return () => clearTimeout(timer);
    }, [event?.expires_at, expire]);
    useEffect(() => {
        if (!hasEvent) {
            return;
        }
        const refreshError = (error: unknown) => {
            if (error instanceof ApiError && (error.status === 410 || error.status === 404)) expire();
        };
        const timer = setInterval(() => {
            if (document.visibilityState === 'visible') {
                load().then(applyEvent).catch(refreshError);
            }
        }, 10000);
        const refresh = () => {
            if (document.visibilityState === 'visible') {
                load().then(applyEvent).catch(refreshError);
            }
        };
        window.addEventListener('focus', refresh);
        document.addEventListener('visibilitychange', refresh);
        return () => {
            clearInterval(timer);
            window.removeEventListener('focus', refresh);
            document.removeEventListener('visibilitychange', refresh);
        };
    }, [hasEvent, load, applyEvent, expire]);
    const navigation = useUnsavedNavigation(saveState !== 'saved');
    function requestEditing() {
        setEditNotice(true);
        notify('Enter your name before editing availability.', nameInput.current);
        nameInput.current?.focus();
        nameInput.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    function mark(next: Set<number>) {
        if (switchingRef.current) return;
        if (!latest.current.name.trim()) {
            requestEditing();
            return;
        }
        setSelected(next);
        changeDraft({ selected: next });
    }
    function changeDraft(change: Partial<typeof latest.current> = {}) {
        dirty.current = true;
        generation.current++;
        setSaveState('dirty');
        latest.current = { ...latest.current, ...change };
    }
    function changeZone(next: string) {
        if (switchingRef.current) return;
        if (next === zone) {
            return;
        }
        setZone(next);
        latest.current = { ...latest.current, zone: next };
        if (!editingIdRef.current && latest.current.name.trim()) changeDraft({ zone: next });
    }
    const persist = useCallback(async (): Promise<boolean> => {
        if (!eventRef.current || unavailable) return false;
        const value = latest.current;
        if (!value.name.trim()) {
            setEditNotice(true);
            notify('Enter your name before editing availability.', nameInput.current);
            nameInput.current?.focus();
            return false;
        }
        saving.current = true;
        setIsSaving(true);
        const version = generation.current;
        setSaveState('saving');
        setError('');
        try {
            const responseId = editingIdRef.current;
            const payload = { name: value.name, timezone: responseZoneRef.current ?? value.zone, ranges: slotsToRanges(value.selected), revision: revisionRef.current, schedule_revision: eventRef.current.schedule_revision };
            const result = await api<{
                id: string;
                revision: number;
            }>(`/events/${id}/responses${responseId ? '/' + responseId : ''}`, { method: responseId ? 'PUT' : 'POST', body: JSON.stringify(payload) });
            if (!responseId) {
                editingIdRef.current = result.id;
                responseZoneRef.current = value.zone;
                setEditingId(result.id);
            }
            revisionRef.current = result.revision;
            applyEvent(await load());
            if (version === generation.current) {
                dirty.current = false;
                setSaveState('saved');
                return true;
            }
            else {
                setSaveState('dirty');
                return false;
            }
        }
        catch (e) {
            if (e instanceof ApiError && e.status === 410) { expire(); return false; }
            setError(e instanceof Error ? e.message : 'Could not save. Please keep this page open and try again.');
            if (e instanceof ApiError && e.status === 409) conflict.current = true;
            setSaveState('error');
            return false;
        }
        finally {
            saving.current = false;
            setIsSaving(false);
        }
    }, [id, load, applyEvent, unavailable, expire, notify]);
    const save = useCallback(() => {
        if (savingTask.current) return savingTask.current;
        const task = persist();
        savingTask.current = task;
        void task.then(() => { if (savingTask.current === task) savingTask.current = null; });
        return task;
    }, [persist]);
    async function editResponse(responseId: string | null) {
        if (switchingRef.current) return;
        switchingRef.current = true;
        setSwitching(true);
        try {
            // Finish the current response before loading another person's data.
            const reloadConflict = conflict.current && responseId === editingIdRef.current;
            if (!reloadConflict && (dirty.current || savingTask.current) && !(await save())) return;
            const result = await load();
            if (dirty.current && !reloadConflict) return;
            const person = result.responses.find(response => response.id === responseId);
            if (responseId && !person) throw new Error('This response could not be found. Refresh the group and try again.');
            applyEvent(result);
            const next = { name: person?.name ?? '', zone: latest.current.zone, selected: new Set(allSlots(person?.ranges ?? [])) };
            editingIdRef.current = person?.id ?? null;
            revisionRef.current = person?.revision ?? 0;
            responseZoneRef.current = person?.timezone ?? null;
            latest.current = next;
            generation.current++;
            dirty.current = false;
            conflict.current = false;
            setEditingId(person?.id ?? null);
            setName(next.name);
            setSelected(next.selected);
            setSaveState('saved');
            setView('personal');
            setActive(null);
            setError('');
            setEditNotice(false);
            dismissNotice();
            setResponseSession(value => value + 1);
            nameInput.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        } catch (error) {
            if (error instanceof ApiError && (error.status === 410 || error.status === 404)) expire();
            else setError(error instanceof Error ? error.message : 'Could not load this event.');
        } finally {
            switchingRef.current = false;
            setSwitching(false);
        }
    }
    useEffect(() => {
        if (saveState !== 'dirty' || !name.trim() || isSaving || unavailable) {
            return;
        }
        const timer = setTimeout(() => {
            void save();
        }, 1000);
        return () => clearTimeout(timer);
    }, [saveState, name, selected, zone, save, isSaving, unavailable]);
    const suggestions = event?.candidates ?? [];
    async function copy(value: string, label: string) {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(label);
            setTimeout(() => setCopied(''), 2200);
        }
        catch {
            setError('Copy did not work. Select the link in the sharing panel and copy it manually.');
        }
    }
    const weeklyView = useMemo(() => event?.schedule_mode === 'weekdays' ? projectWeekly(event, zone) : null, [event, zone]);
    if (!event || unavailable) {
        return <main className="loading-page">
      {error ? <>
        <h1>{t("We Couldn’t Open That Event.")}</h1>
        <p role="alert">{t(error)}</p>
        <PageLink href="/" className="button secondary">{t("Back to Home")}</PageLink>
      </> : <><LoaderCircle className="spin"/><p>{t("Finding your shared time…")}</p></>}
    </main>;
    }
    const responseCount = event.response_count ?? event.responses.length;
    const eventLink = location.origin + `/e/${id}`;
    const saveStatus = <AvailabilityStatus state={saveState} hasSavedResponse={!!editingId}/>;
    return <main className="event-page">
      {navigation.dialog}
      {notice && <Toast key={notice.id} message={notice.message} anchor={notice.anchor} onDismiss={dismissNotice}/>}
      <div className="event-layout">
        <section className="schedule-card">
          <header className="event-summary">
            <div className="event-heading">
              <div><h1>{event.title}</h1></div>
              <div className="event-actions">
                <button className="button primary compact" onClick={() => setShare(true)}><Link2 size={17}/> {t('Share Event')}</button>
              </div>
            </div>
            <div className="event-summary-details"><p className="event-meta">
              <span>
                <Users size={16}/>
                {t(responseCount === 1 ? '{count} response' : '{count} responses', { count: responseCount })}
              </span>
            </p>
            <EventLimits/></div>
            {event.description && <p className="event-description">{event.description}</p>}
          </header>
          {error && <div className="error-message" role="alert">{t(error)}</div>}
          <div className="participant-controls">
            <ParticipantName name={name} disabled={switching} inputRef={nameInput} editNotice={editNotice} onChange={value => {
        setName(value);
        setEditNotice(false);
        changeDraft({ name: value });
    }}/>
            <TimezonePicker value={zone} onChange={changeZone} at={weeklyView?.referenceTime ?? Date.parse(event.windows[0].start)}/>
          </div>
          <AvailabilityGrid key={event.id + ':' + event.schedule_revision + ':' + responseSession} event={event} zone={zone} selected={selected} onChange={mark} highlight={active} view={view} onViewChange={setView} status={saveStatus} canEdit={!switching && !!name.trim()} onEditBlocked={() => { if (!switching) requestEditing(); }}/>
          <div className="save-bar">
            <button className="button primary compact" disabled={saveState === 'saved' || saveState === 'saving'} onClick={() => void save()}>
              {t(saveState === 'saving' ? 'Saving…' : 'Save Availability')}
              <Check size={16}/>
            </button>
          </div>

        </section>
        <EventResults event={event} zone={zone} editingId={editingId} onEditResponse={responseId => void editResponse(responseId)} switching={switching} active={active} suggestions={suggestions} weeklyView={weeklyView} onZoneChange={changeZone} onSelect={candidate => {
        setActive(active?.start === candidate.start ? null : candidate);
    }} onRefresh={() => {
        load().then(applyEvent).catch(e => setError(e.message));
    }}/>
      </div>
      {share && <ShareEventDialog eventLink={eventLink} copied={copied} onClose={() => { setShare(false); dismissNotice(); }} onCopy={copy}/>}
    </main>;
}
