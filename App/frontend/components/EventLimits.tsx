import { CalendarClock } from 'lucide-react';
import { t } from '../i18n/index';
import { useLanguage } from './LanguageSelector';
import { useRetentionPolicy } from './RetentionPolicyProvider';
import { retentionDuration } from '../utils/retention-label';
import type { RetentionPolicy } from '../../shared/retention.mjs';

export default function EventLimits({ policy: supplied, variant = 'notice', className = '' }: {
  policy?: RetentionPolicy; variant?: 'notice' | 'duration' | 'validity'; className?: string;
}) {
  useLanguage();
  const stored = useRetentionPolicy();
  const policy = supplied ?? stored;
  const duration = policy ? retentionDuration(policy) : t('the configured retention period');
  if (variant === 'duration') return <span>{duration}</span>;
  const message = policy ? t(variant === 'validity' ? 'Event links are valid for {duration}.' : 'Links expire in {duration}', { duration }) : t('Link expiry follows the retention policy.');
  return <p className={`event-limits ${className}`.trim()}>{variant === 'notice' && <CalendarClock size={13} aria-hidden="true"/>}<span>{message}</span></p>;
}
