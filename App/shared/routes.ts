/**
 * Recognized page kinds, including the event id when the URL identifies an
 * event.
 */
export type PageRoute =
  | { kind: 'home' | 'guide' | 'terms' | 'privacy' | 'not-found' }
  | {
    kind: 'event';
    id: string;
  };

/**
 * Match a page path for server response status and React page selection.
 * @returns The recognized page kind and event id when present, or not-found.
 */
export function pageRoute(pathname: string): PageRoute {
  pathname = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname;
  if (pathname === '/') {
    return { kind: 'home' };
  }
  if (pathname === '/how-it-works') {
    return { kind: 'guide' };
  }
  if (pathname === '/terms' || pathname === '/privacy') {
    return { kind: pathname.slice(1) as 'terms' | 'privacy' };
  }
  const event = pathname.match(
    /^\/e\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/?$/i,
  );
  return event
    ? {
      kind: 'event',
      id: event[1],
    }
    : { kind: 'not-found' };
}
