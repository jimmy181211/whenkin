/** Owns response drafts, autosave, and coordinated responder changes. */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { loadEvent } from '../api/load-event';
import {
  api,
  ApiError,
} from '../api/client';
import {
  allSlots,
  deviceTimezone,
  slotsToRanges,
} from './time';
import type {
  MeetingEvent,
  ResponseData,
} from '../../shared/types';
import type { SlotInspection } from '../components/SlotDetails';
import { EVENT_EXPIRED_MESSAGE } from '../../shared/event-limits';
import { useNotice } from './use-notice';
import { useEventSync } from './use-event-sync';

const AUTOSAVE_DELAY_MS = 1000;

/** Keeps autosave, response switching, and deletion on the same draft state. */
export function useEventResponse(id: string) {
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
  const {
    notice,
    notify,
    notifyRequired,
    dismissNotice,
  } = useNotice();
  const nameInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [unavailableReason, setUnavailableReason] = useState<
    'expired' | 'missing' | null
  >(null);
  const unavailable = unavailableReason !== null;
  const [saveState, setSaveState] = useState<
    'saved' | 'dirty' | 'saving' | 'error'
  >('saved');
  const [view, setView] = useState<'personal' | 'group'>('personal');
  const [inspection, setInspection] = useState<SlotInspection | null>(null);
  const [highlightShared, setHighlightShared] = useState(false);
  const eventRef = useRef<MeetingEvent | null>(null);
  const dirtyRef = useRef(false);
  const savingRef = useRef(false);
  const draftVersion = useRef(0);
  const editingIdRef = useRef<string | null>(null);
  const savingTask = useRef<Promise<boolean> | null>(null);
  const conflictRef = useRef(false);
  const deletingResponse = useRef<string | null>(null);
  const responseRevisionRef = useRef(0);
  const responseZoneRef = useRef<string | null>(null);
  const latestDraft = useRef({
    name,
    zone,
    selected,
  });
  useEffect(() => {
    latestDraft.current = {
      name,
      zone,
      selected,
    };
    eventRef.current = event;
  }, [
    name,
    zone,
    selected,
    event,
  ]);

  // Preserve local edits when fresh event data arrives.
  const applyEvent = useCallback((result: MeetingEvent) => {
    const previous = eventRef.current;
    if (previous && previous.schedule_revision !== result.schedule_revision) {
      const value = latestDraft.current;
      const allowed = new Set(allSlots(result.windows));
      const person = result.responses.find(
        (r) => r.id === editingIdRef.current,
      );
      const next = dirtyRef.current
        ? new Set([...value.selected].filter((stamp) => allowed.has(stamp)))
        : new Set(allSlots(person?.ranges || []));
      setSelected(next);
      latestDraft.current = {
        ...value,
        selected: next,
      };
      responseRevisionRef.current = person?.revision ?? 0;
      draftVersion.current++;
      setHighlightShared(false);
      setInspection(null);
    }
    const current = result.responses.find(
      (response) => response.id === editingIdRef.current,
    );
    if (
      current &&
      !dirtyRef.current &&
      !savingRef.current &&
      current.revision !== responseRevisionRef.current
    ) {
      const next = new Set(allSlots(current.ranges));
      responseRevisionRef.current = current.revision;
      responseZoneRef.current = current.timezone;
      latestDraft.current = {
        ...latestDraft.current,
        name: current.name,
        selected: next,
      };
      setName(current.name);
      setSelected(next);
      setResponseSession((value) => value + 1);
    }
    eventRef.current = result;
    setEvent(result);
  }, []);

  const load = useCallback(() => loadEvent(id), [id]);

  const hasEvent = event !== null && !unavailable;

  const expire = useCallback((reason: 'expired' | 'missing' = 'expired') => {
    setUnavailableReason(reason);
    eventRef.current = null;
    dirtyRef.current = false;
    setSaveState('saved');
    setError(EVENT_EXPIRED_MESSAGE);
  }, []);

  useEventSync({
    id,
    event,
    hasEvent,
    load,
    applyEvent,
    expire,
    setError,
    setUnavailableReason,
  });

  function requestEditing() {
    setEditNotice(true);
    void notifyRequired(
      'Enter your name before editing availability.',
      nameInput.current,
    );
  }

  function updateSelection(next: Set<number>) {
    if (switchingRef.current) {
      return;
    }
    if (!latestDraft.current.name.trim()) {
      requestEditing();
      return;
    }
    setSelected(next);
    updateDraft({ selected: next });
  }

  function updateDraft(change: Partial<typeof latestDraft.current> = {}) {
    dirtyRef.current = true;
    draftVersion.current++;
    setSaveState('dirty');
    latestDraft.current = {
      ...latestDraft.current,
      ...change,
    };
  }

  function changeZone(next: string) {
    if (switchingRef.current) {
      return;
    }
    if (next === zone) {
      return;
    }
    setInspection(null);
    setZone(next);
    latestDraft.current = {
      ...latestDraft.current,
      zone: next,
    };
    if (!editingIdRef.current && latestDraft.current.name.trim()) {
      updateDraft({ zone: next });
    }
  }

  // Save a snapshot; edits made during the request remain pending.
  const persist = useCallback(async (): Promise<boolean> => {
    if (
      !eventRef.current ||
      unavailable ||
      (deletingResponse.current !== null &&
        deletingResponse.current === editingIdRef.current)
    ) {
      return false;
    }
    const value = latestDraft.current;
    if (!value.name.trim()) {
      setEditNotice(true);
      void notifyRequired(
        'Enter your name before editing availability.',
        nameInput.current,
      );
      return false;
    }
    savingRef.current = true;
    setIsSaving(true);
    const savedDraftVersion = draftVersion.current;
    setSaveState('saving');
    setError('');
    try {
      const responseId = editingIdRef.current;
      const payload = {
        name: value.name,
        timezone: responseZoneRef.current ?? value.zone,
        ranges: slotsToRanges(value.selected),
        revision: responseRevisionRef.current,
        schedule_revision: eventRef.current.schedule_revision,
      };
      const result = await api<{
        id: string;
        revision: number;
      }>(`/events/${id}/responses${responseId ? '/' + responseId : ''}`, {
        method: responseId ? 'PUT' : 'POST',
        keepalive: true,
        body: JSON.stringify(payload),
      });
      if (!responseId) {
        editingIdRef.current = result.id;
        responseZoneRef.current = value.zone;
        setEditingId(result.id);
      }
      responseRevisionRef.current = result.revision;
      applyEvent(await load());
      if (savedDraftVersion === draftVersion.current) {
        dirtyRef.current = false;
        setSaveState('saved');
        return true;
      } else {
        setSaveState('dirty');
        return false;
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 410) {
        expire();
        return false;
      }
      setError(
        e instanceof Error
          ? e.message
          : 'Could not save. Please keep this page open and try again.',
      );
      if (e instanceof ApiError && e.status === 409) {
        conflictRef.current = true;
      }
      setSaveState('error');
      return false;
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }, [
    id,
    load,
    applyEvent,
    unavailable,
    expire,
    notifyRequired,
  ]);

  const save = useCallback(() => {
    if (savingTask.current) {
      return savingTask.current;
    }
    const task = persist();
    savingTask.current = task;
    void task.then(() => {
      if (savingTask.current === task) {
        savingTask.current = null;
      }
    });
    return task;
  }, [persist]);

  /** Finish the current draft before loading another response. */
  async function editResponse(responseId: string) {
    if (switchingRef.current) {
      return;
    }
    switchingRef.current = true;
    setSwitching(true);
    try {
      // Finish the current response before loading another person's data.
      const reloadConflict =
        conflictRef.current && responseId === editingIdRef.current;
      if (
        !reloadConflict &&
        (dirtyRef.current || savingTask.current) &&
        !(await save())
      ) {
        return;
      }
      const result = await load();
      if (dirtyRef.current && !reloadConflict) {
        return;
      }
      const person = result.responses.find(
        (response) => response.id === responseId,
      );
      if (!person) {
        throw new Error(
          'This response could not be found. Refresh the group and try again.',
        );
      }
      applyEvent(result);
      const next = {
        name: person.name,
        zone: latestDraft.current.zone,
        selected: new Set(allSlots(person.ranges)),
      };
      editingIdRef.current = person.id;
      responseRevisionRef.current = person.revision;
      responseZoneRef.current = person.timezone;
      latestDraft.current = next;
      draftVersion.current++;
      dirtyRef.current = false;
      conflictRef.current = false;
      setEditingId(person.id);
      setName(next.name);
      setSelected(next.selected);
      setSaveState('saved');
      setView('personal');
      setHighlightShared(false);
      setError('');
      setEditNotice(false);
      dismissNotice();
      setResponseSession((value) => value + 1);
      nameInput.current?.scrollIntoView({
        block: 'center',
        behavior: 'smooth',
      });
    } catch (error) {
      if (
        error instanceof ApiError &&
        (error.status === 410 || error.status === 404)
      ) {
        expire(error.status === 404 ? 'missing' : 'expired');
      } else {
        setError(
          error instanceof Error ? error.message : 'Could not load this event.',
        );
      }
    } finally {
      switchingRef.current = false;
      setSwitching(false);
    }
  }

  useEffect(() => {
    if (
      saveState !== 'dirty' ||
      !name.trim() ||
      isSaving ||
      unavailable ||
      switching
    ) {
      return;
    }
    const timer = setTimeout(() => {
      void save();
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [
    saveState,
    name,
    selected,
    zone,
    save,
    isSaving,
    unavailable,
    switching,
  ]);

  function clearDeletedDraft(responseId: string) {
    if (editingIdRef.current !== responseId) {
      return;
    }
    editingIdRef.current = null;
    responseRevisionRef.current = 0;
    responseZoneRef.current = null;
    latestDraft.current = {
      name: '',
      zone: latestDraft.current.zone,
      selected: new Set<number>(),
    };
    draftVersion.current++;
    dirtyRef.current = false;
    conflictRef.current = false;
    setEditingId(null);
    setName('');
    setSelected(new Set());
    setSaveState('saved');
    setEditNotice(false);
    setResponseSession((value) => value + 1);
  }

  /** Coordinate deletion with any save already in flight. */
  async function deleteResponse(response: ResponseData): Promise<boolean> {
    if (switchingRef.current || !eventRef.current) {
      return false;
    }
    switchingRef.current = true;
    deletingResponse.current = response.id;
    setSwitching(true);
    const own = editingIdRef.current === response.id;
    const pending = savingTask.current;
    const anchor = document.getElementById('delete-response-' + response.id);
    let removed = false;
    try {
      if (own) {
        // Finish an already-sent write, but do not save a draft that is being deleted.
        if (pending) {
          await pending;
        }
      } else if ((dirtyRef.current || savingTask.current) && !(await save())) {
        return false;
      }
      const revision =
        own && pending ? responseRevisionRef.current : response.revision;
      let fresh: MeetingEvent | undefined;
      try {
        await api('/events/' + id + '/responses/' + response.id, {
          method: 'DELETE',
          keepalive: true,
          body: JSON.stringify({
            revision,
            schedule_revision: eventRef.current!.schedule_revision,
          }),
        });
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 404) {
          throw error;
        }
        fresh = await load();
        if (fresh.responses.some((person) => person.id === response.id)) {
          throw error;
        }
      }
      removed = true;
      clearDeletedDraft(response.id);
      const previous = eventRef.current!;
      const responses = previous.responses.filter(
        (person) => person.id !== response.id,
      );
      applyEvent(
        fresh ?? {
          ...previous,
          responses,
          response_count: responses.length,
          candidates: [],
        },
      );
      setHighlightShared(false);
      setError('');
      if (!fresh) {
        applyEvent(await load());
      }
      return true;
    } catch (error) {
      if (removed) {
        setError('Response deleted. Results will refresh shortly.');
        return true;
      }
      if (error instanceof ApiError && error.status === 410) {
        expire();
      } else {
        const message =
          error instanceof Error
            ? error.message
            : 'Could not delete this response. Please try again.';
        setError(message);
        notify(message, anchor);
        if (error instanceof ApiError && error.status === 409) {
          try {
            applyEvent(await load());
          } catch {
            /* The next refresh can retry. */
          }
        }
      }
      return false;
    } finally {
      deletingResponse.current = null;
      switchingRef.current = false;
      setSwitching(false);
    }
  }

  return {
    event,
    zone,
    editingId,
    switching,
    responseSession,
    name,
    selected,
    isSaving,
    editNotice,
    notice,
    nameInput,
    error,
    unavailableReason,
    unavailable,
    saveState,
    view,
    inspection,
    highlightShared,
    conflictRef,
    setName,
    setEditNotice,
    dismissNotice,
    updateDraft,
    changeZone,
    updateSelection,
    requestEditing,
    save,
    deleteResponse,
    editResponse,
    setView,
    setHighlightShared,
    setInspection,
    setError,
  };
}
