/** Collects an event schedule and requests its shareable link. */
import React, {
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  ArrowRight,
  Info,
  LoaderCircle,
  Plus,
  RefreshCw,
} from 'lucide-react';
import SchedulePicker from '../components/SchedulePicker';
import TimezonePicker from '../components/TimezonePicker';
import EventLimits from '../components/EventLimits';
import { api } from '../api/client';
import { deviceTimezone } from '../utils/time';
import { t } from '../i18n/index';
import TimeRangePicker from '../components/TimeRangePicker';
import Toast from '../components/Toast';
import { useNotice } from '../utils/use-notice';

const scheduleErrors = {
  dates: 'Choose at least one date on the calendar.',
  weekdays: 'Choose at least one day of the week.',
} as const;

/**
 * Distinguish an API connection failure from an unready database.
 * @returns ready for creation, setup when the API responds but its database is not
 * ready, or unreachable when the request fails.
 */
async function connectionStatus(): Promise<'ready' | 'setup' | 'unreachable'> {
  try {
    const result = await api<{
      ready: boolean;
    }>('/health');
    return result.ready === true ? 'ready' : 'setup';
  } catch {
    return 'unreachable';
  }
}

/**
 * Event-creation page component that collects and validates the offered
 * schedule.
 * @returns The event form, connection feedback, and required-field reminders.
 */
export default function CreateEventPage() {
  const [scheduleMode, setScheduleMode] = useState<'dates' | 'weekdays'>(
    'dates',
  );
  // Weekday mode uses Monday=1 through Sunday=7; date mode uses YYYY-MM-DD strings.
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [zone, setZone] = useState(deviceTimezone);
  const [dates, setDates] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const titleInput = useRef<HTMLInputElement>(null);
  const {
    notice,
    notifyRequired,
    dismissNotice,
  } = useNotice();
  const [description, setDescription] = useState('');
  // Whether the optional notes field is visible; description holds its text.
  const [notes, setNotes] = useState(false);
  // Local clock values in the chosen zone, interpreted by the backend on creation.
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('18:00');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [connection, setConnection] = useState<
    'checking' | 'ready' | 'setup' | 'unreachable'
  >('checking');

  /** Show the checking state while retrying API/database readiness. */
  const checkConnection = async () => {
    setConnection('checking');
    setConnection(await connectionStatus());
  };

  /**
   * Check creation readiness once and ignore a response after the page
   * unmounts.
   * @returns Cleanup that ignores a readiness response after the page has
   * unmounted.
   */
  useEffect(() => {
    let alive = true;
    void connectionStatus().then(
      /* Apply the readiness result only while this page is still mounted. */
      (status) => {
        if (alive) {
          setConnection(status);
        }
      },
    );
    // Prevent a late connection result from updating an unmounted creation page.
    return () => {
      alive = false;
    };
  }, []);

  /** Update selected dates and clear only their missing-selection warning. */
  function handleDatesChange(next: string[]) {
    setDates(next);
    if (next.length) {
      setError(
        /* Clear only the date-selection warning, preserving unrelated errors. */
        (current) => (current === scheduleErrors.dates ? '' : current),
      );
    }
  }

  /** Update selected weekdays and clear only their missing-selection warning. */
  function handleWeekdaysChange(next: number[]) {
    setWeekdays(next);
    if (next.length) {
      setError(
        /* Clear only the weekday-selection warning. */
        (current) => (current === scheduleErrors.weekdays ? '' : current),
      );
    }
  }

  /**
   * Check the name, API readiness, selected days, and time order before submitting.
   * Send local dates/clock times with the event timezone; the backend validates and
   * converts them to stored windows. Open the reply page only after a successful save.
   */
  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!title.trim()) {
      void notifyRequired(
        'Enter an event name before creating your event.',
        titleInput.current,
      );
      return;
    }
    if (connection !== 'ready') {
      return;
    }
    if (scheduleMode === 'weekdays' ? !weekdays.length : !dates.length) {
      setError(scheduleErrors[scheduleMode]);
      return;
    }
    if (start >= end) {
      setError('Choose an end time after the start time.');
      return;
    }
    setBusy(true);
    try {
      const result = await api<{
        id: string;
      }>('/events', {
        method: 'POST',
        body: JSON.stringify({
          title,
          description,
          timezone: zone,
          dates,
          schedule_mode: scheduleMode,
          weekdays,
          startTime: start,
          endTime: end,
        }),
      });
      window.location.assign(new URL(`/e/${result.id}`, location.href).href);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Could not create your event. Please try again.',
      );
      setBusy(false);
    }
  }

  return (
    <main className="create-page">
      {notice && (
        <Toast
          key={notice.id}
          message={notice.message}
          anchor={notice.anchor}
          onDismiss={dismissNotice}
        />
      )}
      <section className="create-card">
        <div className="form-heading">
          <div>
            <h2>{t('Create Your Event')}</h2>
          </div>
        </div>
        <form noValidate onSubmit={create}>
          <label className="field">
            {t('Event Name')}
            <input
              ref={titleInput}
              autoComplete="off"
              required
              aria-invalid={!title.trim() && !!notice}
              maxLength={100}
              value={title}
              onChange={
                /* Update the event name and dismiss its required-field reminder. */
                (e) => {
                  setTitle(e.target.value);
                  dismissNotice();
                }
              }
            />
          </label>
          {notes ? (
            <label className="field">
              <span>
                {t('Note')} <span className="optional">{t('optional')}</span>
              </span>
              <textarea
                maxLength={1000}
                rows={2}
                value={description}
                onChange={
                  /* Keep the optional description in the creation form state. */
                  (e) => setDescription(e.target.value)
                }
              />
            </label>
          ) : (
            <button
              className="text-button add-note"
              type="button"
              onClick={
                /* Reveal the optional event-notes field. */
                () => setNotes(true)
              }
            >
              <Plus size={14} /> {t('Add a Note')}
            </button>
          )}
          <div className="form-divider" />
          <SchedulePicker
            mode={scheduleMode}
            onModeChange={
              /* Switch schedule mode and clear validation feedback from the previous mode. */
              (mode) => {
                setScheduleMode(mode);
                setError('');
              }
            }
            dates={dates}
            onDatesChange={handleDatesChange}
            weekdays={weekdays}
            onWeekdaysChange={handleWeekdaysChange}
            timezone={zone}
          />
          <TimeRangePicker
            start={start}
            end={end}
            onStartChange={setStart}
            onEndChange={setEnd}
          />
          <TimezonePicker value={zone} onChange={setZone} />
          {(connection === 'setup' || connection === 'unreachable') && (
            <div className="connection-notice" role="status">
              <Info size={17} />
              <div>
                <strong>
                  {t(
                    connection === 'setup'
                      ? 'Event creation is still being set up.'
                      : 'We can’t reach event saving right now.',
                  )}
                </strong>
                <p>
                  {t(
                    connection === 'setup'
                      ? 'Shareable links will be available when setup is complete.'
                      : 'Your form is still here. Please retry the connection.',
                  )}
                </p>
                <div>
                  <button
                    type="button"
                    className="text-button"
                    onClick={
                      /* Retry the creation page's connection check. */
                      () => void checkConnection()
                    }
                  >
                    <RefreshCw size={12} /> {t('Retry Connection')}
                  </button>
                </div>
              </div>
            </div>
          )}
          {error && (
            <p className="error-message" role="alert">
              {t(error)}
            </p>
          )}
          <EventLimits />
          <button
            disabled={busy || connection !== 'ready'}
            className="button primary create-submit"
            type="submit"
          >
            {busy ? (
              <>
                <LoaderCircle className="spin" size={18} />{' '}
                {t('Creating your event…')}
              </>
            ) : connection === 'checking' ? (
              <>
                <LoaderCircle className="spin" size={18} />{' '}
                {t('Checking connection…')}
              </>
            ) : (
              <>
                {t('Create Event & Get a Link')} <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>
      </section>
    </main>
  );
}
