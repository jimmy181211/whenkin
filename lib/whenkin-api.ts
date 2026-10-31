import { Hono } from 'hono';
import { neon } from '@neondatabase/serverless';
import { isTimezone } from '../src/lib/time';
import type { CreateInput } from '../src/lib/types';
import { Problem, checkId, text, validateEvent, validateRanges } from './server/validation';
import { readEvent, type Database } from './server/event-queries';
import { EVENT_EXPIRED_MESSAGE } from '../src/lib/event-limits';
// Keep these imports stable for the Worker entry point and existing tests.
export { validateEvent, validateRanges } from './server/validation';
export type { Database } from './server/event-queries';
type Env = {
    DATABASE_URL?: string;
    ASSETS?: Fetcher;
    WRITE_LIMITER?: {
        limit: (arg: {
            key: string;
        }) => Promise<{
            success: boolean;
        }>;
    };
};
async function body(request: Request) {
    const reader = request.body?.getReader();
    if (!reader) {
        throw new Problem(400, 'Please include your event information.');
    }
    let size = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
        const part = await reader.read();
        if (part.done) {
            break;
        }
        size += part.value.length;
        if (size > 131072) {
            await reader.cancel();
            throw new Problem(413, 'This request is too large. Please choose fewer dates.');
        }
        chunks.push(part.value);
    }
    const buffer = new Uint8Array(size);
    let cursor = 0;
    chunks.forEach(chunk => {
        buffer.set(chunk, cursor);
        cursor += chunk.length;
    });
    try {
        const parsed: unknown = JSON.parse(new TextDecoder().decode(buffer));
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw Error();
        }
        return parsed as Record<string, unknown>;
    }
    catch {
        throw new Problem(400, 'The information could not be read. Please try again.');
    }
}
export function createApp(factory?: (env: Env) => Database) {
    const app = new Hono<{
        Bindings: Env;
    }>();
    const db = (env: Env): Database => {
        if (factory) {
            return factory(env);
        }
        if (!env.DATABASE_URL) {
            throw new Problem(503, 'Whenkin is not connected to its database yet. Please try again once setup is complete.');
        }
        const sql = neon(env.DATABASE_URL);
        return { query: async <T,>(q: string, p: unknown[] = []) => await sql.query(q, p) as T[] };
    };
    app.use('*', async (c, next) => {
        if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
            const origin = c.req.header('Origin');
            if (origin && origin !== new URL(c.req.url).origin) {
                throw new Problem(403, 'Please make changes from the Whenkin website.');
            }
            if (c.env.WRITE_LIMITER) {
                const result = await c.env.WRITE_LIMITER.limit({ key: c.req.header('CF-Connecting-IP') || 'unknown' });
                if (!result.success) {
                    throw new Problem(429, 'Too many changes at once. Please wait a minute and try again.');
                }
            }
        }
        await next();
        c.header('X-Content-Type-Options', 'nosniff');
        c.header('Referrer-Policy', 'no-referrer');
        c.header('X-Frame-Options', 'DENY');
        c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
        c.header('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
        if (c.req.path.startsWith('/api')) {
            c.header('Cache-Control', 'no-store');
        }
    });
    app.get('/api/health', async (c) => {
        if (!c.env.DATABASE_URL && !factory) {
            return c.json({ ready: false });
        }
        try {
            await db(c.env).query('SELECT 1 FROM events LIMIT 1');
            return c.json({ ready: true });
        }
        catch {
            return c.json({ ready: false });
        }
    });
    app.post('/api/events', async (c) => {
        const input = await body(c.req.raw) as CreateInput;
        const valid = validateEvent(input);
        const id = crypto.randomUUID();
        await db(c.env).query(`WITH event AS (
      INSERT INTO events(id,title,description,organizer_name,timezone,schedule_mode) VALUES($1,$2,$3,$4,$5,$7) RETURNING id
    ) INSERT INTO event_windows(event_id,starts_at,ends_at)
      SELECT event.id,w.start::timestamptz,w.end::timestamptz FROM event CROSS JOIN jsonb_to_recordset($6::jsonb) AS w(start text,"end" text)`, [id, valid.title, valid.description, valid.organizer, input.timezone, JSON.stringify(valid.windows), valid.mode]);
        return c.json({ id }, 201);
    });
    app.get('/api/events/:id', async (c) => c.json(await readEvent(db(c.env), c.req.param('id'), true)));
    app.post('/api/events/:id/responses', async (c) => {
        const database = db(c.env);
        const event = await readEvent(database, c.req.param('id'));
        const input = await body(c.req.raw);
        const name = text(input.name, 'your name', 60);
        if (typeof input.timezone !== 'string' || !isTimezone(input.timezone)) {
            throw new Problem(400, 'Please choose a valid time zone.');
        }
        const expectedSchedule = input.schedule_revision ?? event.schedule_revision;
        if (expectedSchedule !== event.schedule_revision) {
            throw new Problem(409, 'The event schedule changed. Reload before saving your changes.');
        }
        const ranges = validateRanges(input.ranges, event.windows);
        const id = crypto.randomUUID();
        const created = await database.query(`WITH gate AS (
      UPDATE events SET write_revision=write_revision+1 WHERE id=$2 AND schedule_revision=$6 AND expires_at>clock_timestamp() RETURNING id
    ), response AS (
      INSERT INTO responses(id,event_id,name,timezone,edit_hash) SELECT $1,gate.id,$3,$4,'' FROM gate RETURNING id
    ), inserted AS (INSERT INTO availability(response_id,starts_at,ends_at)
      SELECT response.id,a.start::timestamptz,a.end::timestamptz FROM response CROSS JOIN jsonb_to_recordset($5::jsonb) AS a(start text,"end" text) RETURNING id) SELECT id FROM response`, [id, event.id, name, input.timezone, JSON.stringify(ranges), expectedSchedule]);
        if (!created.length) {
            await readEvent(database, event.id);
            throw new Problem(409, 'The event schedule changed. Reload before saving your changes.');
        }
        return c.json({ id, revision: 1 }, 201);
    });
    app.put('/api/events/:id/responses/:responseId', async (c) => {
        const database = db(c.env);
        const event = await readEvent(database, c.req.param('id'));
        const id = c.req.param('responseId');
        checkId(id);
        const existing = await database.query('SELECT id FROM responses WHERE id=$1 AND event_id=$2', [id, event.id]);
        if (!existing.length) {
            throw new Problem(404, 'This response could not be found. Refresh the group and try again.');
        }
        const input = await body(c.req.raw);
        const name = text(input.name, 'your name', 60);
        if (typeof input.timezone !== 'string' || !isTimezone(input.timezone) || typeof input.revision !== 'number' || !Number.isInteger(input.revision) || input.revision < 1) {
            throw new Problem(400, 'Please reload this response and choose a valid time zone.');
        }
        const expectedSchedule = input.schedule_revision ?? event.schedule_revision;
        if (expectedSchedule !== event.schedule_revision) {
            throw new Problem(409, 'The event schedule changed. Reload before saving your changes.');
        }
        const ranges = validateRanges(input.ranges, event.windows);
        const updated = await database.query<{
            id: string;
            revision: number;
        }>(`WITH gate AS (
      UPDATE events SET write_revision=write_revision+1 WHERE id=$6 AND schedule_revision=$7 AND expires_at>clock_timestamp() RETURNING id
    ), target AS (
      UPDATE responses SET name=$1,timezone=$2,revision=revision+1,updated_at=now() WHERE id=$3 AND event_id=$6 AND revision=$4 AND EXISTS (SELECT 1 FROM gate) RETURNING id,revision
    ), removed AS (
      DELETE FROM availability WHERE response_id IN (SELECT id FROM target) RETURNING id
    ), inserted AS (
      INSERT INTO availability(response_id,starts_at,ends_at)
      SELECT target.id,a.start::timestamptz,a.end::timestamptz FROM target CROSS JOIN jsonb_to_recordset($5::jsonb) AS a(start text,"end" text)
      WHERE (SELECT count(*) FROM removed)>=0 RETURNING id
    ) SELECT id,revision FROM target`, [name, input.timezone, id, input.revision, JSON.stringify(ranges), event.id, expectedSchedule]);
        if (!updated.length) {
            await readEvent(database, event.id);
            throw new Problem(409, 'This response changed. Select the person again to load the latest version before saving.');
        }
        return c.json(updated[0]);
    });
    app.delete('/api/events/:id/responses/:responseId', async (c) => {
        const database = db(c.env);
        const event = await readEvent(database, c.req.param('id'));
        const id = c.req.param('responseId');
        checkId(id);
        const input = await body(c.req.raw);
        if (typeof input.revision !== 'number' || !Number.isInteger(input.revision) || input.revision < 1) {
            throw new Problem(400, 'Please reload this response before deleting it.');
        }
        const expectedSchedule = input.schedule_revision ?? event.schedule_revision;
        if (expectedSchedule !== event.schedule_revision) throw new Problem(409, 'The event schedule changed. Reload before saving your changes.');
        const existing = await database.query('SELECT id FROM responses WHERE id=$1 AND event_id=$2', [id, event.id]);
        if (!existing.length) throw new Problem(404, 'This response could not be found. Refresh the group and try again.');
        // Parent lock serializes deletion with writes; FK cascade removes only this response's availability.
        const removed = await database.query<{id: string}>(`WITH gate AS (
          UPDATE events SET write_revision=write_revision+1
          WHERE id=$2 AND schedule_revision=$4 AND expires_at>clock_timestamp() RETURNING id
        ) DELETE FROM responses WHERE id=$1 AND event_id=$2 AND revision=$3
          AND EXISTS (SELECT 1 FROM gate) RETURNING id`, [id, event.id, input.revision, expectedSchedule]);
        if (!removed.length) {
            await readEvent(database, event.id);
            throw new Problem(409, 'This response changed. Review it before deleting.');
        }
        return c.json({ id: removed[0].id });
    });
    app.all('/api/*', c => c.json({ error: 'This action could not be found.' }, 404));
    app.get('*', async (c) => c.env.ASSETS ? await c.env.ASSETS.fetch(c.req.raw) : c.text('Start the website with npm run dev.', 404));
    app.onError((error, c) => {
        if (error instanceof Problem) {
            return c.json({ error: error.message }, error.status);
        }
        // Expiry is also enforced by the database during response writes.
        const code = error && typeof error === 'object' && 'code' in error ? error.code : '';
        if (code === 'WK001') return c.json({ error: EVENT_EXPIRED_MESSAGE }, 410);
        // Do not return database details, connection strings, or tokens to visitors or logs.
        return c.json({ error: 'Your change could not be saved. Please try again in a moment.' }, 503);
    });
    return app;
}
export default createApp();
