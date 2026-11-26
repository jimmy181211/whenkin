/** Connects responsive React content to a browser media query. */
import { useCallback, useMemo, useSyncExternalStore } from 'react';

/**
 * Observe one media query without attaching a listener to every window resize.
 * @param fallback - Initial match for server rendering or browsers without matchMedia.
 * @returns Whether it matches, using fallback when no browser query is available.
 */
export function useMediaQuery(query: string, fallback = false) {
  /** Keep the same browser query object until the requested condition changes. */
  const media = useMemo(
    () =>
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia(query)
        : null,
    [query],
  );

  /** Subscribe to breakpoint crossings; React removes the listener on cleanup. */
  const subscribe = useCallback(
    (listener: () => void) => {
      media?.addEventListener('change', listener);
      /** Stop observing this query when the subscriber leaves. */
      return () => media?.removeEventListener('change', listener);
    },
    [media],
  );

  /** Read the current match without creating a new query or changing the page. */
  const snapshot = useCallback(() => media?.matches ?? fallback, [media, fallback]);

  return useSyncExternalStore(
    subscribe,
    snapshot,
    /** Keep server-rendered labels deterministic before the browser takes over. */
    () => fallback,
  );
}
