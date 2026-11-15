import { useEffect } from 'react';
import { pageRoute } from '../shared/routes';
import { ArrowRight } from 'lucide-react';
import SiteLayout from './components/SiteLayout';
import PageLink from './components/PageLink';
import LegalPage from './pages/LegalPage';
import { useLanguage } from './components/LanguageSelector';
import CreateEventPage from './pages/CreateEventPage';
import EventPage from './pages/EventPage';
import HowItWorksPage from './pages/HowItWorksPage';
import { t } from './i18n/index';
import { legalDocuments } from './content/legal';
export default function App() {
    const language = useLanguage();
    const path = typeof window === 'undefined' ? '/' : window.location.pathname;
    const route = pageRoute(path);
    const eventId = route.kind === 'event' ? route.id : null;
    const legalKind = route.kind === 'terms' || route.kind === 'privacy' ? route.kind : null;
    useEffect(() => {
        document.documentElement.lang = language === 'zh' ? 'zh-CN' : language;
        document.title = legalKind ? `${legalDocuments[language][legalKind].title} — Whenkin` : `Whenkin — ${t("Find Your Shared Time.")}`;
    }, [language, legalKind]);
    return <SiteLayout showNewEvent={!!eventId}>
      {eventId ? <EventPage key={eventId} id={eventId}/> : route.kind === 'home' ? <CreateEventPage /> : route.kind === 'guide' ? <HowItWorksPage /> : legalKind ? <LegalPage kind={legalKind}/> : <main className="error-page">
        <h1>{t("That Page Is a Little Off-Grid.")}</h1>
        <PageLink className="button primary" href="/">{t("Create an Event")} <ArrowRight size={17}/></PageLink>
      </main>}
    </SiteLayout>;
}
