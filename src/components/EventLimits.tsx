import { CalendarClock } from 'lucide-react';
import { getLocale, t } from '../lib/i18n';
import { MAX_PARTICIPANTS } from '../lib/event-limits';

export default function EventLimits({ expiresAt, timezone }: { expiresAt?: string; timezone?: string }) {
  const expiry = expiresAt ? new Date(expiresAt) : null;
  return <p className="event-limits">
    <CalendarClock size={13} aria-hidden="true"/>
    <span>{expiry
      ? t('Links expire {date}', { date: new Intl.DateTimeFormat(getLocale(), { timeZone: timezone, month: 'short', day: 'numeric', year: 'numeric' }).format(expiry) })
      : t('Links expire in 1 month')}
      {' · '}{t('Max. {count} participants', { count: MAX_PARTICIPANTS })}
    </span>
  </p>;
}
