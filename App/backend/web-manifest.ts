import { shortcutManifestHref, shortcutPath } from '../shared/shortcut-path.js';

export function webManifest(page: unknown) {
  const path = shortcutPath(page);
  return {
    name: 'Whenkin', short_name: 'Whenkin',
    id: path, start_url: path, scope: '/', display: 'standalone',
    prefer_related_applications: false,
    theme_color: '#18574e', background_color: '#f8f9f4',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
}

export function documentWithManifest(html: string, pathname: string) {
  return html.replace('href="/site.webmanifest"', `href="${shortcutManifestHref(pathname)}"`);
}
