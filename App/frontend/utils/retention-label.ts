import {
  getLocale,
  t,
} from '../i18n/index';
import type { RetentionPolicy } from '../../shared/retention.js';

export function retentionDuration(policy: RetentionPolicy) {
  const years = policy.value % 12 === 0;
  const count = years ? policy.value / 12 : policy.value;
  const unit = years
    ? count === 1
      ? 'year'
      : 'years'
    : count === 1
      ? 'month'
      : 'months';
  return new Intl.NumberFormat(getLocale()).format(count) + ' ' + t(unit);
}
