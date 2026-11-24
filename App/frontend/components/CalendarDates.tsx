/** Renders a selectable month grid using the calendar's controlled selection. */
import { Temporal } from '@js-temporal/polyfill';
import { langService } from '../i18n/language';
import { isEventDateAllowed } from '../../shared/date-limits';

/** Visible dates and selected-date values; all selection updates go to the parent. */
type CalendarDatesProps = {
  month: Temporal.PlainDate;
  today: Temporal.PlainDate;
  value: string[];
  onChange: (dates: string[]) => void;
};

/**
 * Date-grid component. Disables past/out-of-range days and retains the existing
 * 31-date limit; removing a date remains allowed when that limit is reached.
 * @returns Sunday-first weekday headings and the visible month's date buttons.
 */
export default function CalendarDates({
  month,
  today,
  value,
  onChange,
}: CalendarDatesProps) {
  // Convert Monday-based Temporal numbering to the calendar's Sunday-first columns.
  const offset = month.dayOfWeek % 7;
  const weekdayFormat = new Intl.DateTimeFormat(langService.getLocale(), {
    weekday: 'narrow',
    timeZone: 'UTC',
  });
  const todayKey = today.toString();
  const dates = Array.from(
    { length: Math.ceil((offset + month.daysInMonth) / 7) * 7 },
    /** Fill complete calendar weeks around the currently visible month. */
    (_, i) => month.add({ days: i - offset }),
  );
  return (
    <div className="calendar-grid">
      {Array.from(
        { length: 7 },
        /* Build Sunday-first weekday headings in the selected language. */
        (_, i) => weekdayFormat.format(new Date(Date.UTC(2023, 0, 1 + i))),
      ).map(
        /**
         * @returns One localized weekday heading in the calendar.
         */
        (d, i) => (
          <span className="weekday" key={i}>
            {d}
          </span>
        ),
      )}
      {dates.map(
        /**
         * @returns A date button showing its allowed, selected, and
         * current-day state.
         */
        (d) => {
          const key = d.toString();
          const selected = value.includes(key);
          const disabled = !isEventDateAllowed(d, today);
          const dateClasses = [
            'calendar-day',
            d.month !== month.month ? 'other-month' : '',
            key === todayKey ? 'today' : '',
          ].join(' ');
          return (
            <button
              type="button"
              key={key}
              aria-label={key}
              aria-pressed={selected}
              disabled={disabled}
              className={dateClasses}
              onClick={
                /* Toggle this date while enforcing the 31-date selection limit. */
                () =>
                  onChange(
                    selected
                      ? value.filter(
                        /* Remove the date that the user just deselected. */
                        (v) => v !== key,
                      )
                      : value.length < 31
                        ? [
                          ...value,
                          key,
                        ].sort()
                        : value,
                  )
              }
            >
              {d.day}
            </button>
          );
        },
      )}
    </div>
  );
}
