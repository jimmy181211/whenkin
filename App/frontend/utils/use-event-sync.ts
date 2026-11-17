/** Loads an event, refreshes visible pages, and observes link expiry. */
import { useEffect } from 'react';
import { loadEvent } from '../api/load-event';
import { ApiError } from '../api/client';
import type { MeetingEvent } from '../../shared/types';

const EVENT_REFRESH_INTERVAL_MS = 10_000;
const MAX_BROWSER_TIMEOUT_MS = 2_147_483_647;

type UnavailableReason = 'expired' | 'missing';
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
  useEffect(() => {
    let alive = true;
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
          setError(
            e instanceof Error ? e.message : 'Could not load this event.',
          );
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [
    id,
    load,
    applyEvent,
  ]);
  useEffect(() => {
    if (!event?.expires_at) {
      return;
    }
    let timer: ReturnType<typeof setTimeout>;

    const checkExpiry = () => {
      const remaining = Date.parse(event.expires_at!) - Date.now();
      if (remaining <= 0) {
        expire();
      }
      // A calendar year can exceed the browser's maximum timer length.
      else {
        timer = setTimeout(
          checkExpiry,
          Math.min(remaining, MAX_BROWSER_TIMEOUT_MS),
        );
      }
    };

    checkExpiry();
    return () => clearTimeout(timer);
  }, [
    event?.expires_at,
    expire,
  ]);
  useEffect(() => {
    if (!hasEvent) {
      return;
    }

    const refreshError = (error: unknown) => {
      if (
        error instanceof ApiError &&
        (error.status === 410 || error.status === 404)
      ) {
        expire(error.status === 404 ? 'missing' : 'expired');
      }
    };

    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        load().then(applyEvent).catch(refreshError);
      }
    }, EVENT_REFRESH_INTERVAL_MS);

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
  }, [
    hasEvent,
    load,
    applyEvent,
    expire,
  ]);
}
