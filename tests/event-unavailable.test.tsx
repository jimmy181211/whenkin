import { renderToStaticMarkup } from 'react-dom/server';
import {
  afterEach,
  describe,
  expect,
  it,
} from 'vitest';
import EventUnavailablePage from '../App/frontend/pages/EventUnavailablePage';
import {
  setLanguage,
  t,
} from '../App/frontend/i18n/index';

afterEach(() => setLanguage('en'));
describe('expired and missing event pages', () => {
  it.each([
    'expired',
    'missing',
  ] as const)(
    'explains %s links and provides policy and recovery links in every language',
    (reason) => {
      for (const language of [
        'en',
        'zh',
        'es',
        'pt',
        'de',
      ] as const) {
        setLanguage(language);
        const html = renderToStaticMarkup(
          <EventUnavailablePage reason={reason} />,
        );
        expect(html).toContain(
          t(
            reason === 'expired'
              ? 'This event link has expired.'
              : 'This event has expired or could not be found.',
          ),
        );
        expect(html).toContain(t('Link expiry follows the retention policy.'));
        expect(html).toContain(
          t('Expired events and their responses may be removed.'),
        );
        for (const path of [
          '/',
          '/terms',
          '/privacy',
        ]) {
          expect(html).toContain(`href="${path}"`);
        }
        expect(html).not.toContain('404');
        expect(
          html.includes(
            t('Check the link with your organizer, or create a new event.'),
          ),
        ).toBe(reason === 'missing');
      }
    },
  );
});
