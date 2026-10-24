import type { MeetingEvent } from '../../src/lib/types';
import { Problem, checkId } from './validation';
import { commonGround } from './common-ground';
import { EVENT_EXPIRED_MESSAGE } from '../../src/lib/event-limits';
export type Database = {
    query: <T = Record<string, unknown>>(query: string, params?: unknown[]) => Promise<T[]>;
};
export async function readEvent(database: Database, id: string, includeResponses = false) {
    checkId(id);
    const rows = await database.query<MeetingEvent>(`SELECT e.id,e.title,e.description,e.organizer_name,e.timezone,e.created_at,e.expires_at,e.expires_at<=clock_timestamp() AS expired,e.schedule_revision,e.schedule_mode,
      (SELECT count(*)::int FROM responses r WHERE r.event_id=e.id) AS response_count,
      COALESCE((SELECT jsonb_agg(jsonb_build_object('start',w.starts_at,'end',w.ends_at) ORDER BY w.starts_at) FROM event_windows w WHERE w.event_id=e.id),'[]'::jsonb) AS windows,
      COALESCE((SELECT jsonb_agg(jsonb_build_object('id',r.id,'name',r.name,'timezone',r.timezone,'revision',r.revision,
        'ranges',COALESCE((SELECT jsonb_agg(jsonb_build_object('start',a.starts_at,'end',a.ends_at) ORDER BY a.starts_at) FROM availability a WHERE a.response_id=r.id),'[]'::jsonb)) ORDER BY r.updated_at) FROM responses r WHERE r.event_id=e.id AND $2::boolean),'[]'::jsonb) AS responses
      FROM events e WHERE e.id=$1`, [id, includeResponses]);
    if (!rows.length) throw new Problem(404, 'This event could not be found. It may have expired.');
    const { expired, ...event } = rows[0] as MeetingEvent & { expired: boolean };
    if (expired) throw new Problem(410, EVENT_EXPIRED_MESSAGE);
    // Existing open tabs read this field; it is always empty now, with no secondary calculation.
    event.candidates = includeResponses ? commonGround(event.windows, event.responses).map(candidate => ({ ...candidate, missing: [] })) : [];
    return event;
}
