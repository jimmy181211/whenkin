import type { MeetingEvent } from '../../src/lib/types';
import { Problem, checkId } from './validation';
import { hash } from './tokens';
import { EVENT_EXPIRED_MESSAGE } from '../../src/lib/event-limits';
export type Database = {
    query: <T = Record<string, unknown>>(query: string, params?: unknown[]) => Promise<T[]>;
};
export async function readEvent(database: Database, id: string, viewer?: {
    secret: string;
    responseId?: string;
}) {
    checkId(id);
    const settings = await database.query<{
        admin_hash: string;
        expired: boolean;
    }>('SELECT admin_hash,expires_at<=clock_timestamp() AS expired FROM events WHERE id=$1', [id]);
    if (!settings.length) {
        throw new Problem(404, 'This event could not be found. It may have expired.');
    }
    if (settings[0].expired) throw new Problem(410, EVENT_EXPIRED_MESSAGE);
    const organizer = !!viewer?.secret && await hash(viewer.secret) === settings[0].admin_hash;
    // Internal validation needs the event's windows, not all 1,000 responses or
    // ranked suggestions. Only an authenticated organizer needs those results.
    const includeResponses = organizer;
    let ownId: string | null = null;
    if (viewer?.responseId) {
        checkId(viewer.responseId);
        const owned = await database.query('SELECT id FROM responses WHERE id=$1 AND event_id=$2 AND edit_hash=$3', [viewer.responseId, id, await hash(viewer.secret)]);
        if (!owned.length) {
            throw new Problem(403, 'Use your private edit link to change this response.');
        }
        ownId = viewer.responseId;
    }
    else if (viewer?.secret && !organizer) {
        throw new Problem(403, 'Use your private organizer link to manage this event.');
    }
    const rows = await database.query<MeetingEvent>(`SELECT e.id,e.title,e.description,e.organizer_name,e.timezone,e.duration,e.final_start,e.final_end,e.created_at,e.expires_at,e.schedule_revision,e.schedule_mode,
      (SELECT count(*)::int FROM responses r WHERE r.event_id=e.id) AS response_count,
      COALESCE((SELECT jsonb_agg(jsonb_build_object('start',w.starts_at,'end',w.ends_at) ORDER BY w.starts_at) FROM event_windows w WHERE w.event_id=e.id),'[]'::jsonb) AS windows,
      COALESCE((SELECT jsonb_agg(jsonb_build_object('id',r.id,'name',r.name,'timezone',r.timezone,'revision',r.revision,
        'ranges',COALESCE((SELECT jsonb_agg(jsonb_build_object('start',a.starts_at,'end',a.ends_at) ORDER BY a.starts_at) FROM availability a WHERE a.response_id=r.id),'[]'::jsonb)) ORDER BY r.updated_at) FROM responses r WHERE r.event_id=e.id AND ($2::boolean OR r.id=$3::uuid)),'[]'::jsonb) AS responses
      FROM events e WHERE e.id=$1 AND e.expires_at>clock_timestamp()`, [id, includeResponses, ownId]);
    if (!rows.length) {
        throw new Problem(410, EVENT_EXPIRED_MESSAGE);
    }
    const event = rows[0];
    event.is_organizer = organizer;
    if (!includeResponses) {
        event.candidates = [];
        return event;
    }
    event.candidates = await database.query<NonNullable<MeetingEvent['candidates']>[number]>(`WITH merged AS (
      SELECT unnest(range_agg(tstzrange(starts_at,ends_at,'[)'))) AS span FROM event_windows WHERE event_id=$1
    ), slots AS (
      SELECT DISTINCT generate_series(lower(span),upper(span)-($2 * interval '1 minute'),interval '15 minutes') AS start FROM merged
    ) SELECT s.start,s.start+($2 * interval '1 minute') AS "end",
      COALESCE((SELECT jsonb_agg(r.id ORDER BY r.id) FROM responses r WHERE r.event_id=$1 AND EXISTS (
        SELECT 1 FROM availability a WHERE a.response_id=r.id AND a.starts_at<=s.start AND a.ends_at>=s.start+($2 * interval '1 minute')
      )),'[]'::jsonb) AS available,
      COALESCE((SELECT jsonb_agg(r.id ORDER BY r.id) FROM responses r WHERE r.event_id=$1 AND NOT EXISTS (
        SELECT 1 FROM availability a WHERE a.response_id=r.id AND a.starts_at<=s.start AND a.ends_at>=s.start+($2 * interval '1 minute')
      )),'[]'::jsonb) AS missing
      FROM slots s ORDER BY jsonb_array_length(COALESCE((SELECT jsonb_agg(r.id) FROM responses r WHERE r.event_id=$1 AND EXISTS (
        SELECT 1 FROM availability a WHERE a.response_id=r.id AND a.starts_at<=s.start AND a.ends_at>=s.start+($2 * interval '1 minute')
      )),'[]'::jsonb)) DESC,s.start`, [id, event.duration]);
    return event;
}
