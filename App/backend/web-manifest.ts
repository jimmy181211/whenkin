import {
  shortcutManifestHref,
  shortcutPath,
} from '../shared/shortcut-path.js';

/**
 * Build install metadata so a shortcut opens its event page with Whenkin's icons.
 * @param page - Requested local page path; unsupported paths fall back to home.
 * @returns Manifest data with safe launch paths, display settings, and Whenkin icons.
 */
export function webManifest(page: unknown) {
  const path = shortcutPath(page);
  return {
    name: 'Whenkin',
    short_name: 'Whenkin',
    id: path,
    start_url: path,
    scope: '/',
    display: 'standalone',
    prefer_related_applications: false,
    theme_color: '#18574e',
    background_color: '#f8f9f4',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}

/**
 * Point the shared HTML document at the manifest for the currently viewed page.
 * @returns HTML with its manifest link targeting the safe shortcut launch path.
 */
export function documentWithManifest(html: string, pathname: string) {
  return html.replace('href="/site.webmanifest"', `href="${shortcutManifestHref(pathname)}"`);
}
