/** Displays an event's calendar, responders, results, and sharing controls. */
import { useLanguage } from '../i18n/LanguageProvider';
import { useMemo, useState } from 'react';
import { Link2, LoaderCircle } from 'lucide-react';
import ParticipantName from '../components/ParticipantName';
import AvailabilityGrid from '../components/AvailabilityGrid';
import TimezonePicker from '../components/TimezonePicker';
import { projectWeekly } from '../../shared/weekly';
import EventResults from '../components/event/EventResults';
import ShareEventDialog from '../components/event/ShareEventDialog';
import EventTour from '../components/EventTour';
import { HeaderAction, useHeaderActions } from '../components/HeaderActions';
import Toast from '../components/Toast';
import AvailabilityPopover from '../components/AvailabilityPopover';
import EventUnavailablePage from './EventUnavailablePage';
import { useEventResponse } from '../utils/use-event-response';

const COPY_FEEDBACK_MS = 2200;

/**
 * Event-response page component that connects calendar controls to shared
 * reply state. useEventResponse owns reply changes and saving; this page
 * connects those actions to the calendar, responder list, sharing dialog, and
 * shared-time highlight button.
 * @returns The calendar and results page, or the appropriate loading, error,
 * or unavailable-event view.
 */
export default function EventPage({ id }: { id: string }) {
  const { t } = useLanguage();
  const { menu } = useHeaderActions();
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
    view,
    inspection,
    highlightShared,
    canSave,
    saveState,
    changeName,
    dismissNotice,
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
  // Link label used for temporary copy feedback; empty means no success indicator.
  const [copied, setCopied] = useState('');
  // Backend intersections: every saved responder is free throughout each range.
  const suggestions = event?.candidates ?? [];

  /** Copy a link and briefly mark its label, or show a manual-copy fallback. */
  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(
        /* Clear the temporary copied-link success indicator. */
        () => setCopied(''),
        COPY_FEEDBACK_MS,
      );
    } catch {
      setError('Copy did not work. Select the link in the sharing panel and copy it manually.');
    }
  }

  /**
   * Project an undated weekly schedule into the viewer's timezone.
   * @returns A weekly display projection, or null for a dated event.
   */
  const weeklyView = useMemo(
    () => (event?.schedule_mode === 'weekdays' ? projectWeekly(event, zone) : null),
    [event, zone],
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
            <a href="/" className="button secondary">
              {t('Back to Home')}
            </a>
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
      <HeaderAction name="share">
        <button
          type="button"
          data-tour-share
          className="header-control"
          onClick={
            /* Open the page-owned sharing dialog from the shared header. */
            () => setShare(true)
          }
        >
          <Link2 size={16} /> {t('Share Event')}
        </button>
      </HeaderAction>
      <HeaderAction name="guide">
        <EventTour onOpen={menu.closeAndFocus} onRestoreFocus={menu.closeAndFocus} />
      </HeaderAction>
      {view === 'group' && inspection && (
        <AvailabilityPopover
          event={event}
          zone={zone}
          inspection={inspection}
          onClose={
            /* Hide the current availability inspection panel. */
            () => setInspection(null)
          }
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
            </div>
            {event.description && <p className="event-description">{event.description}</p>}
          </header>
          {error && (
            <div className="error-message" role="alert">
              {t(error)}{' '}
            </div>
          )}
          <div className="participant-controls">
            <ParticipantName
              name={name}
              disabled={switching}
              inputRef={nameInput}
              editNotice={editNotice}
              onChange={changeName}
            />
            <TimezonePicker
              value={zone}
              onChange={changeZone}
              at={weeklyView?.referenceTime ?? Date.parse(event.windows[0].start)}
            />
          </div>
          <AvailabilityGrid
            key={event.id + ':' + event.schedule_revision + ':' + responseSession}
            event={event}
            zone={zone}
            selected={selected}
            onChange={updateSelection}
            highlights={highlightShared && view === 'group' ? suggestions : []}
            view={view}
            onViewChange={
              /* Switch calendar views and remove shared-time highlighting in personal view. */
              (next) => {
                setView(next);
                if (next === 'personal') {
                  setHighlightShared(false);
                }
              }
            }
            inspection={view === 'group' ? inspection : null}
            onInspect={setInspection}
            canEdit={!switching && !!name.trim()}
            onEditBlocked={
              /* Show the name requirement when editing is blocked outside a response switch. */
              () => {
                if (!switching) {
                  requestEditing();
                }
              }
            }
          />
          <div className="response-save-controls">
            <span role="status">
              {t(
                isSaving
                  ? 'Saving…'
                  : saveState !== 'saved'
                    ? 'Unsaved changes'
                    : editingId
                      ? 'All changes saved'
                      : '',
              )}
            </span>
            <button
              type="button"
              className="button primary"
              disabled={!canSave}
              onClick={
                /* Submit the current draft only when the user explicitly chooses to save. */
                () => void save()
              }
            >
              {t('Save Availability')}
            </button>
          </div>
        </section>
        <EventResults
          onDeleteResponse={deleteResponse}
          event={event}
          editingId={editingId}
          onEditResponse={
            /* Load the responder selected in the results sidebar. */
            (responseId) => void editResponse(responseId)
          }
          switching={switching}
          highlighted={highlightShared}
          suggestions={suggestions}
          onToggleHighlight={
            /* Toggle shared-time highlights and reveal the first matching block in group view. */
            () => {
              const next = !highlightShared;
              setHighlightShared(next);
              setInspection(null);
              if (next) {
                setView('group');
                requestAnimationFrame(
                  /* Scroll to a highlighted block after React has rendered the new group view. */
                  () =>
                    document
                      .querySelector<HTMLElement>('.time-cell.highlighted')
                      ?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' }),
                );
              }
            }
          }
        />
      </div>
      {share && (
        <ShareEventDialog
          eventLink={eventLink}
          copied={copied}
          onClose={
            /* Close sharing controls and dismiss any associated reminder. */
            () => {
              setShare(false);
              dismissNotice();
            }
          }
          onCopy={copy}
        />
      )}
    </main>
  );
}
