/** Selects the page for the current URL and sets its localized document title. */
import { useEffect } from 'react';
import { pageRoute } from '../shared/routes';
import { ArrowRight } from 'lucide-react';
import SiteLayout from './components/SiteLayout';
import LegalPage from './pages/LegalPage';
import CreateEventPage from './pages/CreateEventPage';
import EventPage from './pages/EventPage';
import HowItWorksPage from './pages/HowItWorksPage';
import {
  langService,
  useLanguage,
} from './i18n/language';
import { legalDocuments } from './content/legal';

/**
 * Application root that selects the current page and its localized document
 * title.
 * @returns The shared site layout containing the matched page, or the
 * unknown-page message.
 */
export default function App() {
  const language = useLanguage();
  const path = typeof window === 'undefined' ? '/' : window.location.pathname;
  const route = pageRoute(path);
  const eventId = route.kind === 'event' ? route.id : null;
  const legalKind = route.kind === 'terms' || route.kind === 'privacy' ? route.kind : null;
  /**
   * Update the document language and title when the selected language or
   * legal page changes.
   */
  useEffect(() => {
    document.documentElement.lang = langService.getLocale();
    document.title = legalKind
      ? `${legalDocuments[language][legalKind].title} — Whenkin`
      : `Whenkin — ${langService.t('Find Your Shared Time.')}`;
  }, [
    language,
    legalKind,
  ]);
  return (
    <SiteLayout
      showNewEvent={!!eventId}
      showFooterTagline={route.kind !== 'home'}
      showEventExpiry={route.kind === 'home' || !!eventId}
    >
      {eventId ? (
        <EventPage key={eventId} id={eventId} />
      ) : route.kind === 'home' ? (
        <CreateEventPage />
      ) : route.kind === 'guide' ? (
        <HowItWorksPage />
      ) : legalKind ? (
        <LegalPage kind={legalKind} />
      ) : (
        <main className="error-page">
          <h1>{langService.t('That Page Is a Little Off-Grid.')}</h1>
          <a className="button primary" href="/">
            {langService.t('Create an Event')} <ArrowRight size={17} />
          </a>
        </main>
      )}
    </SiteLayout>
  );
}
