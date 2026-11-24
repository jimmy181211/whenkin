import { langService } from '../i18n/language';
import {
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import {
  Check,
  ChevronDown,
  Globe2,
  LocateFixed,
  Search,
  X,
} from 'lucide-react';
import {
  deviceTimezone,
  zoneLabel,
  zoneOffset,
} from '../utils/time';
import PopupSurface from './PopupSurface';

const popular = [
  'America/Los_Angeles',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'Europe/London',
  'Europe/Paris',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Kolkata',
  'Australia/Sydney',
  'UTC',
];
const aliases: Record<string, string> = {
  'America/Los_Angeles':
    'Pacific Time PST PDT San Francisco San Diego Seattle Vancouver 洛杉矶 ' +
    '太平洋时间 旧金山 西雅图 温哥华 洛杉磯 Los Ángeles hora del Pacífico',
  'America/New_York':
    'Eastern Time EST EDT Boston Washington Miami 纽约 紐約 东部时间 東部時間 Nueva York hora del Este',
  'America/Chicago': 'Central Time CST CDT Dallas Houston 芝加哥 中部时间 hora central',
  'America/Denver': 'Mountain Time MST MDT 丹佛 山地时间 hora de la montaña',
  'Asia/Shanghai':
    'China Beijing Shenzhen Hong Kong Chinese 上海 北京 深圳 香港 中国 中國 hora de China Pekín',
  'Asia/Kolkata': 'India Mumbai New Delhi Indian 印度 加尔各答 孟买 Calcuta Nueva Delhi',
  'Europe/London': 'United Kingdom British UK GMT BST 伦敦 倫敦 英国 英國 Londres Reino Unido',
  'Europe/Paris': 'Paris París 法国 法國 巴黎',
  'Asia/Tokyo': 'Tokyo Tokio 日本 东京 東京',
  'Australia/Sydney': 'Sydney Sídney Australia 悉尼 澳大利亚',
  UTC: 'Coordinated Universal Time GMT 协调世界时 世界標準時間 tiempo universal coordinado',
};

/**
 * Searchable timezone-selector component that emits IANA timezone ids.
 * @param at - Instant in milliseconds used to show offsets, including DST.
 *
 * @returns The current timezone trigger and, when open, a searchable menu with
 * device detection.
 */
export default function TimezonePicker({
  value,
  onChange,
  at,
}: {
  value: string;
  onChange: (zone: string) => void;
  at?: number;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const root = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const detectedZone = deviceTimezone();
  /** Focus timezone search when the menu opens. */
  useEffect(() => {
    if (open) {
      search.current?.focus();
    }
  }, [open]);
  /**
   * Close the timezone menu on outside clicks and clean up its listener.
   * @returns Cleanup that removes the outside-click listener.
   */
  useEffect(() => {
    /** Dismiss the timezone menu if the click is outside its root. */
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', close);
    // Remove outside-click handling when the timezone picker unmounts.
    return () => document.removeEventListener('mousedown', close);
  }, []);
  const zones = [...new Set([
    value,
    ...popular,
    ...Intl.supportedValuesOf('timeZone'),
  ])];

  /**
   * Ignore accents, case, and underscores during timezone search.
   * @returns Normalized search text, leaving timezone ids themselves unchanged.
   */
  const normalize = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replaceAll('_', ' ');

  const shown = query.trim()
    ? zones
      .filter(
        /* Match the timezone id, city label, and aliases against the search text. */
        (z) =>
          normalize(z + ' ' + zoneLabel(z) + ' ' + (aliases[z] || '')).includes(
            normalize(query.trim()),
          ),
      )
      .slice(0, 70)
    : [...new Set([
      value,
      ...popular,
    ])];

  /** Emit the IANA zone unchanged, clear the search, and restore trigger focus. */
  const choose = (zone: string) => {
    onChange(zone);
    setOpen(false);
    setQuery('');
    trigger.current?.focus();
  };

  return (
    <div
      className="timezone"
      ref={root}
      onKeyDown={
        /* Dismiss the timezone menu when Escape is pressed. */
        (e) => {
          if (e.key === 'Escape') {
            setOpen(false);
          }
        }
      }
    >
      <button
        ref={trigger}
        className="zone-trigger"
        aria-label={[
          `${langService.t('Choose your time zone')}:`,
          zoneLabel(value),
          zoneOffset(value, at),
        ].join(' ')}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={
          /* Toggle the timezone menu from its trigger. */
          () => setOpen(!open)
        }
        type="button"
      >
        <Globe2 size={17} />
        <span>
          <strong>
            {zoneLabel(value)} <span className="zone-offset">{zoneOffset(value, at)}</span>
          </strong>
        </span>
        <ChevronDown size={16} />
      </button>
      {open && (
        <PopupSurface
          id={menuId}
          className="zone-menu"
          role="dialog"
          aria-label={langService.t('Choose your time zone')}
        >
          <div className="zone-search">
            <Search size={17} />
            <input
              ref={search}
              id={menuId + '-search'}
              autoFocus
              autoComplete="off"
              spellCheck={false}
              type="search"
              aria-label={langService.t('Search time zones')}
              placeholder={langService.t('Search a city or time zone')}
              value={query}
              onChange={
                /* Update the timezone search text. */
                (e) => setQuery(e.target.value)
              }
              onKeyDown={
                /* Move into search results with ArrowDown or select the sole match with Enter. */
                (e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    root.current?.querySelector<HTMLButtonElement>('.zone-option')?.focus();
                  }
                  if (e.key === 'Enter' && shown.length === 1) {
                    e.preventDefault();
                    choose(shown[0]);
                  }
                }
              }
            />
            <button
              type="button"
              className="icon-button"
              aria-label={langService.t('Close time zones')}
              onClick={
                /* Close the timezone menu and restore focus to its trigger. */
                () => {
                  setOpen(false);
                  trigger.current?.focus();
                }
              }
            >
              <X size={16} />
            </button>
          </div>
          <button
            type="button"
            className="device-zone"
            onClick={
              /* Select the browser-detected timezone without changing its identifier. */
              () => choose(detectedZone)
            }
          >
            <LocateFixed size={16} /> {langService.t('Use Device Time Zone')}{' '}
            <small>{zoneLabel(detectedZone)}</small>
          </button>
          <div className="zone-options">
            {shown.map(
              /**
               * @returns A timezone result showing its city and offset;
               * the selection retains the IANA id internally.
               */
              (z) => (
                <button
                  type="button"
                  className={value === z ? 'zone-option selected' : 'zone-option'}
                  key={z}
                  onClick={
                    /* Commit the timezone chosen from the results. */
                    () => choose(z)
                  }
                >
                  <span>
                    <strong>{zoneLabel(z)}</strong>
                  </span>
                  <small>{zoneOffset(z, at)}</small>
                  {value === z && <Check size={16} />}
                </button>
              ),
            )}
            {!shown.length && (
              <p className="empty">
                {langService.t('No time zones found. Try a nearby major city.')}
              </p>
            )}
          </div>
        </PopupSurface>
      )}
    </div>
  );
}
