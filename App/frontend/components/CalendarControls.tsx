/** Renders editable month/year choices and bounded calendar navigation. */
import { Temporal } from '@js-temporal/polyfill';
import {
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  getLocale,
  t,
} from '../i18n/index';
import {
  FIRST_EVENT_DATE,
  LAST_EVENT_DATE,
} from '../../shared/date-limits';
import EditableSelect from './EditableSelect';

/** Visible month and validated navigation action supplied by the calendar. */
type CalendarControlsProps = {
  month: Temporal.PlainDate;
  setMonth: (next: Temporal.PlainDate) => void;
};

/**
 * Calendar navigation component. Text input is validated by EditableSelect;
 * the parent clamps requested months to the same supported date range.
 * @returns Month/year comboboxes and previous/next buttons with boundary states.
 */
export default function CalendarControls({
  month,
  setMonth,
}: CalendarControlsProps) {
  const first = FIRST_EVENT_DATE;
  const last = LAST_EVENT_DATE.with({ day: 1 });
  const monthNames = Array.from(
    { length: 12 },
    /* Build localized month labels without applying a local timezone shift. */
    (_, i) =>
      new Intl.DateTimeFormat(getLocale(), {
        month: 'long',
        timeZone: 'UTC',
      }).format(new Date(Date.UTC(2000, i, 1))),
  );
  const years = Array.from(
    { length: last.year - first.year + 1 },
    /** Enumerate every year supported by the calendar limits. */
    (_, i) => first.year + i,
  );
  return (
    <div className="calendar-heading">
      <div className="calendar-selects">
        <EditableSelect
          label={t('Month')}
          value={String(month.month)}
          options={monthNames.map(
            /* Pair each localized month label with its number and English search alias. */
            (label, i) => ({
              label,
              value: String(i + 1),
              keywords: [
                new Intl.DateTimeFormat('en', {
                  month: 'long',
                  timeZone: 'UTC',
                }).format(new Date(Date.UTC(2000, i, 1))),
              ],
            }),
          )}
          onChange={
            /* Apply the validated month number from the editable dropdown. */
            (value) => setMonth(month.with({ month: Number(value) }))
          }
          invalidMessage={t('Choose a valid month.')}
        />
        <EditableSelect
          label={t('Year')}
          value={String(month.year)}
          options={years.map(
            /* Build the allowed numeric year choices. */
            (year) => ({
              label: String(year),
              value: String(year),
            }),
          )}
          onChange={
            /* Apply the validated year from the editable dropdown. */
            (value) => setMonth(month.with({ year: Number(value) }))
          }
          numeric
          invalidMessage={t('Choose a year from {first} to {last}.', {
            first: String(first.year),
            last: String(last.year),
          })}
        />
      </div>
      <div className="calendar-navigation">
        <button
          className="icon-button"
          type="button"
          aria-label={t('Previous month')}
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
          aria-label={t('Next month')}
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
