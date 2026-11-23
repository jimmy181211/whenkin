import {
  useCallback,
  useState,
  type ReactNode,
} from 'react';
import { useLanguage } from './LanguageSelector';
import SiteHeader from './SiteHeader';
import { HeaderActionsProvider } from './HeaderActions';
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
  showFooterTagline = true,
  showEventExpiry = showNewEvent,
}: {
  children: ReactNode;
  showNewEvent?: boolean;
  showFooterTagline?: boolean;
  showEventExpiry?: boolean;
}) {
  return (
    <RetentionPolicyProvider>
      <HeaderActionsProvider>
        <SiteHeader showNewEvent={showNewEvent} />
        {children}
        <Footer
          showEventExpiry={showEventExpiry}
          showTagline={showFooterTagline}
        />
      </HeaderActionsProvider>
    </RetentionPolicyProvider>
  );
}

/**
 * Site-footer component with expiry/policy information and shortcut
 * installation controls.
 * @returns Footer links and installation controls, plus manual instructions
 * when needed.
 */
function Footer({
  showEventExpiry,
  showTagline,
}: {
  showEventExpiry: boolean;
  showTagline: boolean;
}) {
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
        ) : showTagline ? (
          <span className="footer-tagline">{t(BRAND.tagline)}</span>
        ) : null}
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
          <span className="footer-policy-links">
            <PageLink href="/terms">{t('Terms of Use')}</PageLink>
            <PageLink href="/privacy">{t('Privacy Policy')}</PageLink>
          </span>
        </nav>
        <span className="footer-copyright">
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
