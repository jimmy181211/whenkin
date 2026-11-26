import { afterEach, describe, expect, it } from 'vitest';
import EventUnavailablePage from '../App/frontend/pages/EventUnavailablePage';
import { createLanguageFixture } from './helpers/language';
const languageFixture = createLanguageFixture();
const renderToStaticMarkup = languageFixture.render;

afterEach(
  /* Restore English after unavailable-event page checks. */
  () => languageFixture.setLanguage('en'),
);
/** Group the expired and missing event pages checks. */
describe('expired and missing event pages', () => {
  /**
   * Check both expired and missing link explanations in every supported
   * language.
   */
  it.each(['expired', 'missing'] as const)(
    'explains %s links and provides policy and recovery links in every language',

    (reason) => {
      for (const language of ['en', 'zh'] as const) {
        languageFixture.setLanguage(language);
        const html = renderToStaticMarkup(<EventUnavailablePage reason={reason} />);
        expect(html).toContain(
          languageFixture.t(
            reason === 'expired'
              ? 'This event link has expired.'
              : 'This event has expired or could not be found.',
          ),
        );
        expect(html).toContain(languageFixture.t('Link expiry follows the retention policy.'));
        expect(html).toContain(
          languageFixture.t('Expired events and their responses may be removed.'),
        );
        for (const path of ['/', '/terms', '/privacy']) {
          expect(html).toContain(`href="${path}"`);
        }
        expect(html).not.toContain('404');
        expect(
          html.includes(
            languageFixture.t('Check the link with your organizer, or create a new event.'),
          ),
        ).toBe(reason === 'missing');
      }
    },
  );
});
