export type PageRoute =
  | { kind: 'home' | 'guide' | 'terms' | 'privacy' | 'not-found' }
  | { kind: 'event'; id: string };

// Shared route recognition keeps direct links and refreshes consistent.
export function pageRoute(pathname: string): PageRoute {
  if (pathname === '/') return { kind: 'home' };
  if (pathname === '/how-it-works') return { kind: 'guide' };
  if (pathname === '/terms' || pathname === '/privacy') return { kind: pathname.slice(1) as 'terms' | 'privacy' };
  const event = pathname.match(/^\/e\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/?$/i);
  return event ? { kind: 'event', id: event[1] } : { kind: 'not-found' };
}
