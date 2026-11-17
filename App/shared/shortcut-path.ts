import { pageRoute } from './routes.js';

// Only known page paths can become launch URLs; never keep tokens or external URLs.
export function shortcutPath(value: unknown): string {
  if (typeof value !== 'string') {
    return '/';
  }
  const route = pageRoute(value);
  if (route.kind === 'event') {
    return '/e/' + route.id.toLowerCase();
  }
  if (route.kind === 'not-found') {
    return '/';
  }
  return value.replace(/\/$/, '') || '/';
}

export function shortcutManifestHref(path: string): string {
  const page = shortcutPath(path);
  return (
    '/site.webmanifest' +
    (page === '/' ? '' : '?page=' + encodeURIComponent(page))
  );
}
