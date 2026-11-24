/** Checks official-help rendering without changing installation or copy behavior. */
import {
  afterEach,
  expect,
  it,
  vi,
} from 'vitest';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ShortcutDialog from '../App/frontend/components/ShortcutDialog';
import { langService } from '../App/frontend/i18n/language';
import {
  shortcutCopy,
  shortcutTutorials,
} from '../App/frontend/utils/shortcut-instructions';

/** Render the portal inline so its contents can be checked without a browser DOM. */
vi.mock('react-dom', () => ({ createPortal: (children: ReactNode) => children }));

/** Restore the shared preference and globals after each rendering fixture. */
afterEach(() => {
  langService.setLanguage('en');
  vi.unstubAllGlobals();
});

for (const language of [
  'en',
  'zh',
] as const) {
  for (const [device, agent] of [
    [
      'ios',
      'iPhone',
    ],
    [
      'android',
      'Android Chrome/140',
    ],
    [
      'edge',
      'Windows Chrome/140 Edg/140',
    ],
    [
      'chrome',
      'Windows Chrome/140',
    ],
    [
      'windows',
      'Windows Firefox/140',
    ],
    [
      'mac',
      'Macintosh Safari/605',
    ],
  ] as const) {
    /** Each detected device links to official help and keeps the existing page-copy controls. */
    it(`shows ${device} official help in ${language} without manual steps`, () => {
      vi.stubGlobal('navigator', {
        userAgent: agent,
        maxTouchPoints: 0,
      });
      vi.stubGlobal('window', {
        location: { href: 'https://whenkin.example/e/fixture?token=x#reply' },
      });
      vi.stubGlobal('document', { body: {} });
      langService.setLanguage(language);
      const copy = shortcutCopy[language];
      const html = renderToStaticMarkup(<ShortcutDialog onClose={() => {}} />);
      expect(html).toContain(`href="${shortcutTutorials[device]}"`);
      expect(html).toContain('target="_blank" rel="noopener noreferrer"');
      expect(html).not.toMatch(/<p(?:\s|>)/);
      expect(html).not.toContain('aria-describedby');
      expect(html).toContain(copy.copy);
      expect(html).toContain('value="https://whenkin.example/e/fixture"');
      expect(html).not.toContain('shortcut-steps');
      expect(html).not.toContain('<ol');
    });
  }
}

/** Keep outbound tutorial destinations restricted to browser vendors. */
it('uses HTTPS vendor tutorials for every selectable category', () => {
  for (const link of Object.values(shortcutTutorials)) {
    const url = new URL(link);
    expect(url.protocol).toBe('https:');
    expect([
      'support.apple.com',
      'support.google.com',
      'support.microsoft.com',
    ]).toContain(
      url.hostname,
    );
  }
});
