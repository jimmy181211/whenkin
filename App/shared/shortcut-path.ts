import { pageRoute } from './routes.js';

/**
 * Allow only known local page paths as shortcut launch targets.
 * Unsupported input, including external URLs or paths with query strings, uses home.
 * @returns A supported local path, with event ids normalized to lowercase.
 */
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

/**
 * Build the manifest URL for a safe local launch target.
 * @returns A relative manifest URL; the home-page target needs no page query.
 */
export function shortcutManifestHref(path: string): string {
  const page = shortcutPath(path);
  return '/site.webmanifest' + (page === '/' ? '' : '?page=' + encodeURIComponent(page));
}
