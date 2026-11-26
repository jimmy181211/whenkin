import { useLanguage } from '../../i18n/LanguageProvider';
import { useState } from 'react';
import DeleteResponsePopover from '../DeleteResponsePopover';
import { Pencil, Trash2 } from 'lucide-react';
import { zoneLabel } from '../../utils/time';
import type { Candidate, MeetingEvent, ResponseData } from '../../../shared/types';
/**
 * Saved replies and callbacks for responder actions and shared-time
 * highlights.
 */
type Props = {
  event: MeetingEvent;
  editingId?: string | null;
  onEditResponse: (id: string) => void;
  onDeleteResponse: (response: ResponseData) => Promise<boolean>;
  switching?: boolean;
  highlighted: boolean;
  suggestions: Candidate[];
  onToggleHighlight: () => void;
};

/**
 * Event-results component containing saved responders and shared-time
 * controls. Keep only the delete-confirmation popup state here; edit/delete
 * callbacks let the shared reply hook finish any pending save before changing
 * response data.
 * @returns The responder sidebar, shared-time highlight control, and optional
 * deletion confirmation.
 */
export default function EventResults({
  event,
  editingId,
  onEditResponse,
  onDeleteResponse,
  switching,
  highlighted,
  suggestions,
  onToggleHighlight,
}: Props) {
  const { t, language } = useLanguage();
  // The reply being confirmed and the trash button used to position its popup.
  const [deletion, setDeletion] = useState<{ response: ResponseData; anchor: HTMLElement } | null>(
    null,
  );
  return (
    <aside className="results-sidebar">
      <section className="people-card" data-tour-responders aria-busy={switching}>
        <div className="sidebar-title">
          <h3>
            {t('Responders')} <span>{event.responses.length}</span>
          </h3>
        </div>
        {event.responses.map(
          /**
           * @returns One saved-responder row with edit and delete actions.
           */
          (r, i) => (
            <div className="person-row" key={r.id}>
              <button
                type="button"
                className="person"
                aria-label={t('Edit {name}', { name: r.name })}
                aria-pressed={r.id === editingId}
                disabled={switching}
                onClick={
                  /* Open this saved reply in the shared response editor. */
                  () => onEditResponse(r.id)
                }
              >
                <span className={`avatar avatar-${i % 3}`}>{r.name.slice(0, 1).toUpperCase()}</span>
                <span>
                  <strong>{r.name}</strong>
                  <small>{zoneLabel(r.timezone, language)}</small>
                </span>
                <Pencil size={14} />
              </button>
              <button
                type="button"
                id={'delete-response-' + r.id}
                className="icon-button delete-response"
                aria-label={t('Delete {name}', { name: r.name })}
                title={t('Delete {name}', { name: r.name })}
                disabled={switching}
                onClick={
                  /* Open a deletion confirmation anchored to this responder's trash button. */
                  (e) => setDeletion({ response: r, anchor: e.currentTarget })
                }
              >
                <Trash2 size={16} />
              </button>
            </div>
          ),
        )}
      </section>
      <section className="suggestions-card" data-tour-shared-times>
        <div className="sidebar-title">
          <h2>{t('When Everyone Is Free')}</h2>
        </div>
        {suggestions.length > 0 || highlighted ? (
          <>
            <button
              type="button"
              className="button primary highlight-shared-times"
              aria-pressed={highlighted}
              onClick={onToggleHighlight}
            >
              {t(highlighted ? 'Cancel Highlight' : 'Highlight Everyone’s Free Times')}
            </button>
            <p className="shared-time-summary" role="status">
              {t(
                suggestions.length === 1
                  ? '{count} shared time period'
                  : '{count} shared time periods',
                { count: suggestions.length },
              )}
            </p>
          </>
        ) : (
          <p className="shared-empty" role="status">
            {t('No shared free time yet.')}
          </p>
        )}
      </section>
      {deletion && (
        <DeleteResponsePopover
          anchor={deletion.anchor}
          name={deletion.response.name}
          onConfirm={
            /* Delete the response currently shown in the confirmation popup. */
            () => onDeleteResponse(deletion.response)
          }
          onClose={
            /* Clear the pending deletion confirmation. */
            () => setDeletion(null)
          }
        />
      )}
    </aside>
  );
}
