import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import SiteLayout from './components/SiteLayout';
import PageLink from './components/PageLink';
import LegalPage from './components/LegalPage';
import { useLanguage } from './components/LanguageSelector';
import CreateEventPage from './screens/CreateEventPage';
import EventPage from './screens/EventPage';
import HowItWorksPage from './screens/HowItWorksPage';
import { t } from './lib/i18n';
import { legalDocuments } from './lib/legal';
export default function App() {
    const language = useLanguage();
    const path = usePathname() || '/';
    const match = path.match(/^\/e\/([0-9a-f-]{36})\/?$/i);
    const legalKind = path.replace(/\/$/, '') === '/terms' ? 'terms' : path.replace(/\/$/, '') === '/privacy' ? 'privacy' : null;
    useEffect(() => {
        document.documentElement.lang = language === 'zh' ? 'zh-CN' : language;
        document.title = legalKind ? `${legalDocuments[language][legalKind].title} — Whenkin` : `Whenkin — ${t("Find Your Shared Time.")}`;
    }, [language, legalKind]);
    return <SiteLayout>
      {match ? <EventPage id={match[1]}/> : path === '/' ? <CreateEventPage /> : path === '/how-it-works' ? <HowItWorksPage /> : legalKind ? <LegalPage kind={legalKind}/> : <main className="error-page">
        <h1>{t("That Page Is a Little Off-Grid.")}</h1>
        <PageLink className="button primary" href="/">{t("Create an Event")} <ArrowRight size={17}/></PageLink>
      </main>}
    </SiteLayout>;
}
