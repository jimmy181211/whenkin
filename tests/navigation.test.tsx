/** Checks the simplified navigation and empty results without changing event data. */
import { renderToStaticMarkup } from 'react-dom/server';
import {
  afterEach,
  expect,
  it,
} from 'vitest';
import SiteLayout from '../App/frontend/components/SiteLayout';
import AvailabilityGridTools from '../App/frontend/components/AvailabilityGridTools';
import EventResults from '../App/frontend/components/event/EventResults';
import {
  langService,
  languageOptions,
} from '../App/frontend/i18n/language';
import type { MeetingEvent } from '../App/shared/types';

/** Restore the default interface language for the next test file. */
afterEach(() => langService.setLanguage('en'));

const emptyEvent: MeetingEvent = {
  id: 'empty',
  title: 'Event',
  description: '',
  organizer_name: '',
  timezone: 'UTC',
  windows: [],
  responses: [],
};

/** Header help remains reachable without a duplicate footer slogan. */
it('keeps help and language access on create pages without an unnecessary menu', () => {
  const html = renderToStaticMarkup(<SiteLayout showFooterTagline={false}>Form</SiteLayout>);
  expect(html).toContain('href="/how-it-works"');
  expect(html).toContain('<span class="sr-only">Language</span><select');
  expect(html).not.toContain('header-menu-toggle');
  expect(html).not.toContain('Find Your Shared Time.');
  expect(html).toContain('Privacy Policy');
});

/** Mobile event navigation exposes secondary actions through one labeled trigger. */
it('provides a labeled event menu while retaining the visible sharing target', () => {
  const html = renderToStaticMarkup(<SiteLayout showNewEvent>Event</SiteLayout>);
  expect(html).toContain('header-share-slot');
  expect(html).toMatch(/aria-label="Menu" aria-expanded="false"/);
  expect(html).toContain('header-guide-slot');
  expect(html).toContain('New Event');
  expect(html).toContain('<span class="sr-only">Language</span><select');
});

/** Zero shared ranges use one localized status instead of an unusable action. */
it('keeps an empty shared-time section compact in all supported languages', () => {
  for (const { value } of languageOptions) {
    langService.setLanguage(value);
    const html = renderToStaticMarkup(
      <EventResults
        event={emptyEvent}
        highlighted={false}
        suggestions={[]}
        onEditResponse={
          /* Leave the fixture's reply selection unchanged. */
          () => {}
        }
        onDeleteResponse={
          /* Avoid deleting any fixture data. */
          async () => false
        }
        onToggleHighlight={
          /* Do not change fixture highlights during rendering. */
          () => {}
        }
      />,
    );
    expect(html).toContain(langService.t('No shared free time yet.'));
    expect(html).not.toContain('highlight-shared-times');
    expect(html).not.toContain(langService.t('{count} shared time periods', { count: 0 }));
    expect(html).toContain('role="status"');
  }
});

/** Undo stays visible while advanced zoom controls start inside a closed disclosure. */
it('keeps undo accessible and places row-height controls under display options', () => {
  const html = renderToStaticMarkup(
    <AvailabilityGridTools
      view="personal"
      editing
      undos={1}
      zoom={1}
      responderCount={0}
      onUndo={
        /* Keep the render fixture's history unchanged. */
        () => {}
      }
      onZoomChange={
        /* Keep the render fixture at its initial row height. */
        () => {}
      }
      paging={{
        page: 0,
        firstColumn: 0,
        daysPerPage: 3,
        totalDays: 1,
        onPageChange:
          /* Keep the fixture on its only date page. */
          () => {},
      }}
    />,
  );
  expect(html).toContain('aria-label="Undo selection"');
  expect(html).toContain('aria-label="Display options"');
  expect(html).not.toContain('aria-label="Smaller time slots"');
  expect(html).not.toContain('aria-label="Larger time slots"');
});
