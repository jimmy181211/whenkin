import { useLanguage } from '../i18n/LanguageProvider';
import { CalendarDays, Repeat2 } from 'lucide-react';
import Calendar from './Calendar';

/**
 * Selections and callbacks for switching between dated and weekly
 * schedules.
 */
type Props = {
  mode: 'dates' | 'weekdays';
  onModeChange: (mode: 'dates' | 'weekdays') => void;
  dates: string[];
  onDatesChange: (dates: string[]) => void;
  weekdays: number[];
  onWeekdaysChange: (days: number[]) => void;
  timezone: string;
};

/** Weekday-picker inputs; the parent owns the selected days. */
type WeekdayPickerProps = {
  // Selected weekday numbers: Monday=1 through Sunday=7.
  value: number[];
  // Receive the complete updated selection after a day is toggled.
  onChange: (days: number[]) => void;
};

/**
 * Toggle a weekday (Monday=1 through Sunday=7) without changing the input array.
 * @returns The remaining days, or the selection with the new day added in order.
 */
function toggleWeekday(selectedDays: number[], day: number): number[] {
  if (selectedDays.includes(day)) {
    return selectedDays.filter(
      /* Keep every selected weekday except the one being removed. */
      (selectedDay) => selectedDay !== day,
    );
  }

  const nextDays = [...selectedDays, day];

  // Keep newly selected days in Monday-to-Sunday order.
  nextDays.sort(
    /* Compare weekday numbers in ascending order. */
    (firstDay, secondDay) => firstDay - secondDay,
  );

  return nextDays;
}

/**
 * Weekday-selection component for schedules without specific calendar dates.
 * @returns Localized weekday buttons that toggle each day's selected state.
 */
export function WeekdayPicker(props: WeekdayPickerProps) {
  const { t, locale } = useLanguage();
  const { value, onChange } = props;

  return (
    <div className="weekly-picker" role="group" aria-label={t('Choose days of the week')}>
      <div className="weekday-options">
        {Array.from(
          { length: 7 },
          /**
           * @returns One weekday button with its selected state and localized
           * labels.
           */
          (_, i) => {
            const day = i + 1;
            const date = new Date(Date.UTC(2024, 0, day)); // Jan 1 was Monday.
            const full = new Intl.DateTimeFormat(locale, {
              weekday: 'long',
              timeZone: 'UTC',
            }).format(date);
            const short = new Intl.DateTimeFormat(locale, {
              weekday: 'short',
              timeZone: 'UTC',
            }).format(date);
            const selected = value.includes(day);
            return (
              <button
                type="button"
                key={day}
                aria-label={full}
                aria-pressed={selected}
                title={full}
                onClick={
                  /* Send the updated selection to the parent component. */
                  () => onChange(toggleWeekday(value, day))
                }
              >
                <span>{short}</span>
                {selected && (
                  <span className="weekday-indicator" aria-hidden="true">
                    ✓
                  </span>
                )}
              </button>
            );
          },
        )}
      </div>
    </div>
  );
}

/**
 * Schedule-selection component that switches between specific dates and a
 * typical week. Each mode keeps its own selection; only the chosen mode is
 * submitted for creation.
 * @returns Mode controls and the date or weekday picker for the current mode.
 */
export default function SchedulePicker(props: Props) {
  const { t } = useLanguage();
  const { mode, onModeChange, dates, onDatesChange, weekdays, onWeekdaysChange, timezone } = props;

  return (
    <section className="schedule-picker">
      <div className="schedule-mode-switch" role="group" aria-label={t('Calendar mode')}>
        <button
          type="button"
          aria-pressed={mode === 'dates'}
          onClick={
            /* Switch schedule selection to specific calendar dates. */
            () => onModeChange('dates')
          }
        >
          <CalendarDays size={16} />
          {t('Specific Dates')}
        </button>
        <button
          type="button"
          aria-pressed={mode === 'weekdays'}
          onClick={
            /* Switch schedule selection to a typical week. */
            () => onModeChange('weekdays')
          }
        >
          <Repeat2 size={16} />
          {t('Days of the Week')}
        </button>
      </div>
      {mode === 'dates' ? (
        <Calendar value={dates} onChange={onDatesChange} timezone={timezone} />
      ) : (
        <WeekdayPicker value={weekdays} onChange={onWeekdaysChange} />
      )}
    </section>
  );
}
