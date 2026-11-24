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
import { langService } from '../i18n/language';
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
export default function SiteHeader({ showNewEvent }: { showNewEvent: boolean }) {
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
      <a className="brand" href="/" aria-label={langService.t('Whenkin home')}>
        <img src="/favicon.svg" alt="" width={40} height={40} />
        <span>{BRAND.name.toLowerCase()}</span>
      </a>
      <nav className="header-navigation" aria-label={langService.t('Main navigation')}>
        {showNewEvent && <HeaderActionSlot name="share" />}
        <div className="header-secondary" ref={menu.container}>
          {showNewEvent && (
            <button
              type="button"
              className="icon-button header-menu-toggle"
              ref={menu.trigger}
              aria-label={langService.t('Menu')}
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
                <a className="header-control" href="/">
                  <Plus size={16} /> {langService.t('New Event')}
                </a>
              </>
            ) : (
              <a
                className="header-help"
                href="/how-it-works"
                aria-label={langService.t('How It Works')}
                title={langService.t('How It Works')}
              >
                <CircleHelp size={18} aria-hidden="true" />
                <span>{langService.t('How It Works')}</span>
              </a>
            )}
            <LanguageSelector />
          </div>
        </div>
      </nav>
    </header>
  );
}
