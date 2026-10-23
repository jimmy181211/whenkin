import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Link2, LoaderCircle, Plus, Users, X } from 'lucide-react';
import ParticipantName from '../components/ParticipantName';
import PrivateEditLink from '../components/PrivateEditLink';
import AvailabilityStatus from '../components/AvailabilityStatus';
import AvailabilityGrid from '../components/AvailabilityGrid';
import TimezonePicker from '../components/TimezonePicker';
import PageLink from '../components/PageLink';
import { useUnsavedNavigation } from '../components/UnsavedNavigation';
import { projectWeekly } from '../lib/weekly';
import { readEventAccess, type ResponseIdentity } from '../lib/event-access';
import { api, loadSecret, saveSecret } from '../lib/api';
import { allSlots, deviceTimezone, slotsToRanges } from '../lib/time';
import { t } from '../lib/i18n';
import type { Candidate, MeetingEvent } from '../lib/types';
import EventResults from './event/EventResults';
import ShareEventDialog from './event/ShareEventDialog';
import EventLimits from '../components/EventLimits';
import { ApiError } from '../lib/api';
import { EVENT_EXPIRED_MESSAGE } from '../lib/event-limits';
type Identity = ResponseIdentity;
export default function EventPage({ id }: {
    id: string;
}) {
    const [event, setEvent] = useState<MeetingEvent | null>(null);
    const [zone, setZone] = useState(deviceTimezone);
    const [identity, setIdentity] = useState<Identity | null>(null);
    const [name, setName] = useState('');
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [isSaving, setIsSaving] = useState(false);
    const [editNotice, setEditNotice] = useState(false);
    const nameInput = useRef<HTMLInputElement>(null);
    const [error, setError] = useState('');
    const [unavailable, setUnavailable] = useState(false);
    const [saveState, setSaveState] = useState<'saved' | 'dirty' | 'saving' | 'error'>('saved');
    const [share, setShare] = useState(false);
    const [copied, setCopied] = useState('');
    const [active, setActive] = useState<Candidate | null>(null);
    const [showRestore, setShowRestore] = useState(false);
    const eventRef = useRef<MeetingEvent | null>(null);
    const dirty = useRef(false);
    const saving = useRef(false);
    const generation = useRef(0);
    const identityRef = useRef<Identity | null>(null);
    const revisionRef = useRef(0);
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
            const person = result.responses.find(r => r.id === identityRef.current?.id);
            const next = dirty.current ? new Set([...value.selected].filter(stamp => allowed.has(stamp))) : new Set(allSlots(person?.ranges || []));
            setSelected(next);
            latest.current = { ...value, selected: next };
            revisionRef.current = person?.revision ?? 0;
            generation.current++;
            setActive(null);
            if (dirty.current) {
                saveSecret(`meetgrid:draft:${result.id}`, JSON.stringify({ name: value.name, zone: value.zone, slots: [...next] }));
            }
        }
        eventRef.current = result;
        setEvent(result);
        setActive(current => current ? result.candidates?.find(candidate => candidate.start === current.start && candidate.end === current.end) ?? null : null);
    }, []);
    const load = useCallback(async () => {
        const person = identityRef.current;
        return api<MeetingEvent>(`/events/${id}${person ? '?response_id=' + person.id : ''}`, { headers: person ? { Authorization: `Bearer ${person.token}` } : {} });
    }, [id]);
    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const { response: restored } = readEventAccess(location.hash, loadSecret(`meetgrid:response:${id}`));
                let person = restored;
                if (person) {
                    saveSecret(`meetgrid:response:${id}`, JSON.stringify(person));
                }
                // Preserve the private response fragment for editing after a reload.
                identityRef.current = person;
                const result = await load();
                if (!alive) {
                    return;
                }
                const mine = result.responses.find(r => r.id === person?.id);
                if (mine) {
                    setName(mine.name);
                    setSelected(new Set(allSlots(mine.ranges)));
                    revisionRef.current = mine.revision;
                }
                else if (person) {
                    person = null;
                }
                setIdentity(person);
                identityRef.current = person;
                applyEvent(result);
                const draft = loadSecret(`meetgrid:draft:${id}`);
                if (draft) {
                    setShowRestore(true);
                }
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
    useEffect(() => {
        const reloadAccess = () => window.location.reload();
        window.addEventListener('hashchange', reloadAccess);
        return () => window.removeEventListener('hashchange', reloadAccess);
    }, []);
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
            // A calendar month can exceed the browser's maximum timer length.
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
        nameInput.current?.focus();
        nameInput.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    function mark(next: Set<number>) {
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
        const value = { ...latest.current, ...change };
        saveSecret(`meetgrid:draft:${id}`, JSON.stringify({ name: value.name, zone: value.zone, slots: [...value.selected] }));
    }
    function changeZone(next: string) {
        if (next === zone) {
            return;
        }
        setZone(next);
        if (latest.current.name.trim()) {
            changeDraft({ zone: next });
        }
    }
    const save = useCallback(async () => {
        if (saving.current || !eventRef.current || unavailable) {
            return;
        }
        const value = latest.current;
        saving.current = true;
        setIsSaving(true);
        const version = generation.current;
        setSaveState('saving');
        setError('');
        try {
            const person = identityRef.current;
            const payload = { name: value.name, timezone: value.zone, ranges: slotsToRanges(value.selected), revision: revisionRef.current, schedule_revision: eventRef.current.schedule_revision };
            const result = await api<{
                id: string;
                editToken?: string;
                revision: number;
            }>(`/events/${id}/responses${person ? '/' + person.id : ''}`, { method: person ? 'PUT' : 'POST', headers: person ? { Authorization: `Bearer ${person.token}` } : {}, body: JSON.stringify(payload) });
            if (!person) {
                const next = { id: result.id, token: result.editToken! };
                identityRef.current = next;
                setIdentity(next);
                saveSecret(`meetgrid:response:${id}`, JSON.stringify(next));
            }
            revisionRef.current = result.revision;
            applyEvent(await load());
            if (version === generation.current) {
                dirty.current = false;
                setSaveState('saved');
                try {
                    localStorage.removeItem(`meetgrid:draft:${id}`);
                }
                catch {
                }
            }
            else {
                setSaveState('dirty');
            }
        }
        catch (e) {
            if (e instanceof ApiError && e.status === 410) { expire(); return; }
            setError(e instanceof Error ? e.message : 'Could not save. Your draft stays on this device.');
            setSaveState('error');
        }
        finally {
            saving.current = false;
            setIsSaving(false);
        }
    }, [id, load, applyEvent, unavailable, expire]);
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
    function restore() {
        try {
            const draft = JSON.parse(loadSecret(`meetgrid:draft:${id}`) || 'null');
            if (draft && event) {
                const allowed = new Set(allSlots(event.windows));
                const restored = { name: draft.name || '', zone: draft.zone || zone, selected: new Set<number>((draft.slots || []).filter((s: number) => allowed.has(s))) };
                setName(restored.name);
                setZone(restored.zone);
                setSelected(restored.selected);
                changeDraft(restored);
            }
        }
        catch {
        }
        setShowRestore(false);
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
    const saveStatus = <AvailabilityStatus state={saveState} hasSavedResponse={!!identity}/>;
    return <main className="event-page">
      {navigation.dialog}
      <div className="event-layout">
        <section className="schedule-card">
          <header className="event-summary">
            <div className="event-heading">
              <div><h1>{event.title}</h1></div>
              <div className="event-actions">
                <PageLink className="button secondary compact event-new-event" href="/">
                  <Plus size={16}/>
                  {t('New Event')}
                </PageLink>
                <button className="button primary compact" onClick={() => setShare(true)}><Link2 size={17}/> {t('Share Event')}</button>
              </div>
            </div>
            <p className="event-meta">
              <span>
                <Users size={16}/>
                {t(responseCount === 1 ? '{count} response' : '{count} responses', { count: responseCount })}
              </span>
            </p>
            <EventLimits/>
            {event.description && <p className="event-description">{event.description}</p>}
          </header>
          {error && <div className="error-message" role="alert">{t(error)}</div>}
          {showRestore && <div className="draft-banner">
            <span>{t("You have an unsaved draft on this device.")}</span>
            <button className="text-button" onClick={restore}>{t("Restore Draft")}</button>
            <button className="icon-button" aria-label={t("Dismiss draft")} onClick={() => setShowRestore(false)}>
              <X size={15}/>
            </button>
          </div>}
          <div className="participant-controls">
            <ParticipantName name={name} inputRef={nameInput} editNotice={editNotice} onChange={value => {
        setName(value);
        setEditNotice(false);
        changeDraft({ name: value });
    }}/>
            <TimezonePicker value={zone} onChange={changeZone} at={weeklyView?.referenceTime ?? Date.parse(event.windows[0].start)}/>
          </div>
          <AvailabilityGrid key={event.id + ':' + event.schedule_revision} event={event} zone={zone} selected={selected} onChange={mark} highlight={active} status={saveStatus} canEdit={!!name.trim()} onEditBlocked={requestEditing}/>
          <div className="save-bar">
            <button className="button primary compact" disabled={saveState === 'saved' || saveState === 'saving'} onClick={() => void save()}>
              {t(saveState === 'saving' ? 'Saving…' : 'Save Availability')}
              <Check size={16}/>
            </button>
          </div>
          <PrivateEditLink url={identity ? eventLink + `#edit=${identity.id}.${identity.token}` : undefined} copied={copied === 'edit'} onCopy={value => {
        void copy(value, 'edit');
    }}/>
        </section>
        <EventResults event={event} zone={zone} identityId={identity?.id} active={active} suggestions={suggestions} weeklyView={weeklyView} onZoneChange={changeZone} onSelect={candidate => {
        setActive(active?.start === candidate.start ? null : candidate);
    }} onRefresh={() => {
        load().then(applyEvent).catch(e => setError(e.message));
    }}/>
      </div>
      {share && <ShareEventDialog eventLink={eventLink} copied={copied} onClose={() => setShare(false)} onCopy={copy}/>}
    </main>;
}
