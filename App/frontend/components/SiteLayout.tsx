import {
  useCallback,
  useState,
  type ReactNode,
} from 'react';
import { Plus } from 'lucide-react';
import LanguageSelector, { useLanguage } from './LanguageSelector';
import PageLink from './PageLink';
import ShortcutDialog from './ShortcutDialog';
import { BRAND } from '../brand';
import { t } from '../i18n/index';
import { LEGAL } from '../content/legal';
import { shortcutCopy } from '../utils/shortcut-instructions';
import { browserInstall } from '../utils/browser-install';
import EventLimits from './EventLimits';
import RetentionPolicyProvider from './RetentionPolicyProvider';
import './site-layout.css';

/**
 * Shared page-layout component with navigation, policy links, and retention
 * context.
 * @returns The header, supplied page content, and footer inside the
 * retention-policy provider.
 */
export default function SiteLayout({
  children,
  showNewEvent = false,
}: {
  children: ReactNode;
  showNewEvent?: boolean;
}) {
  return (
    <RetentionPolicyProvider>
      <Header showNewEvent={showNewEvent} />
      {children}
      <Footer showEventExpiry={showNewEvent} />
    </RetentionPolicyProvider>
  );
}

/**
 * Site-header component with home navigation and language selection.
 * @returns The brand link, language menu, and optional new-event link.
 */
function Header({ showNewEvent }: { showNewEvent: boolean }) {
  return (
    <header className="site-header">
      <PageLink className="brand" href="/" aria-label={t('Whenkin home')}>
        <img src="/favicon.svg" alt="" width={40} height={40} />
        <span>{BRAND.name.toLowerCase()}</span>
      </PageLink>
      <nav aria-label={t('Main navigation')}>
        {showNewEvent && (
          <PageLink className="button secondary compact quiet-action" href="/">
            <Plus size={16} />
            {t('New Event')}
          </PageLink>
        )}
        <LanguageSelector />
      </nav>
    </header>
  );
}

/**
 * Site-footer component with expiry/policy information and shortcut
 * installation controls.
 * @returns Footer links and installation controls, plus manual instructions
 * when needed.
 */
function Footer({ showEventExpiry }: { showEventExpiry: boolean }) {
  const copy = shortcutCopy[useLanguage()];
  const [shortcutOpen, setShortcutOpen] = useState(false);
  const [installing, setInstalling] = useState(false);

  /** Close the manual shortcut instructions. */
  const closeShortcut = useCallback(() => setShortcutOpen(false), []);

  /**
   * Request native installation and show instructions when no prompt is
   * available.
   */
  async function addShortcut() {
    setInstalling(true);
    const result = await browserInstall.prompt();
    setInstalling(false);
    if (result === 'unavailable') {
      setShortcutOpen(true);
    }
  }

  return (
    <>
      <footer className="site-footer">
        {showEventExpiry ? (
          <EventLimits className="footer-expiry" />
        ) : (
          <span>{t(BRAND.tagline)}</span>
        )}
        <nav aria-label={copy.footer}>
          <button
            type="button"
            className="shortcut-entry"
            data-tour-shortcut
            aria-haspopup="dialog"
            aria-expanded={shortcutOpen}
            aria-busy={installing}
            disabled={installing}
            onClick={
              /* Start shortcut installation from the footer button. */
              () => void addShortcut()
            }
          >
            {copy.title}
          </button>
          <PageLink href="/terms">{t('Terms of Use')}</PageLink>
          <PageLink href="/privacy">{t('Privacy Policy')}</PageLink>
        </nav>
        <span>
          © {new Date().getFullYear()} {LEGAL.operator}
          <GlobeIcon />
        </span>
      </footer>
      {shortcutOpen && <ShortcutDialog onClose={closeShortcut} />}
    </>
  );
}

/**
 * Small decorative footer-mark component excluded from screen-reader output.
 * @returns The styled footer-dot span.
 */
function GlobeIcon() {
  return <span className="footer-dot" aria-hidden="true" />;
}
