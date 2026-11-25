/** Renders native month selection, numeric year input, and calendar navigation. */
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
import { useMediaQuery } from '../utils/use-media-query';
import './calendar-controls.css';

/** Visible month and validated navigation action supplied by the calendar. */
type CalendarControlsProps = {
  month: Temporal.PlainDate;
  setMonth: (next: Temporal.PlainDate) => void;
};

/**
 * Calendar navigation component using the browser's native month selector.
 * Narrow screens show abbreviated month names; years use bounded numeric input.
 * The parent clamps requested months to the same supported date range.
 * @returns A month selector, year field, and bounded navigation buttons.
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
  return (
    <div className="calendar-heading">
      <div className="calendar-selects">
        <select
          className="calendar-month"
          aria-label={langService.t('Month')}
          value={String(month.month)}
          onChange={
            /** Apply the month number selected with the browser's native controls. */
            (event) => setMonth(month.with({ month: Number(event.currentTarget.value) }))
          }
        >
          {Array.from(
            { length: 12 },
            /** Render a localized month label while keeping its saved numeric value. */
            (_, index) => (
              <option key={index + 1} value={index + 1}>
                {localMonths.format(new Date(Date.UTC(2000, index, 1)))}
              </option>
            ),
          )}
        </select>
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
