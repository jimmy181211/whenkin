/** Owns response drafts, explicit saving, and coordinated responder changes. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { loadEvent } from '../api/load-event';
import { ApiError } from '../api/client';
import { saveEventResponse, removeEventResponse } from '../api/responses';
import { allSlots, deviceTimezone, slotsToRanges, slotDuration } from './time';
import type { MeetingEvent, ResponseData } from '../../shared/types';
import type { SlotInspection } from '../components/SlotDetails';
import { EVENT_EXPIRED_MESSAGE } from '../../shared/event-limits';
import { useNotice } from './use-notice';
import { useEventSync } from './use-event-sync';

/**
 * React Hook for one event's reply editor, manual saving, switching, and deletion.
 * These actions share a draft so switching people cannot save to the wrong reply.
 * @param id - Event id from the page URL.
 * @returns Page state and the actions used by EventPage and its child controls.
 */
export function useEventResponse(id: string) {
  const [event, setEvent] = useState<MeetingEvent | null>(null);
  const [zone, setZone] = useState(deviceTimezone);
  // Null until the first save creates a reply; later saves update this id.
  const [editingId, setEditingId] = useState<string | null>(null);
  // Disable editor controls while loading another reply or deleting a response.
  const [switching, setSwitching] = useState(false);
  // Unlike React state, this changes immediately to block a second click.
  const switchingRef = useRef(false);
  // Included in the grid's React key to reset gestures when a reply is loaded.
  const [responseSession, setResponseSession] = useState(0);
  const [name, setName] = useState('');
  // Each number is a selected slot start in milliseconds; the event sets its duration.
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  // Highlights the missing name when an availability edit was blocked.
  const [editNotice, setEditNotice] = useState(false);
  const { notice, notify, notifyRequired, dismissNotice } = useNotice();
  const nameInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [unavailableReason, setUnavailableReason] = useState<'expired' | 'missing' | null>(null);
  const unavailable = unavailableReason !== null;
  // "dirty" means local edits still need saving; "error" waits for a retry.
  const [saveState, setSaveState] = useState<'saved' | 'dirty' | 'saving' | 'error'>('saved');
  const [view, setView] = useState<'personal' | 'group'>('personal');
  // Group time block whose responder details are open; null hides the details panel.
  const [inspection, setInspection] = useState<SlotInspection | null>(null);
  const [highlightShared, setHighlightShared] = useState(false);
  // Refs let async callbacks read current values instead of an older render.
  const eventRef = useRef<MeetingEvent | null>(null);
  // Immediate edit/save flags used by async refreshes before React state updates.
  const dirtyRef = useRef(false);
  const savingRef = useRef(false);
  // Local edit counter, separate from the server's response revision below.
  const draftVersion = useRef(0);
  const editingIdRef = useRef<string | null>(null);
  // Repeated save clicks, switching, and deletion can await the same explicit write.
  const savingTask = useRef<Promise<boolean> | null>(null);
  // A 409 conflict requires reloading the saved reply before another save.
  const conflictRef = useRef(false);
  // Server version last read or saved; sent back to prevent overwriting newer edits.
  const responseRevisionRef = useRef(0);
  // A display-zone change must not change the timezone recorded on an existing reply.
  const responseZoneRef = useRef<string | null>(null);
  // Updated immediately by handlers so saving need not wait for React to render.
  const latestDraft = useRef({ name, zone, selected });
  /** Keep async readers aligned with the latest rendered draft and event. */
  useEffect(() => {
    latestDraft.current = { name, zone, selected };
    eventRef.current = event;
  }, [name, zone, selected, event]);

  /**
   * Merge refreshed server data into the editor.
   * Keep unsaved selections within the current schedule; accept another saved
   * version only when this editor has no local edits or save in progress.
   */
  const applyEvent = useCallback((result: MeetingEvent) => {
    const previous = eventRef.current;
    if (previous && previous.schedule_revision !== result.schedule_revision) {
      const value = latestDraft.current;
      // After a schedule change, only these slot starts remain valid selections.
      const allowed = new Set(allSlots(result.windows, slotDuration(result)));
      const person = result.responses.find(
        /** Find the edited reply in the updated event schedule. */
        (r) => r.id === editingIdRef.current,
      );
      const next = dirtyRef.current
        ? new Set(
          [...value.selected].filter(
            /* Retain local selections that still belong to the revised schedule. */
            (stamp) => allowed.has(stamp),
          ),
        )
        : new Set(allSlots(person?.ranges || [], slotDuration(result)));
      setSelected(next);
      latestDraft.current = { ...value, selected: next };
      responseRevisionRef.current = person?.revision ?? 0;
      draftVersion.current++;
      setHighlightShared(false);
      setInspection(null);
    }
    const current = result.responses.find(
      /** Find the latest saved version of the reply open in the editor. */
      (response) => response.id === editingIdRef.current,
    );
    if (
      current &&
      !dirtyRef.current &&
      !savingRef.current &&
      current.revision !== responseRevisionRef.current
    ) {
      const next = new Set(allSlots(current.ranges, slotDuration(result)));
      responseRevisionRef.current = current.revision;
      responseZoneRef.current = current.timezone;
      latestDraft.current = { ...latestDraft.current, name: current.name, selected: next };
      setName(current.name);
      setSelected(next);
      setResponseSession(
        /* Reset grid-local interaction state after loading another saved version. */
        (value) => value + 1,
      );
    }
    eventRef.current = result;
    setEvent(result);
  }, []);

  /**
   * Fetch the event currently identified by the page URL.
   * @returns A promise for fresh event data; API errors reject the request.
   */
  const load = useCallback(() => loadEvent(id), [id]);

  const hasEvent = event !== null && !unavailable;

  /** Stop editing when the event is expired or missing. */
  const expire = useCallback((reason: 'expired' | 'missing' = 'expired') => {
    setUnavailableReason(reason);
    eventRef.current = null;
    dirtyRef.current = false;
    setSaveState('saved');
    setError(EVENT_EXPIRED_MESSAGE);
  }, []);

  useEventSync({ id, event, hasEvent, load, applyEvent, expire, setError, setUnavailableReason });

  /** Reveal the name field before showing the editing reminder. */
  function requestEditing() {
    setEditNotice(true);
    void notifyRequired('Enter your name before editing availability.', nameInput.current);
  }

  /**
   * Update the selected times and leave the changes pending until Save is clicked.
   * @param next - Selected slot start timestamps in milliseconds.
   */
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

  /**
   * Merge edited fields without sending a request.
   * Advancing draftVersion lets a running save detect edits made after it started.
   * @param change - Only the fields that changed; other draft fields are retained.
   */
  function updateDraft(change: Partial<typeof latestDraft.current> = {}) {
    dirtyRef.current = true;
    draftVersion.current++;
    setSaveState('dirty');
    latestDraft.current = { ...latestDraft.current, ...change };
  }

  /** Update the local name and clear its reminder; saving remains an explicit action. */
  function changeName(value: string) {
    if (switchingRef.current) {
      return;
    }
    setName(value);
    setEditNotice(false);
    dismissNotice();
    updateDraft({ name: value });
  }

  /**
   * Change the calendar's display zone without changing selected instants.
   * New replies use this zone; existing replies retain their recorded timezone.
   */
  function changeZone(next: string) {
    if (switchingRef.current) {
      return;
    }
    if (next === zone) {
      return;
    }
    setInspection(null);
    setZone(next);
    latestDraft.current = { ...latestDraft.current, zone: next };
    if (!editingIdRef.current && latestDraft.current.name.trim()) {
      updateDraft({ zone: next });
    }
  }

  /**
   * Save a draft snapshot; edits made during the request remain pending.
   * Create a reply on the first save, then update that reply on later saves.
   * A successful write is followed by an event reload before marking the draft saved.
   * @returns True when saving and reloading finish with no newer local edits. False
   * when saving is blocked, a write/reload fails, or newer edits still need saving;
   * false alone does not mean that the server rejected the write.
   */
  async function persist(): Promise<boolean> {
    if (!eventRef.current || unavailable || switchingRef.current || conflictRef.current) {
      return false;
    }
    const value = latestDraft.current;
    if (!value.name.trim()) {
      setEditNotice(true);
      void notifyRequired('Enter your name before editing availability.', nameInput.current);
      return false;
    }
    savingRef.current = true;
    setIsSaving(true);
    // Compare after the request: a successful write may still leave newer edits.
    const savedDraftVersion = draftVersion.current;
    setSaveState('saving');
    setError('');
    try {
      const responseId = editingIdRef.current;
      // Convert the selected slot set into JSON ranges for the response endpoint.
      const payload = {
        name: value.name,
        timezone: responseZoneRef.current ?? value.zone,
        ranges: slotsToRanges(value.selected, slotDuration(eventRef.current)),
        // Reply and schedule revisions protect against two kinds of stale writes.
        revision: responseRevisionRef.current,
        schedule_revision: eventRef.current.schedule_revision,
      };
      const result = await saveEventResponse(id, responseId, payload);
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
  }

  /**
   * Reuse a running save instead of sending a duplicate request.
   * @returns A promise that resolves true only when the draft is fully saved.
   * False also covers blocked saves, reload failures, and newer edits left pending.
   */
  function save(): Promise<boolean> {
    if (!savingTask.current) {
      savingTask.current = persist().finally(
        /* Release this explicit write before another save can start. */
        () => {
          savingTask.current = null;
        },
      );
    }
    return savingTask.current;
  }

  /**
   * Load the chosen reply only after local edits have been saved with the button.
   * Wait for an already-sent save without starting one. Reselecting the same
   * conflicted reply skips saving and replaces its local draft with the server copy.
   * @param responseId - Saved reply to view or edit.
   */
  async function editResponse(responseId: string) {
    if (switchingRef.current) {
      return;
    }
    switchingRef.current = true;
    setSwitching(true);
    try {
      // Reselecting the same person is the explicit way to resolve a stale revision.
      const reloadConflict = conflictRef.current && responseId === editingIdRef.current;
      if (savingTask.current) {
        await savingTask.current;
      }
      if (dirtyRef.current && !reloadConflict) {
        notify('Save your changes before switching responses.', nameInput.current);
        return;
      }
      const result = await load();
      const person = result.responses.find(
        /** Find the saved reply the user selected for editing. */
        (response) => response.id === responseId,
      );
      if (!person) {
        throw new Error('This response could not be found. Refresh the group and try again.');
      }
      applyEvent(result);
      const next = {
        name: person.name,
        zone: latestDraft.current.zone,
        selected: new Set(allSlots(person.ranges, slotDuration(result))),
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
      setResponseSession(
        /* Start a fresh grid session for the newly loaded reply. */
        (value) => value + 1,
      );
      nameInput.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    } catch (error) {
      if (error instanceof ApiError && (error.status === 410 || error.status === 404)) {
        expire(error.status === 404 ? 'missing' : 'expired');
      } else {
        setError(error instanceof Error ? error.message : 'Could not load this event.');
      }
    } finally {
      switchingRef.current = false;
      setSwitching(false);
    }
  }

  /** Reset the editor only when the deleted reply is the one being edited. */
  function clearDeletedDraft(responseId: string) {
    if (editingIdRef.current !== responseId) {
      return;
    }
    editingIdRef.current = null;
    responseRevisionRef.current = 0;
    responseZoneRef.current = null;
    latestDraft.current = { name: '', zone: latestDraft.current.zone, selected: new Set<number>() };
    draftVersion.current++;
    dirtyRef.current = false;
    conflictRef.current = false;
    setEditingId(null);
    setName('');
    setSelected(new Set());
    setSaveState('saved');
    setEditNotice(false);
    setResponseSession(
      /* Reset the grid after the edited reply is deleted. */
      (value) => value + 1,
    );
  }

  /** Remove the confirmed reply locally; a later refresh restores computed shared periods. */
  function applyRemovedResponse(responseId: string, fresh?: MeetingEvent) {
    clearDeletedDraft(responseId);
    const previous = eventRef.current!;
    const responses = previous.responses.filter(
      /** Remove the deleted reply from the local event results. */
      (person) => person.id !== responseId,
    );
    applyEvent(
      fresh ?? { ...previous, responses, response_count: responses.length, candidates: [] },
    );
    setHighlightShared(false);
    setError('');
  }

  /**
   * Wait for an already-sent save, then delete only the confirmed reply.
   * Never submit pending edits; drafts for other replies remain in the editor.
   * A missing reply counts as removed only after fresh event data confirms it.
   * @returns True when removal or prior absence is confirmed, even if refreshing
   * the results later fails. False when deletion is blocked or not confirmed,
   * including version conflicts or an unavailable event.
   */
  async function deleteResponse(response: ResponseData): Promise<boolean> {
    if (switchingRef.current || !eventRef.current) {
      return false;
    }
    switchingRef.current = true;
    setSwitching(true);
    // "own" means open in this editor, not authenticated ownership of the reply.
    const own = editingIdRef.current === response.id;
    const pending = savingTask.current;
    const anchor = document.getElementById('delete-response-' + response.id);
    // Distinguish a failed delete from a successful delete followed by a failed refresh.
    let removed = false;
    try {
      if (pending) {
        await pending;
      }
      // An awaited save may have advanced the reply beyond the revision in the popup.
      const revision = own && pending ? responseRevisionRef.current : response.revision;
      const fresh = await removeEventResponse(
        id,
        { id: response.id, revision },
        eventRef.current!.schedule_revision,
        load,
      );
      removed = true;
      applyRemovedResponse(response.id, fresh);
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
    canSave: dirtyRef.current && !isSaving && !switching && !conflictRef.current && !!name.trim(),
    changeName,
    dismissNotice,
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
