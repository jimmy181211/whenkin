/** Displays an event's calendar, responders, results, and sharing controls. */
import {
  useMemo,
  useState,
} from 'react';
import {
  Link2,
  LoaderCircle,
} from 'lucide-react';
import ParticipantName from '../components/ParticipantName';
import AvailabilityGrid from '../components/AvailabilityGrid';
import TimezonePicker from '../components/TimezonePicker';
import PageLink from '../components/PageLink';
import { projectWeekly } from '../../shared/weekly';
import { t } from '../i18n/index';
import EventResults from '../components/event/EventResults';
import ShareEventDialog from '../components/event/ShareEventDialog';
import EventTour from '../components/EventTour';
import Toast from '../components/Toast';
import AvailabilityPopover from '../components/AvailabilityPopover';
import EventUnavailablePage from './EventUnavailablePage';
import { useEventResponse } from '../utils/use-event-response';

const COPY_FEEDBACK_MS = 2200;

export default function EventPage({ id }: { id: string }) {
  const {
    event,
    zone,
    editingId,
    switching,
    responseSession,
    name,
    selected,
    isSaving,
    editNotice,
    notice,
    nameInput,
    error,
    unavailableReason,
    unavailable,
    saveState,
    view,
    inspection,
    highlightShared,
    conflictRef,
    setName,
    setEditNotice,
    dismissNotice,
    updateDraft,
    changeZone,
    updateSelection,
    requestEditing,
    save,
    deleteResponse,
    editResponse,
    setView,
    setHighlightShared,
    setInspection,
    setError,
  } = useEventResponse(id);
  const [share, setShare] = useState(false);
  const [copied, setCopied] = useState('');
  const suggestions = event?.candidates ?? [];

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(''), COPY_FEEDBACK_MS);
    } catch {
      setError(
        'Copy did not work. Select the link in the sharing panel and copy it manually.',
      );
    }
  }

  const weeklyView = useMemo(
    () =>
      event?.schedule_mode === 'weekdays' ? projectWeekly(event, zone) : null,
    [
      event,
      zone,
    ],
  );
  if (unavailableReason) {
    return <EventUnavailablePage reason={unavailableReason} />;
  }
  if (!event || unavailable) {
    return (
      <main className="loading-page">
        {error ? (
          <>
            <h1>{t('We Couldn’t Open That Event.')}</h1>
            <p role="alert">{t(error)}</p>
            <PageLink href="/" className="button secondary">
              {t('Back to Home')}
            </PageLink>
          </>
        ) : (
          <>
            <LoaderCircle className="spin" />
            <p>{t('Finding your shared time…')}</p>
          </>
        )}
      </main>
    );
  }
  const eventLink = location.origin + `/e/${id}`;
  return (
    <main className="event-page">
      {view === 'group' && inspection && (
        <AvailabilityPopover
          event={event}
          zone={zone}
          inspection={inspection}
          onClose={() => setInspection(null)}
        />
      )}
      {notice && (
        <Toast
          key={notice.id}
          message={notice.message}
          anchor={notice.anchor}
          onDismiss={dismissNotice}
        />
      )}
      <div className="event-layout">
        <section className="schedule-card">
          <header className="event-summary">
            <div className="event-heading">
              <div>
                <h1>{event.title}</h1>
              </div>
              <div className="event-actions">
                <button
                  data-tour-share
                  className="button primary compact"
                  onClick={() => setShare(true)}
                >
                  <Link2 size={17} /> {t('Share Event')}
                </button>
                <EventTour />
              </div>
            </div>
            {event.description && (
              <p className="event-description">{event.description}</p>
            )}
          </header>
          {error && (
            <div className="error-message" role="alert">
              {t(error)}{' '}
              {saveState === 'error' && !conflictRef.current && (
                <button
                  type="button"
                  className="text-button"
                  disabled={isSaving}
                  onClick={() => void save()}
                >
                  {t('Retry')}
                </button>
              )}
            </div>
          )}
          <div className="participant-controls">
            <ParticipantName
              name={name}
              disabled={switching}
              inputRef={nameInput}
              editNotice={editNotice}
              onChange={(value) => {
                setName(value);
                setEditNotice(false);
                dismissNotice();
                updateDraft({ name: value });
              }}
            />
            <TimezonePicker
              value={zone}
              onChange={changeZone}
              at={
                weeklyView?.referenceTime ?? Date.parse(event.windows[0].start)
              }
            />
          </div>
          <AvailabilityGrid
            key={
              event.id + ':' + event.schedule_revision + ':' + responseSession
            }
            event={event}
            zone={zone}
            selected={selected}
            onChange={updateSelection}
            highlights={highlightShared && view === 'group' ? suggestions : []}
            view={view}
            onViewChange={(next) => {
              setView(next);
              if (next === 'personal') {
                setHighlightShared(false);
              }
            }}
            inspection={view === 'group' ? inspection : null}
            onInspect={setInspection}
            canEdit={!switching && !!name.trim()}
            onEditBlocked={() => {
              if (!switching) {
                requestEditing();
              }
            }}
          />
        </section>
        <EventResults
          onDeleteResponse={deleteResponse}
          event={event}
          editingId={editingId}
          onEditResponse={(responseId) => void editResponse(responseId)}
          switching={switching}
          highlighted={highlightShared}
          suggestions={suggestions}
          onToggleHighlight={() => {
            const next = !highlightShared;
            setHighlightShared(next);
            setInspection(null);
            if (next) {
              setView('group');
              requestAnimationFrame(() =>
                document
                  .querySelector<HTMLElement>('.time-cell.highlighted')
                  ?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                    inline: 'nearest',
                  }),
              );
            }
          }}
        />
      </div>
      {share && (
        <ShareEventDialog
          eventLink={eventLink}
          copied={copied}
          onClose={() => {
            setShare(false);
            dismissNotice();
          }}
          onCopy={copy}
        />
      )}
    </main>
  );
}
