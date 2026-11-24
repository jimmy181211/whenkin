import { renderToStaticMarkup } from 'react-dom/server';
import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import ParticipantName from '../App/frontend/components/ParticipantName';
import AvailabilityGrid from '../App/frontend/components/AvailabilityGrid';
import { langService } from '../App/frontend/i18n/language';
import type { MeetingEvent } from '../App/shared/types';

afterEach(
  /* Restore the language and browser globals after name-field tests. */
  () => {
    langService.setLanguage('en');
    vi.unstubAllGlobals();
  },
);
/** Group the name before availability editing checks. */
describe('name before availability editing', () => {
  /**
   * Keeps the name field quiet until an edit attempt needs an accessible
   * notice.
   */
  it('keeps the name field quiet until an edit attempt needs an accessible notice', () => {
    for (const language of [
      'en',
      'zh',
    ] as const) {
      langService.setLanguage(language);
      const html = renderToStaticMarkup(
        <ParticipantName
          name=""
          onChange={
            /* Keep the first name-field fixture unchanged while inspecting its markup. */
            () => {}
          }
          editNotice={false}
        />,
      );
      expect(html).not.toContain('name-help');
      expect(html).not.toContain('aria-describedby');
      const noticed = renderToStaticMarkup(
        <ParticipantName
          name="  "
          onChange={
            /* Keep the second name-field fixture unchanged while inspecting its markup. */
            () => {}
          }
          editNotice
        />,
      );
      expect(noticed).toContain('aria-invalid="true"');
      expect(noticed).not.toContain(langService.t('Enter your name before editing availability.'));
    }
  });
  /** Does not show the blank-name hint once a name is supplied. */
  it('does not show the blank-name hint once a name is supplied', () => {
    const html = renderToStaticMarkup(
      <ParticipantName
        name="Sam"
        onChange={
          /* Leave the translated name value unchanged in this render-only test. */
          () => {}
        }
        editNotice={false}
      />,
    );
    expect(html).not.toContain('name-help');
  });
  /**
   * Locks editing before a name while keeping cells able to report a
   * blocked attempt on desktop and mobile.
   */
  it(
    'locks editing before a name while keeping cells able to report a ' +
      'blocked attempt on desktop and mobile',
    () => {
      const event: MeetingEvent = {
        id: 'test',
        title: 'Event',
        description: '',
        organizer_name: '',
        timezone: 'UTC',
        windows: [
          {
            start: '2027-01-15T09:00:00Z',
            end: '2027-01-15T10:00:00Z',
          },
        ],
        responses: [],
      };
      for (const width of [
        390,
        1280,
      ]) {
        vi.stubGlobal('window', { innerWidth: width });
        const html = renderToStaticMarkup(
          <AvailabilityGrid
            event={event}
            zone="UTC"
            selected={new Set()}
            canEdit={false}
            onChange={
              /* Keep the blocked calendar's selection unchanged. */
              () => {}
            }
            onEditBlocked={
              /* Provide the blocked-edit hook without showing a real reminder. */
              () => {}
            }
          />,
        );
        expect(html).not.toContain('done-mode');
        expect(html).toContain('Your Availability');
        expect(html).toContain('Group Availability');

        expect(html).not.toMatch(/>.*? Done<\/button>|>.*? Edit<\/button>/);
        expect(html).toMatch(/aria-disabled="true" data-stamp/);
        expect(html).not.toContain('Start on a blank time');
        expect(html).not.toMatch(/disabled="" aria-disabled="true" data-stamp/);
      }
    },
  );
});
