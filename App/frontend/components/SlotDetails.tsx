import {
  Check,
  X,
} from 'lucide-react';
import { t } from '../i18n/index';
import { displayRange } from '../utils/time';
import { inspectAvailability } from '../utils/group-availability';
import type {
  MeetingEvent,
  TimeRange,
} from '../../shared/types';

/**
 * Stored slot starts, displayed range, and optional anchor for
 * availability details.
 */
export type SlotInspection = {
  stamps: number[];
  range: TimeRange;
  anchor?: HTMLElement;
};

/**
 * Responder-breakdown component for a selected time block.
 * @returns The inspected range and each responder's full, partial, or
 * unavailable status.
 */
export default function SlotDetails({
  event,
  zone,
  inspection,
}: {
  event: MeetingEvent;
  zone: string;
  inspection: SlotInspection;
}) {
  const {
    available,
    unavailable,
  } = inspectAvailability(
    event.responses,
    inspection.stamps,
  );
  const free = new Set(
    available.map(
      /* Collect fully available responder ids for the presence indicators. */
      (person) => person.id,
    ),
  );
  const partial = new Set(
    unavailable
      .filter(
        /* Select responders available for only part of the inspected block. */
        (person) => person.partial,
      )
      .map(
        /* Collect those partial-match responder ids. */
        (person) => person.id,
      ),
  );
  return (
    <section
      id="slot-details"
      className="slot-details"
      aria-label={t('Availability at This Time')}
    >
      <h2>{t('Availability at This Time')}</h2>
      <p className="slot-detail-time">
        {displayRange(
          inspection.range,
          event.schedule_mode === 'weekdays' ? 'UTC' : zone,
          event.schedule_mode === 'weekdays',
        )}
      </p>
      <p className="slot-detail-count">
        {t('{count} of {total} available', {
          count: available.length,
          total: event.responses.length,
        })}
      </p>
      <ul className="slot-responders">
        {event.responses.map(
          /**
           * @returns One responder row with the corresponding availability
           * indicator.
           */
          (person) => (
            <li key={person.id}>
              <span className="slot-responder-name">
                {person.name}
                {partial.has(person.id) && (
                  <small>{t('Partly available')}</small>
                )}
              </span>
              <span
                className={
                  free.has(person.id)
                    ? 'slot-presence available'
                    : 'slot-presence unavailable'
                }
                role="img"
                aria-label={t(
                  free.has(person.id)
                    ? 'Available'
                    : partial.has(person.id)
                      ? 'Partly available'
                      : 'Unavailable',
                )}
              >
                {free.has(person.id) ? (
                  <Check size={18} aria-hidden="true" />
                ) : (
                  <X size={18} aria-hidden="true" />
                )}
              </span>
            </li>
          ),
        )}
      </ul>
    </section>
  );
}
