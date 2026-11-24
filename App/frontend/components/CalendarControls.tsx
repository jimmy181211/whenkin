/** Renders editable month/year choices and bounded calendar navigation. */
import { Temporal } from '@js-temporal/polyfill';
import {
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { langService } from '../i18n/language';
import {
  FIRST_EVENT_DATE,
  LAST_EVENT_DATE,
} from '../../shared/date-limits';
import CalendarYearInput from './CalendarYearInput';
import OptionSelect from './OptionSelect';
import { useMediaQuery } from '../utils/use-media-query';

/** Visible month and validated navigation action supplied by the calendar. */
type CalendarControlsProps = {
  month: Temporal.PlainDate;
  setMonth: (next: Temporal.PlainDate) => void;
};

/**
 * Calendar navigation component. Months use a selection-only list opening below;
 * years use bounded numeric input without an option list.
 * The parent clamps requested months to the same supported date range.
 * @returns A downward month selector, year field, and bounded navigation buttons.
 */
export default function CalendarControls({
  month,
  setMonth,
}: CalendarControlsProps) {
  const first = FIRST_EVENT_DATE;
  const last = LAST_EVENT_DATE.with({ day: 1 });
  const narrow = useMediaQuery('(max-width: 699px)');
  const monthFormat = {
    month: narrow ? 'short' : 'long',
    timeZone: 'UTC',
  } as const;
  const localMonths = new Intl.DateTimeFormat(langService.getLocale(), monthFormat);
  const monthOptions = Array.from(
    { length: 12 },
    /* Pair each month number with its localized display label. */
    (_, i) => {
      const date = new Date(Date.UTC(2000, i, 1));
      return {
        label: localMonths.format(date),
        value: String(i + 1),
      };
    },
  );
  return (
    <div className="calendar-heading">
      <div className="calendar-selects">
        <OptionSelect
          label={langService.t('Month')}
          value={String(month.month)}
          options={monthOptions}
          onChange={
            /** Apply the month number chosen from the downward option list. */
            (value) => setMonth(month.with({ month: Number(value) }))
          }
        />
        <CalendarYearInput
          value={month.year}
          onChange={
            /* Keep the visible month while changing to the validated year. */
            (year) => setMonth(month.with({ year }))
          }
        />
      </div>
      <div className="calendar-navigation">
        <button
          className="icon-button"
          type="button"
          aria-label={langService.t('Previous month')}
          disabled={month.equals(first)}
          onClick={
            /* Move the visible calendar back one month. */
            () => setMonth(month.subtract({ months: 1 }))
          }
        >
          <ChevronLeft size={19} />
        </button>
        <button
          className="icon-button"
          type="button"
          aria-label={langService.t('Next month')}
          disabled={month.equals(last)}
          onClick={
            /* Move the visible calendar forward one month. */
            () => setMonth(month.add({ months: 1 }))
          }
        >
          <ChevronRight size={19} />
        </button>
      </div>
    </div>
  );
}
