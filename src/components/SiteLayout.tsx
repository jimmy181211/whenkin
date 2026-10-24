import type { ReactNode } from 'react';
import Image from 'next/image';
import { Plus } from 'lucide-react';
import LanguageSelector from './LanguageSelector';
import PageLink from './PageLink';
import { BRAND } from '../brand';
import { t } from '../lib/i18n';
import { LEGAL } from '../lib/legal';
export default function SiteLayout({ children, showNewEvent = false }: {
    children: ReactNode;
    showNewEvent?: boolean;
}) {
    return <><Header showNewEvent={showNewEvent}/>{children}<Footer /></>;
}
function Header({ showNewEvent }: { showNewEvent: boolean }) {
    return <header className="site-header">
      <PageLink className="brand" href="/" aria-label={t('Whenkin home')}>
        <Image src="/favicon.svg" alt="" width={40} height={40} unoptimized/>
        <span>{BRAND.name.toLowerCase()}</span>
      </PageLink>
      <nav aria-label={t('Main navigation')}>
        {showNewEvent && <PageLink className="button secondary compact" href="/"><Plus size={16}/>{t('New Event')}</PageLink>}
        <LanguageSelector />
      </nav>
    </header>;
}
function Footer() {
    return <footer className="site-footer">
      <span>{t(BRAND.tagline)}</span>
      <nav aria-label={t('Legal Information')}>
        <PageLink href="/terms">{t('Terms of Use')}</PageLink>
        <PageLink href="/privacy">{t('Privacy Policy')}</PageLink>
      </nav>
      <span>© {new Date().getFullYear()} {LEGAL.operator}<GlobeIcon /></span>
    </footer>;
}
function GlobeIcon() {
    return <span className="footer-dot" aria-hidden="true"/>;
}
