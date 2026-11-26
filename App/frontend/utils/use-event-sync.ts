/** Loads an event, refreshes visible pages, and observes link expiry. */
import { useEffect } from 'react';
import { loadEvent } from '../api/load-event';
import { ApiError } from '../api/client';
import type { MeetingEvent } from '../../shared/types';

const EVENT_REFRESH_INTERVAL_MS = 10_000;
const MAX_BROWSER_TIMEOUT_MS = 2_147_483_647;

/** Distinguishes an expired event from a link with no matching record. */
type UnavailableReason = 'expired' | 'missing';
/**
 * Event data and editor callbacks needed for loading, refresh, and expiry
 * checks.
 */
type EventSyncOptions = {
  id: string;
  event: MeetingEvent | null;
  hasEvent: boolean;
  load: () => Promise<MeetingEvent>;
  applyEvent: (event: MeetingEvent) => void;
  expire: (reason?: UnavailableReason) => void;
  setError: (message: string) => void;
  setUnavailableReason: (reason: UnavailableReason) => void;
};

/**
 * React Hook that loads an event and refreshes visible pages or returning tabs.
 * Expiry is checked separately so an open tab stops editing at its deadline.
 * Temporary background refresh errors keep the last data; missing/expired events
 * switch the editor to its unavailable state. Cleanup ignores late initial loads
 * and removes timers and listeners without aborting an already-sent request.
 * @param applyEvent - Merge fresh data while preserving the editor's local draft.
 */
export function useEventSync({
  id,
  event,
  hasEvent,
  load,
  applyEvent,
  expire,
  setError,
  setUnavailableReason,
}: EventSyncOptions) {
  /**
   * Load the event for this id and ignore responses arriving after the
   * effect is cleaned up.
   */
  useEffect(() => {
    // A reply may arrive after navigation; ignore it once this effect is cleaned up.
    let alive = true;
    // Load this event and distinguish missing, expired, and temporary failures.
    (async () => {
      try {
        const result = await loadEvent(id);
        if (!alive) {
          return;
        }
        applyEvent(result);
      } catch (e) {
        if (alive) {
          if (e instanceof ApiError && (e.status === 410 || e.status === 404)) {
            setUnavailableReason(e.status === 410 ? 'expired' : 'missing');
          }
          setError(e instanceof Error ? e.message : 'Could not load this event.');
        }
      }
    })();
    // Ignore a late initial-load response after leaving this event.
    return () => {
      alive = false;
    };
  }, [id, load, applyEvent]);
  /** Watch the event deadline and cancel its timer when the deadline changes. */
  useEffect(() => {
    if (!event?.expires_at) {
      return;
    }
    let timer: ReturnType<typeof setTimeout>;

    /** Recheck the deadline in chunks that fit the browser's timer limit. */
    const checkExpiry = () => {
      // Remaining milliseconds, not the configured retention duration in months.
      const remaining = Date.parse(event.expires_at!) - Date.now();
      if (remaining <= 0) {
        expire();
      }
      // A calendar year can exceed the browser's maximum timer length.
      else {
        timer = setTimeout(checkExpiry, Math.min(remaining, MAX_BROWSER_TIMEOUT_MS));
      }
    };

    checkExpiry();
    // Cancel the old expiry check when its effect is cleaned up.
    return () => clearTimeout(timer);
  }, [event?.expires_at, expire]);
  /**
   * Refresh visible event pages on a timer and when the user returns to
   * them.
   */
  useEffect(() => {
    if (!hasEvent) {
      return;
    }

    /** Close unavailable events; transient refresh failures wait for a retry. */
    const refreshError = (error: unknown) => {
      if (error instanceof ApiError && (error.status === 410 || error.status === 404)) {
        expire(error.status === 404 ? 'missing' : 'expired');
      }
    };

    const timer = setInterval(
      /* Read fresh event data every ten seconds while the page is visible. */
      () => {
        if (document.visibilityState === 'visible') {
          load().then(applyEvent).catch(refreshError);
        }
      },
      EVENT_REFRESH_INTERVAL_MS,
    );

    /** Refresh immediately after focus or visibility returns to the page. */
    const refresh = () => {
      if (document.visibilityState === 'visible') {
        load().then(applyEvent).catch(refreshError);
      }
    };

    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    // Stop polling and remove focus/visibility listeners when synchronization stops.
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [hasEvent, load, applyEvent, expire]);
}
