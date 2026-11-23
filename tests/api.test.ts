import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';
import {
  readFile,
  readdir,
} from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { Temporal } from '@js-temporal/polyfill';
import type {
  MeetingEvent,
  TimeRange,
} from '../App/shared/types';
import { createApp as createServerApp } from '../App/backend/app';
import type { Database } from '../App/backend/db/types';
import { testClient } from './test-client';

/**
 * Wrap the real API in a localhost client with write limits disabled for
 * tests.
 * @returns A localhost request client for the API backed by the supplied fixture database.
 */
const createApp = (factory: () => Database) =>
  testClient(createServerApp(factory(), { rateLimit: false }));

import { EventCleanup } from '../App/backend/tools/cleanup.js';
const pg = new PGlite();

/**
 * Execute fixture SQL and expose only the result rows.
 * @returns A promise resolving to SQL result rows from the fixture database.
 */
const query = async <T>(sql: string, params: unknown[] = []) =>
  (await pg.query<T>(sql, params)).rows;

const app = createApp(
  /* Supply the query adapter used by this API fixture. */
  () => ({ query }),
);
const date = Temporal.Now.plainDateISO('America/Los_Angeles')
  .add({ days: 3 })
  .toString();
const input = {
  title: 'Team together',
  organizer_name: 'Alex',
  description: 'A simple meeting.',
  timezone: 'America/Los_Angeles',
  dates: [date],
  startTime: '09:00',
  endTime: '12:00',
};

/**
 * Send a JSON API request with optional authentication fixture headers.
 * @returns The HTTP response, including error statuses; connection failures reject the promise.
 */
async function request(
  path: string,
  method = 'GET',
  data?: unknown,
  token?: string,
) {
  return app.request(
    'http://localhost/api' + path,
    {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: data === undefined ? undefined : JSON.stringify(data),
    },
    {},
  );
}

/**
 * Create an event fixture and check the response contains only its id.
 * @returns The created event id after checking that creation succeeded.
 */
async function create(extra: Record<string, unknown> = {}) {
  const result = await request('/events', 'POST', {
    ...input,
    ...extra,
  });
  expect(result.status).toBe(201);
  const value = (await result.json()) as { id: string };
  expect(Object.keys(value)).toEqual(['id']);
  return value;
}

/**
 * Read a fixture event and its saved responses.
 * @returns The parsed event snapshot, including its saved responses.
 */
async function get(id: string) {
  return (await (await request('/events/' + id)).json()) as MeetingEvent;
}

/**
 * Create a reply fixture and return its id and revision.
 * @returns The saved response id and initial revision after successful fixture creation.
 */
async function respond(id: string, ranges: TimeRange[], name = 'Sam') {
  const result = await request(`/events/${id}/responses`, 'POST', {
    name,
    timezone: 'UTC',
    ranges,
  });
  expect(result.status).toBe(201);
  return (await result.json()) as { id: string;
    revision: number };
}

beforeAll(
  /* Apply migrations before this suite uses its isolated fixture database. */
  async () => {
    for (const name of (
      await readdir(new URL('../App/backend/db/migrations/', import.meta.url))
    )
      .filter(
        /* Select SQL migration files for API fixture setup. */
        (n) => n.endsWith('.sql'),
      )
      .sort()) {
      await pg.exec(
        await readFile(
          new URL('../App/backend/db/migrations/' + name, import.meta.url),
          'utf8',
        ),
      );
    }
  },
  30000,
);
beforeEach(
  /* Clear event fixtures so each test starts without another test's data. */
  async () => {
    await pg.exec('TRUNCATE events CASCADE');
  },
);
afterAll(
  /* Close the fixture database after this suite finishes. */
  async () => {
    await pg.close();
  },
);

/** Group the shared events and common ground checks. */
describe('shared events and common ground', () => {
  /**
   * Creates without a meeting length, including a single 30-minute event
   * window.
   */
  it('creates without a meeting length, including a single 30-minute event window', async () => {
    const created = await create({
      endTime: '09:30',
      organizer_name: '',
    });
    const event = await get(created.id);
    expect(event.organizer_name).toBe('');
    expect(
      Date.parse(event.windows[0].end) - Date.parse(event.windows[0].start),
    ).toBe(30 * 60000);
    expect(event.slot_minutes).toBe(30);
    expect(event).not.toHaveProperty('duration');
    expect(event).not.toHaveProperty('is_organizer');
    expect(event).not.toHaveProperty('admin_hash');
    expect(event).not.toHaveProperty('final_start');
    expect(
      (
        await request('/events', 'POST', {
          ...input,
          title: '',
        })
      ).status,
    ).toBe(400);
  });
  /** Accepts future dates through 2050 and rejects 2051. */
  it('accepts future dates through 2050 and rejects 2051', async () => {
    for (const value of [
      '2028-02-29',
      '2050-12-31',
    ]) {
      expect(
        (
          await request('/events', 'POST', {
            ...input,
            dates: [value],
          })
        ).status,
      ).toBe(201);
    }
    expect(
      (
        await request('/events', 'POST', {
          ...input,
          dates: ['2051-01-01'],
        })
      ).status,
    ).toBe(400);
  });
  /**
   * Shows the same group responses and matches with a shared link or an
   * old organizer token.
   */
  it('shows the same group responses and matches with a shared link or an old organizer token', async () => {
    const created = await create();
    const event = await get(created.id);
    const alice = await respond(created.id, event.windows, 'Alice');
    await respond(created.id, event.windows, 'Bob');
    const shared = await get(created.id);
    const legacy = await (
      await request(
        `/events/${created.id}`,
        'GET',
        undefined,
        'old-organizer-token',
      )
    ).json();
    expect(legacy).toEqual(shared);
    expect(
      shared.responses.map(
        /* Compare saved responder names without depending on other response fields. */
        (r) => r.name,
      ),
    ).toEqual([
      'Alice',
      'Bob',
    ]);
    expect(shared.candidates).toHaveLength(1);
    expect(shared.candidates![0]).toMatchObject({
      start: new Date(event.windows[0].start).toISOString(),
      end: new Date(event.windows[0].end).toISOString(),
      available: shared.responses.map(
        /* Compare the responder ids returned by the shared event. */
        (r) => r.id,
      ),
      missing: [],
    });
    expect(alice).not.toHaveProperty('editToken');
    expect(JSON.stringify(shared)).not.toContain('edit_hash');
    const own = await (
      await request(
        `/events/${created.id}?response_id=${alice.id}`,
        'GET',
        undefined,
      )
    ).json();
    expect(own).toEqual(shared);
  });
  /** Returns only everyone-free intersections, with no secondary periods. */
  it('returns only everyone-free intersections, with no secondary periods', async () => {
    const created = await create();
    const event = await get(created.id);
    const start = Date.parse(event.windows[0].start);

    /**
     * Build an ISO range using minute offsets from the event's start.
     * @returns An ISO range whose boundaries are the supplied minute offsets from the fixture start.
     */
    const range = (a: number, b: number) => ({
      start: new Date(start + a * 60000).toISOString(),
      end: new Date(start + b * 60000).toISOString(),
    });

    await respond(created.id, [range(0, 180)], 'Alice');
    await respond(created.id, [range(0, 180)], 'Bob');
    await respond(created.id, [range(30, 60)], 'Charlie');
    const result = await get(created.id);
    expect(result.candidates).toEqual([
      {
        ...range(30, 60),
        available: result.responses.map(
          /* Read response ids for the expected shared-time membership check. */
          (r) => r.id,
        ),
        missing: [],
      },
    ]);
  });
  /**
   * Counts empty saved responses and does not show a match when nobody or
   * too few people are free.
   */
  it('counts empty saved responses and does not show a match when nobody or too few people are free', async () => {
    const created = await create();
    const event = await get(created.id);
    expect(event.candidates).toEqual([]);
    await respond(created.id, []);
    expect((await get(created.id)).candidates).toEqual([]);
    await respond(created.id, [], 'Other');
    await respond(created.id, event.windows, 'Third');
    expect((await get(created.id)).candidates).toEqual([]);
  });
  /** Has no participant cap in the API or database. */
  it('has no participant cap in the API or database', async () => {
    const created = await create();
    await query(
      `INSERT INTO responses(id,event_id,name,timezone,edit_hash) SELECT gen_random_uuid(),$1,'Guest '||n,'UTC','test' FROM generate_series(1,1001) n`,
      [created.id],
    );
    await respond(created.id, [], 'Still welcome');
    expect((await get(created.id)).response_count).toBe(1002);
  });
  /** Keeps date and weekday modes, time zones, and shared results. */
  it('keeps date and weekday modes, time zones, and shared results', async () => {
    const created = await create({
      schedule_mode: 'weekdays',
      weekdays: [
        1,
        3,
        7,
      ],
      dates: [],
    });
    const event = await get(created.id);
    expect(event.schedule_mode).toBe('weekdays');
    expect(new Date(event.windows[0].start).toISOString()).toBe(
      '2000-01-03T09:00:00.000Z',
    );
    const person = await respond(created.id, event.windows);
    expect((await get(created.id)).candidates![0].available).toEqual([
      person.id,
    ]);
    for (const path of [
      '/schedule',
      '/settings',
      '/finalize',
      '/calendar',
    ]) {
      expect(
        (
          await request(
            '/events/' + created.id + path,
            path === '/calendar' ? 'GET' : 'POST',
            path === '/calendar' ? undefined : {},
          )
        ).status,
      ).toBe(404);
    }
  });
});

/** Group the response editing and validation checks. */
describe('response editing and validation', () => {
  /**
   * Lets anyone edit an existing response without a private token and
   * rejects stale writes.
   */
  it('lets anyone edit an existing response without a private token and rejects stale writes', async () => {
    const created = await create();
    const event = await get(created.id);
    const person = await respond(created.id, event.windows);
    await query(
      "UPDATE responses SET edit_hash='legacy-unused-hash' WHERE id=$1",
      [person.id],
    );
    const path = `/events/${created.id}/responses/${person.id}`;
    const payload = {
      name: 'Updated Sam',
      timezone: 'Europe/London',
      ranges: [],
      revision: 1,
    };
    expect((await request(path, 'PUT', payload)).status).toBe(200);
    expect(
      (
        await request(path, 'PUT', {
          ...payload,
          ranges: event.windows,
        })
      ).status,
    ).toBe(409);
    expect((await get(created.id)).responses[0]).toMatchObject({
      name: 'Updated Sam',
      revision: 2,
      timezone: 'Europe/London',
      ranges: [],
    });
    const latest = await get(created.id);
    expect(
      (
        await request(path, 'PUT', {
          ...payload,
          revision: latest.responses[0].revision,
          ranges: event.windows,
        })
      ).status,
    ).toBe(200);
    expect((await get(created.id)).responses[0].ranges).toHaveLength(1);
  });
  /**
   * Never edits a response through a different event or creates one for an
   * unknown ID.
   */
  it('never edits a response through a different event or creates one for an unknown ID', async () => {
    const first = await create();
    const second = await create();
    const person = await respond(first.id, []);
    const payload = {
      name: 'Wrong event',
      timezone: 'UTC',
      ranges: [],
      revision: 1,
    };
    expect(
      (
        await request(
          `/events/${second.id}/responses/${person.id}`,
          'PUT',
          payload,
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await request(
          `/events/${second.id}/responses/${crypto.randomUUID()}`,
          'PUT',
          payload,
        )
      ).status,
    ).toBe(404);
    expect((await get(first.id)).responses[0]).toMatchObject({
      name: 'Sam',
      revision: 1,
    });
    expect((await get(second.id)).responses).toEqual([]);
  });
  /**
   * Checks schedule revisions and rejects forged ranges without destroying
   * saved data.
   */
  it('checks schedule revisions and rejects forged ranges without destroying saved data', async () => {
    const created = await create();
    const event = await get(created.id);
    expect(
      (
        await request(`/events/${created.id}/responses`, 'POST', {
          name: 'Sam',
          timezone: 'UTC',
          schedule_revision: 9,
          ranges: [],
        })
      ).status,
    ).toBe(409);
    expect(
      (
        await request(`/events/${created.id}/responses`, 'POST', {
          name: 'Sam',
          timezone: 'UTC',
          ranges: [
            {
              start: '2000-01-01T00:00Z',
              end: '2000-01-01T00:15Z',
            },
          ],
        })
      ).status,
    ).toBe(400);
    const person = await respond(created.id, event.windows);
    expect(person.revision).toBe(1);
  });
  /**
   * Rejects cross-origin writes, malformed bodies, invalid dates, and
   * invalid time zones.
   */
  it('rejects cross-origin writes, malformed bodies, invalid dates, and invalid time zones', async () => {
    expect(
      (
        await app.request(
          'http://localhost/api/events',
          {
            method: 'POST',
            headers: { Origin: 'https://elsewhere.example' },
            body: JSON.stringify(input),
          },
          {},
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await app.request(
          'http://localhost/api/events',
          {
            method: 'POST',
            body: '{',
          },
          {},
        )
      ).status,
    ).toBe(400);
    for (const extra of [
      { timezone: 'not-a-zone' },
      { endTime: '08:00' },
      { dates: ['2026-02-31'] },
      { schedule_mode: 'monthly' },
    ]) {
      expect(
        (
          await request('/events', 'POST', {
            ...input,
            ...extra,
          })
        ).status,
      ).toBe(400);
    }
    expect((await request('/events/not-an-id')).status).toBe(404);
  });
});

/** Group the one-year expiry and manual cleanup checks. */
describe('one-year expiry and manual cleanup', () => {
  /**
   * Make a fixture event expire without changing its creation date.
   * @returns A promise resolving to the UPDATE result rows, normally an empty list.
   */
  const expire = (id: string) =>
    query(
      "UPDATE events SET expires_at=now()-interval '1 second' WHERE id=$1",
      [id],
    );

  /**
   * Make a fixture old enough for cleanup as well as expired.
   * @returns The UPDATE result after setting fixture creation and expiry into the past.
   */
  const age = (id: string) =>
    query(
      "UPDATE events SET created_at=now()-interval '1 year'-interval '1 second',expires_at=now()-interval '1 second' WHERE id=$1",
      [id],
    );

  /**
   * Stores a fixed calendar-year expiry in UTC that responses never
   * extend.
   */
  it('stores a fixed calendar-year expiry in UTC that responses never extend', async () => {
    const created = await create();
    const before = await get(created.id);
    expect(
      (
        await query<{ correct: boolean }>(
          `SELECT expires_at=(((created_at AT TIME ZONE 'UTC')+interval '1 year') AT TIME ZONE 'UTC') AS correct FROM events WHERE id=$1`,
          [created.id],
        )
      )[0].correct,
    ).toBe(true);
    await respond(created.id, []);
    expect((await get(created.id)).expires_at).toBe(before.expires_at);
    expect(
      (
        await query<{ day: string }>(
          `SELECT to_char(TIMESTAMP '2028-02-29 12:00'+interval '1 year','YYYY-MM-DD') AS day`,
        )
      )[0].day,
    ).toBe('2029-02-28');
  });
  /**
   * Blocks expired event reads and shared writes before any manual cleanup
   * is run.
   */
  it('blocks expired event reads and shared writes before any manual cleanup is run', async () => {
    const created = await create();
    const person = await respond(created.id, []);
    await expire(created.id);
    for (const [path, method, data, token] of [
      [
        `/events/${created.id}`,
        'GET',
        undefined,
        undefined,
      ],
      [
        `/events/${created.id}?response_id=${person.id}`,
        'GET',
        undefined,
        undefined,
      ],
      [
        `/events/${created.id}/responses`,
        'POST',
        {
          name: 'New',
          timezone: 'UTC',
          ranges: [],
        },
        undefined,
      ],
      [
        `/events/${created.id}/responses/${person.id}`,
        'PUT',
        {
          name: 'Sam',
          timezone: 'UTC',
          revision: 1,
          ranges: [],
        },
        undefined,
      ],
    ] as const) {
      expect((await request(path, method, data, token)).status).toBe(410);
    }
    expect(
      await query('SELECT id FROM responses WHERE event_id=$1', [created.id]),
    ).toHaveLength(1);
    await expect(
      query(
        `INSERT INTO responses(id,event_id,name,timezone,edit_hash) VALUES(gen_random_uuid(),$1,'Late','UTC','test')`,
        [created.id],
      ),
    ).rejects.toMatchObject({ code: 'WK001' });
  });
  /** Catches an event expiring after validation and before the write. */
  it('catches an event expiring after validation and before the write', async () => {
    const created = await create();
    const person = await respond(created.id, []);
    const racing = createApp(
      /* Supply a database wrapper that introduces an expiry race during a write. */
      () => ({
        /**
         * Expire the event immediately before the write gate runs.
         * @returns A promise resolving to SQL result rows from the fixture database.
         */
        query: async <T>(sql: string, params: unknown[] = []) => {
          if (sql.includes('WITH gate AS')) {
            await expire(created.id);
          }
          return query<T>(sql, params);
        },
      }),
    );
    const result = await racing.request(
      `http://localhost/api/events/${created.id}/responses/${person.id}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Sam',
          timezone: 'UTC',
          revision: 1,
          ranges: [],
        }),
      },
      {},
    );
    expect(result.status).toBe(410);
    expect(
      (
        await query<{ revision: number }>(
          'SELECT revision FROM responses WHERE id=$1',
          [person.id],
        )
      )[0].revision,
    ).toBe(1);
  });
  /**
   * Manually deletes old events and all child data while preserving newer
   * events.
   */
  it('manually deletes old events and all child data while preserving newer events', async () => {
    const old = await create();
    const young = await create();
    const misconfigured = await create();
    const oldPerson = await respond(old.id, (await get(old.id)).windows);
    await respond(young.id, (await get(young.id)).windows);
    await age(old.id);
    await expire(misconfigured.id);
    expect(await (await EventCleanup.load(query)).run()).toEqual({
      deletedEvents: 1,
    });
    for (const table of [
      'events',
      'event_windows',
      'responses',
    ]) {
      expect(
        await query(
          `SELECT id FROM ${table} WHERE ${table === 'events' ? 'id' : 'event_id'}=$1`,
          [old.id],
        ),
      ).toEqual([]);
    }
    expect(
      await query('SELECT id FROM availability WHERE response_id=$1', [
        oldPerson.id,
      ]),
    ).toEqual([]);
    expect((await get(young.id)).response_count).toBe(1);
    expect(
      await query('SELECT id FROM events WHERE id=$1', [misconfigured.id]),
    ).toHaveLength(1);
    expect(await (await EventCleanup.load(query)).run()).toEqual({
      deletedEvents: 0,
    });
    expect((await request('/events/' + old.id)).status).toBe(404);
  });
  /** Uses creation age even with an incorrect future expiry. */
  it('uses creation age even with an incorrect future expiry', async () => {
    const old = await create();
    await query(
      "UPDATE events SET created_at=now()-interval '1 year'-interval '1 second',expires_at=now()+interval '1 year' WHERE id=$1",
      [old.id],
    );
    expect(await (await EventCleanup.load(query)).run()).toEqual({
      deletedEvents: 1,
    });
  });
  /** Cleans the complete backlog across multiple bounded batches. */
  it('cleans the complete backlog across multiple bounded batches', async () => {
    await query(
      `INSERT INTO events(id,title,organizer_name,timezone,created_at,expires_at) SELECT gen_random_uuid(),'Old','','UTC',now()-interval '1 year'-interval '1 second',now()-interval '1 second' FROM generate_series(1,205)`,
    );
    expect(await (await EventCleanup.load(query)).run()).toEqual({
      deletedEvents: 205,
    });
  });
});
/** Group the deleting a shared response checks. */
describe('deleting a shared response', () => {
  /**
   * Removes only the selected response and its availability, then
   * recalculates shared times.
   */
  it('removes only the selected response and its availability, then recalculates shared times', async () => {
    const created = await create();
    const event = await get(created.id);
    const alice = await respond(created.id, event.windows, 'Alice');
    const bob = await respond(created.id, [], 'Bob');
    expect((await get(created.id)).candidates).toEqual([]);
    expect(
      (
        await request(
          '/events/' + created.id + '/responses/' + bob.id,
          'DELETE',
          { revision: 1 },
        )
      ).status,
    ).toBe(200);
    expect(
      (await get(created.id)).responses.map(
        /* Collect the remaining responder ids after fixture deletion. */
        (r) => r.id,
      ),
    ).toEqual([alice.id]);
    expect((await get(created.id)).candidates).toHaveLength(1);
    expect(
      (
        await request(
          '/events/' + created.id + '/responses/' + alice.id,
          'DELETE',
          { revision: 1 },
        )
      ).status,
    ).toBe(200);
    expect(
      await query('SELECT id FROM availability WHERE response_id=$1', [
        alice.id,
      ]),
    ).toEqual([]);
    expect((await get(created.id)).responses).toEqual([]);
    expect((await get(created.id)).windows).toEqual(event.windows);
    expect((await get(created.id)).candidates).toEqual([]);
    expect(
      (
        await request(
          '/events/' + created.id + '/responses/' + alice.id,
          'PUT',
          {
            name: 'Alice',
            timezone: 'UTC',
            revision: 1,
            ranges: [],
          },
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await request(
          '/events/' + created.id + '/responses/' + alice.id,
          'DELETE',
          { revision: 1 },
        )
      ).status,
    ).toBe(404);
    await respond(created.id, event.windows, 'New response');
    expect((await get(created.id)).response_count).toBe(1);
  });
  /**
   * Rejects stale confirmations, wrong-event targets, and invalid
   * revisions.
   */
  it('rejects stale confirmations, wrong-event targets, and invalid revisions', async () => {
    const first = await create();
    const second = await create();
    const person = await respond(first.id, []);
    const path = '/events/' + first.id + '/responses/' + person.id;
    expect(
      (
        await request(
          '/events/' + second.id + '/responses/' + person.id,
          'DELETE',
          { revision: 1 },
        )
      ).status,
    ).toBe(404);
    expect((await request(path, 'DELETE', { revision: 0 })).status).toBe(400);
    expect(
      (
        await request(path, 'DELETE', {
          revision: 1,
          schedule_revision: 99,
        })
      ).status,
    ).toBe(409);
    expect(
      (
        await request(path, 'PUT', {
          name: 'Changed',
          timezone: 'UTC',
          revision: 1,
          ranges: [],
        })
      ).status,
    ).toBe(200);
    expect((await request(path, 'DELETE', { revision: 1 })).status).toBe(409);
    expect((await get(first.id)).responses[0].revision).toBe(2);
    expect((await request(path, 'DELETE', { revision: 2 })).status).toBe(200);
  });
  /**
   * Rejects cross-origin deletion and expiry, including expiry racing the
   * write.
   */
  it('rejects cross-origin deletion and expiry, including expiry racing the write', async () => {
    const created = await create();
    const person = await respond(created.id, []);
    const path = '/events/' + created.id + '/responses/' + person.id;
    expect(
      (
        await app.request(
          'http://localhost/api' + path,
          {
            method: 'DELETE',
            headers: {
              Origin: 'https://elsewhere.example',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ revision: 1 }),
          },
          {},
        )
      ).status,
    ).toBe(403);
    const racing = createApp(
      /* Wrap fixture queries to simulate expiry between validation and deletion. */
      () => ({
        /**
         * Expire the event just before its guarded write executes.
         * @returns A promise resolving to SQL result rows from the fixture database.
         */
        query: async <T>(sql: string, params: unknown[] = []) => {
          if (sql.includes('WITH gate AS')) {
            await query(
              "UPDATE events SET expires_at=now()-interval '1 second' WHERE id=$1",
              [created.id],
            );
          }
          return query<T>(sql, params);
        },
      }),
    );
    expect(
      (
        await racing.request(
          'http://localhost/api' + path,
          {
            method: 'DELETE',
            body: JSON.stringify({ revision: 1 }),
            headers: { 'Content-Type': 'application/json' },
          },
          {},
        )
      ).status,
    ).toBe(410);
    expect(
      await query('SELECT id FROM responses WHERE id=$1', [person.id]),
    ).toHaveLength(1);
    expect((await request(path, 'DELETE', { revision: 1 })).status).toBe(410);
  });
});
