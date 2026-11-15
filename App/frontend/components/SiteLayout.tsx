import { useCallback, useState, type ReactNode } from 'react';
import { Plus } from 'lucide-react';
import LanguageSelector, { useLanguage } from './LanguageSelector';
import PageLink from './PageLink';
import ShortcutDialog from './ShortcutDialog';
import { BRAND } from '../brand';
import { t } from '../i18n/index';
import { LEGAL } from '../content/legal';
import { shortcutCopy } from '../utils/shortcut-instructions';
import { browserInstall } from '../utils/browser-install';
export default function SiteLayout({ children, showNewEvent = false }: {
    children: ReactNode;
    showNewEvent?: boolean;
}) {
    return <><Header showNewEvent={showNewEvent}/>{children}<Footer /></>;
}
function Header({ showNewEvent }: { showNewEvent: boolean }) {
    return <header className="site-header">
      <PageLink className="brand" href="/" aria-label={t('Whenkin home')}>
        <img src="/favicon.svg" alt="" width={40} height={40}/>
        <span>{BRAND.name.toLowerCase()}</span>
      </PageLink>
      <nav aria-label={t('Main navigation')}>
        {showNewEvent && <PageLink className="button secondary compact" href="/"><Plus size={16}/>{t('New Event')}</PageLink>}
        <LanguageSelector />
      </nav>
    </header>;
}
function Footer() {
    const copy = shortcutCopy[useLanguage()];
    const [shortcutOpen, setShortcutOpen] = useState(false);
    const [installing, setInstalling] = useState(false);
    const closeShortcut = useCallback(() => setShortcutOpen(false), []);
    async function addShortcut() {
      setInstalling(true);
      const result = await browserInstall.prompt();
      setInstalling(false);
      if (result === 'unavailable') setShortcutOpen(true);
    }
    return <><footer className="site-footer">
      <span>{t(BRAND.tagline)}</span>
      <nav aria-label={copy.footer}>
        <button type="button" className="shortcut-entry" data-tour-shortcut aria-haspopup="dialog" aria-expanded={shortcutOpen} aria-busy={installing} disabled={installing} onClick={() => void addShortcut()}>{copy.title}</button>
        <PageLink href="/terms">{t('Terms of Use')}</PageLink>
        <PageLink href="/privacy">{t('Privacy Policy')}</PageLink>
      </nav>
      <span>© {new Date().getFullYear()} {LEGAL.operator}<GlobeIcon /></span>
    </footer>{shortcutOpen && <ShortcutDialog onClose={closeShortcut}/>}</>;
}
function GlobeIcon() {
    return <span className="footer-dot" aria-hidden="true"/>;
}
