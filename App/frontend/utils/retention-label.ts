import { langService } from '../i18n/language';
import type { RetentionPolicy } from '../../shared/retention.js';

/**
 * Format the month count in the selected language, using years for multiples of 12.
 * For example, 12 becomes "1 year" while 18 remains "18 months" in English.
 * @returns The localized duration text, with its number formatted for the UI locale.
 */
export function retentionDuration(policy: RetentionPolicy) {
  const years = policy.value % 12 === 0;
  const count = years ? policy.value / 12 : policy.value;
  const unit = years ? (count === 1 ? 'year' : 'years') : count === 1 ? 'month' : 'months';
  return new Intl.NumberFormat(langService.getLocale()).format(count) + ' ' + langService.t(unit);
}
