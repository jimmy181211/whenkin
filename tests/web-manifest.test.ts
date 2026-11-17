import {
  describe,
  expect,
  it,
} from 'vitest';
import {
  documentWithManifest,
  webManifest,
} from '../App/backend/web-manifest';
import { shortcutManifestHref } from '../App/shared/shortcut-path';

const event = '/e/855e5518-3b5a-49cb-b906-69bbd7bac603';
describe('installable website metadata', () => {
  it('provides a standalone launcher and the Whenkin icon for desktop and Android', () => {
    const manifest = webManifest(undefined);
    expect(manifest.id).toBe('/');
    expect(manifest.start_url).toBe('/');
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons).toEqual([
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
    ]);
  });
  it('preserves the event destination and gives it a stable identity independent of slash or case', () => {
    const manifest = webManifest(event.toUpperCase() + '/');
    expect(manifest.start_url).toBe(event);
    expect(
      webManifest('/e/' + event.slice(3).toUpperCase() + '/').start_url,
    ).toBe(event);
    expect(webManifest(event).id).toBe(event);
    expect(webManifest(event + '/').start_url).toBe(event);
  });
  it.each([
    'https://other.example/',
    '//other.example/',
    '/api/events',
    event + '?token=secret',
    event + '#response',
    '<script>',
    [
      '/',
      event,
    ],
    { page: event },
  ])('rejects unrecognized launch targets: %s', (value) => {
    expect(webManifest(value).start_url).toBe('/');
    expect(webManifest(value).id).toBe('/');
  });
  it('points the initial HTML to the event manifest before the browser considers installation', () => {
    const html = '<link rel="manifest" href="/site.webmanifest" />';
    const href = shortcutManifestHref(event);
    expect(documentWithManifest(html, event)).toContain(`href="${href}"`);
    expect(href).toBe('/site.webmanifest?page=' + encodeURIComponent(event));
    expect(documentWithManifest(html, '/')).toBe(html);
  });
});
