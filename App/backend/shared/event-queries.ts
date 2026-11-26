import type { Database } from '../db/types.js';
import type { MeetingEvent } from '../../shared/types.js';
import { Problem, checkId } from './validation.js';
import { commonGround } from './common-ground.js';
import { EVENT_EXPIRED_MESSAGE } from '../../shared/event-limits.js';

/**
 * Read an active event; throw Problem for missing or expired links.
 * @param includeResponses - Also load replies and calculate everyone's free time.
 * @returns The event with ordered windows; responses/candidates are empty when omitted.
 */
export async function readEvent(database: Database, id: string, includeResponses = false) {
  checkId(id);
  const rows = await database.query<MeetingEvent>(
    `SELECT
  e.id,
  e.title,
  e.description,
  e.organizer_name,
  e.timezone,
  e.created_at,
  e.expires_at,
  e.expires_at <= clock_timestamp() AS expired,
  e.schedule_revision,
  e.schedule_mode,
  e.slot_minutes,
  (SELECT count(*)::int FROM responses r WHERE r.event_id = e.id) AS response_count,
  COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object('start', w.starts_at, 'end', w.ends_at)
        ORDER BY w.starts_at
      )
      FROM event_windows w
      WHERE w.event_id = e.id
    ),
    '[]'::jsonb
  ) AS windows,
  COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', r.id,
          'name', r.name,
          'timezone', r.timezone,
          'revision', r.revision,
          'ranges', COALESCE(
            (
              SELECT jsonb_agg(
                jsonb_build_object('start', a.starts_at, 'end', a.ends_at)
                ORDER BY a.starts_at
              )
              FROM availability a
              WHERE a.response_id = r.id
            ),
            '[]'::jsonb
          )
        ) ORDER BY r.updated_at
      )
      FROM responses r
      WHERE r.event_id = e.id AND $2::boolean
    ),
    '[]'::jsonb
  ) AS responses
FROM events e
WHERE e.id = $1`,
    [id, includeResponses],
  );
  if (!rows.length) {
    throw new Problem(404, 'This event could not be found. It may have expired.');
  }
  const { expired, ...event } = rows[0] as MeetingEvent & { expired: boolean };
  if (expired) {
    throw new Problem(410, EVENT_EXPIRED_MESSAGE);
  }
  // The legacy "missing" list stays empty because candidates now require everyone.
  event.candidates = includeResponses
    ? commonGround(event.windows, event.responses).map(
      /* Keep the legacy missing-person field empty for everyone-free results. */
      (candidate) => ({ ...candidate, missing: [] }),
    )
    : [];
  return event;
}
