import { CalendarClock } from 'lucide-react';
import { t } from '../lib/i18n';

export default function EventLimits() {
  return <p className="event-limits"><CalendarClock size={13} aria-hidden="true"/><span>{t('Links expire in 1 year')}</span></p>;
}
