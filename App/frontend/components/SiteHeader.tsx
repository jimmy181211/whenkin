/** Shared navigation with visible event sharing and responsive secondary actions. */
import {
  useEffect,
  useId,
} from 'react';
import {
  CircleHelp,
  Menu,
  Plus,
  X,
} from 'lucide-react';
import { BRAND } from '../brand';
import { t } from '../i18n/index';
import PageLink from './PageLink';
import LanguageSelector from './LanguageSelector';
import {
  HeaderActionSlot,
  useHeaderActions,
} from './HeaderActions';
import './site-header.css';

/**
 * Responsive header component. Event sharing stays visible at every width;
 * the guide, new-event link, and language selector collapse only on event pages.
 * @returns The brand and navigation, with an optional mobile disclosure.
 */
export default function SiteHeader({
  showNewEvent,
}: {
  showNewEvent: boolean;
}) {
  const { menu } = useHeaderActions();
  const id = useId();

  /**
   * Close the mobile disclosure when resizing back to desktop.
   * @returns Cleanup for the breakpoint listener.
   */
  useEffect(() => {
    const breakpoint = window.matchMedia('(min-width: 1000px)');

    /** Desktop navigation is always visible and needs no expanded menu state. */
    const resize = () => {
      if (breakpoint.matches) {
        menu.close();
      }
    };

    breakpoint.addEventListener('change', resize);
    // Stop observing this header's breakpoint when the layout unmounts.
    return () => breakpoint.removeEventListener('change', resize);
  }, [menu.close]);

  return (
    <header className="site-header" data-event={showNewEvent}>
      <PageLink className="brand" href="/" aria-label={t('Whenkin home')}>
        <img src="/favicon.svg" alt="" width={40} height={40} />
        <span>{BRAND.name.toLowerCase()}</span>
      </PageLink>
      <nav className="header-navigation" aria-label={t('Main navigation')}>
        {showNewEvent && <HeaderActionSlot name="share" />}
        <div className="header-secondary" ref={menu.container}>
          {showNewEvent && (
            <button
              type="button"
              className="icon-button header-menu-toggle"
              ref={menu.trigger}
              aria-label={t('Menu')}
              aria-expanded={menu.open}
              aria-controls={id}
              onClick={menu.toggle}
            >
              {menu.open ? <X size={21} /> : <Menu size={21} />}
            </button>
          )}
          <div id={id} className="header-secondary-panel" data-open={menu.open}>
            {showNewEvent ? (
              <>
                <HeaderActionSlot name="guide" />
                <PageLink className="header-control" href="/">
                  <Plus size={16} /> {t('New Event')}
                </PageLink>
              </>
            ) : (
              <PageLink
                className="header-help"
                href="/how-it-works"
                aria-label={t('How It Works')}
                title={t('How It Works')}
              >
                <CircleHelp size={18} aria-hidden="true" />
                <span>{t('How It Works')}</span>
              </PageLink>
            )}
            <LanguageSelector />
          </div>
        </div>
      </nav>
    </header>
  );
}
