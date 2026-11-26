/** Selects event dates using the existing month and year controls. */
import { useLanguage } from '../i18n/LanguageProvider';
import { useState } from 'react';
import { Temporal } from '@js-temporal/polyfill';
import { FIRST_EVENT_DATE, LAST_EVENT_DATE } from '../../shared/date-limits';
import CalendarControls from './CalendarControls';
import CalendarDates from './CalendarDates';

/**
 * Return the month's first day, limited to the supported calendar range.
 * @returns The first day of the requested month, clamped to the supported
 * calendar limits.
 */
export function clampCalendarMonth(value: Temporal.PlainDate) {
  const first = FIRST_EVENT_DATE;
  const last = LAST_EVENT_DATE.with({ day: 1 });
  const month = value.with({ day: 1 });
  return Temporal.PlainDate.compare(month, first) < 0
    ? first
    : Temporal.PlainDate.compare(month, last) > 0
      ? last
      : month;
}

/**
 * Date-selection component with editable month/year controls and event-date
 * limits.
 * @param timezone - Determines today's date and which past dates are disabled.
 * @param onChange - Receives all selected dates after adding or removing a date.
 *
 * @returns A month calendar with individually selectable dates.
 */
export default function Calendar({
  value,
  onChange,
  timezone,
}: {
  value: string[];
  onChange: (dates: string[]) => void;
  timezone: string;
}) {
  const { t } = useLanguage();
  const today = Temporal.Now.plainDateISO(timezone);
  const [visibleMonth, setVisibleMonth] = useState(today.with({ day: 1 }));
  const month = clampCalendarMonth(visibleMonth);

  /** Keep month navigation inside the calendar's supported date range. */
  const setMonth = (next: Temporal.PlainDate) => setVisibleMonth(clampCalendarMonth(next));

  return (
    <div className="calendar" role="group" aria-label={t('Event dates')}>
      <CalendarControls month={month} setMonth={setMonth} />
      <CalendarDates month={month} today={today} value={value} onChange={onChange} />
    </div>
  );
}
