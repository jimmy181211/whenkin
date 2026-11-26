import { useLanguage } from '../i18n/LanguageProvider';
import { CalendarClock } from 'lucide-react';
import { useRetentionPolicy } from './RetentionPolicyProvider';
import { retentionDuration } from '../utils/retention-label';
import type { RetentionPolicy } from '../../shared/retention.js';

/**
 * Shared expiry-message component driven by the current retention policy.
 * @param policy - Optional explicit policy; otherwise use the shared provider.
 * @param variant - Full notice, duration alone, or a validity sentence for
 * policy pages.
 *
 * @returns A duration span or an expiry/validity paragraph, with fallback
 * wording while the policy is unavailable.
 */
export default function EventLimits({
  policy: supplied,
  variant = 'notice',
  className = '',
}: {
  policy?: RetentionPolicy;
  variant?: 'notice' | 'duration' | 'validity';
  className?: string;
}) {
  const { t, language } = useLanguage();

  const stored = useRetentionPolicy();
  const policy = supplied ?? stored;
  const duration = policy
    ? retentionDuration(policy, language)
    : t('the configured retention period');
  if (variant === 'duration') {
    return <span>{duration}</span>;
  }
  const message = policy
    ? t(
      variant === 'validity'
        ? 'Event links are valid for {duration}.'
        : 'Links expire in {duration}',
      { duration },
    )
    : t('Link expiry follows the retention policy.');
  return (
    <p className={`event-limits ${className}`.trim()}>
      {variant === 'notice' && <CalendarClock size={13} aria-hidden="true" />}
      <span>{message}</span>
    </p>
  );
}
