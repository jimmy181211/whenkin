import {
  afterAll,
  beforeAll,
  expect,
  it,
  vi,
} from 'vitest';
import {
  readFile,
  readdir,
} from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { renderToStaticMarkup } from 'react-dom/server';
import { createApp } from '../App/backend/app';
import { testClient } from './test-client';
import {
  allSlots,
  slotDuration,
  slotsToRanges,
} from '../App/shared/time';
import { gridModel } from '../App/frontend/utils/time';
import { projectWeekly } from '../App/shared/weekly';
import {
  groupAvailability,
  inspectAvailability,
} from '../App/frontend/utils/group-availability';
import TimeRangePicker from '../App/frontend/components/TimeRangePicker';
import AvailabilityGrid from '../App/frontend/components/AvailabilityGrid';
import type { MeetingEvent } from '../App/shared/types';

const pg = new PGlite();
const legacyEventId = crypto.randomUUID();
const legacyResponseId = crypto.randomUUID();
const legacyRange = {
  start: '2030-01-15T09:15:00.000Z',
  end: '2030-01-15T09:30:00.000Z',
};
const app = testClient(
  createApp(
    {
      /** @returns Rows from an isolated migration/HTTP test database. */
      async query<T>(sql: string, params: unknown[] = []) {
        return (await pg.query<T>(sql, params)).rows;
      },
    },
    { rateLimit: false },
  ),
);

/** Apply the old schema, seed a real quarter-hour reply, then upgrade it. */
beforeAll(async () => {
  const directory = new URL('../App/backend/db/migrations/', import.meta.url);
  const files = (await readdir(directory)).filter((name) => name.endsWith('.sql')).sort();
  for (const file of files.filter((name) => !name.startsWith('010_'))) {
    await pg.exec(await readFile(new URL(file, directory), 'utf8'));
  }
  await pg.query(
    "INSERT INTO events(id,title,organizer_name,timezone) VALUES($1,'Legacy','','UTC')",
    [legacyEventId],
  );
  await pg.query('INSERT INTO event_windows(event_id,starts_at,ends_at) VALUES($1,$2,$3)', [
    legacyEventId,
    legacyRange.start,
    '2030-01-15T10:15Z',
  ]);
  await pg.query(
    `INSERT INTO responses(id , event_id , name , timezone , edit_hash) VALUES($1 , $2 ,
  'Legacy person' , 'UTC' , '' )`,
    [
      legacyResponseId,
      legacyEventId,
    ],
  );
  await pg.query('INSERT INTO availability(response_id,starts_at,ends_at) VALUES($1,$2,$3)', [
    legacyResponseId,
    legacyRange.start,
    legacyRange.end,
  ]);
  await pg.exec(await readFile(new URL('010_event_slot_minutes.sql', directory), 'utf8'));
}, 30000);

/** Release the isolated database after HTTP and migration checks. */
afterAll(async () => {
  await pg.close();
});

/** @returns The real API response; payloads are encoded as JSON. */
function request(path: string, method = 'GET', data?: unknown) {
  return app.request('http://localhost/api' + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
}

/** @returns A freshly created half-hour event, including the server's slot metadata. */
async function create(extra = {}) {
  const response = await request('/events', 'POST', {
    title: 'Half-hour event',
    timezone: 'UTC',
    dates: ['2030-01-15'],
    startTime: '09:00',
    endTime: '10:00',
    ...extra,
  });
  expect(response.status).toBe(201);
  const { id } = (await response.json()) as { id: string };
  return (await (await request('/events/' + id)).json()) as MeetingEvent;
}

/** A migration must not round, lengthen, or drop any previously saved range. */
it(
  'preserves legacy windows and quarter-hour replies through upgrade, ' + 'display, and save',
  async () => {
    const event = (await (await request('/events/' + legacyEventId)).json()) as MeetingEvent;
    expect(event.slot_minutes).toBe(15);
    expect(new Date(event.windows[0].start).toISOString()).toBe(legacyRange.start);
    expect(new Date(event.windows[0].end).toISOString()).toBe('2030-01-15T10:15:00.000Z');
    const ranges = event.responses[0].ranges;
    expect(slotsToRanges(allSlots(ranges, slotDuration(event)), slotDuration(event))).toEqual([
      legacyRange,
    ]);
    expect(gridModel(event, 'UTC').days[0][1]).toHaveLength(4);
    const response = await request(`/events/${event.id}/responses/${legacyResponseId}`, 'PUT', {
      name: 'Legacy person',
      timezone: 'UTC',
      revision: event.responses[0].revision,
      ranges,
    });
    expect(response.status).toBe(200);
    const saved = (await (await request('/events/' + event.id)).json()) as MeetingEvent;
    expect(saved.responses[0].ranges).toEqual(ranges);
  },
);

/** The server, not a client field, selects the granularity of newly created events. */
it('creates only half-hour events and rejects quarter-hour clock choices', async () => {
  expect((await create({ slot_minutes: 15 })).slot_minutes).toBe(30);
  for (const clock of [
    { startTime: '09:15' },
    { endTime: '09:45' },
  ]) {
    const response = await request('/events', 'POST', {
      title: 'Invalid clock',
      timezone: 'UTC',
      dates: ['2030-01-15'],
      startTime: '09:00',
      endTime: '10:00',
      ...clock,
    });
    expect(response.status).toBe(400);
  }
});

/** New replies reject both short ranges and full-length ranges starting off the event grid. */
it('enforces half-hour boundaries on both response creation and editing', async () => {
  const event = await create();
  const base = `/events/${event.id}/responses`;
  const reply = {
    name: 'New person',
    timezone: 'UTC',
  };
  const partial = [
    {
      start: '2030-01-15T09:00Z',
      end: '2030-01-15T09:15Z',
    },
  ];
  const shifted = [
    {
      start: '2030-01-15T09:15Z',
      end: '2030-01-15T09:45Z',
    },
  ];
  const complete = [
    {
      start: '2030-01-15T09:00Z',
      end: '2030-01-15T09:30Z',
    },
  ];
  for (const ranges of [
    partial,
    shifted,
  ]) {
    expect(
      (
        await request(base, 'POST', {
          ...reply,
          ranges,
        })
      ).status,
    ).toBe(400);
  }
  const response = await request(base, 'POST', {
    ...reply,
    ranges: complete,
  });
  expect(response.status).toBe(201);
  const saved = (await response.json()) as {
    id: string;
    revision: number;
  };
  expect(
    (
      await request(base + '/' + saved.id, 'PUT', {
        ...reply,
        revision: saved.revision,
        ranges: partial,
      })
    ).status,
  ).toBe(400);
  const snapshot = (await (await request('/events/' + event.id)).json()) as MeetingEvent;
  expect(snapshot.responses).toHaveLength(1);
  expect(new Date(snapshot.responses[0].ranges[0].end).toISOString()).toBe(
    '2030-01-15T09:30:00.000Z',
  );
  const duration = slotDuration(snapshot);
  const stamps = allSlots(snapshot.responses[0].ranges, duration);
  expect(stamps).toHaveLength(1);
  expect(groupAvailability(snapshot.responses, duration).get(stamps[0])).toBe(1);
  expect(inspectAvailability(snapshot.responses, stamps, duration).available).toHaveLength(1);
});

/** Thirty-minute blocks remain whole and reversible when the viewer's zone is offset by :45. */
it('keeps new weekly half-hour selections intact across quarter-hour-offset zones', () => {
  const event = {
    slot_minutes: 30 as const,
    timezone: 'UTC',
    created_at: '2026-11-20T12:00Z',
    windows: [
      {
        start: '2000-01-03T09:00Z',
        end: '2000-01-03T10:00Z',
      },
    ],
  };
  const duration = slotDuration(event);
  const projection = projectWeekly(event, 'Asia/Kathmandu');
  const grid = gridModel(
    {
      ...event,
      windows: projection.windows,
    },
    'UTC',
  );
  const cells = grid.days[0][1];
  expect(cells).toHaveLength(2);
  expect(cells.map((cell) => cell.minute)).toEqual([
    885,
    915,
  ]);
  expect(grid.rows.some((row) => row.minute === 885)).toBe(true);
  const stored = cells.map((cell) => projection.toCanonical(cell.stamp));
  expect(stored).toEqual(allSlots(event.windows, duration));
  expect(slotsToRanges(stored, duration)).toEqual([
    {
      start: '2000-01-03T09:00:00.000Z',
      end: '2000-01-03T10:00:00.000Z',
    },
  ]);
});

/** End-of-day midnight remains available, but quarter-hour choices disappear. */
it('renders only half-hour choices in the new-event time picker', () => {
  const html = renderToStaticMarkup(
    <TimeRangePicker start="09:00" end="18:00" onStartChange={() => {}} onEndChange={() => {}} />,
  );
  expect(html.match(/<option /g)).toHaveLength(96);
  expect(html).toContain('value="24:00"');
  expect(html).not.toMatch(/value="\d{2}:(15|45)"/);
});

/** The displayed group blocks must use the new event's slot size, not legacy quarters. */
it('renders whole new-event blocks with matching group counts and range labels', async () => {
  const event = await create();
  const response = await request(`/events/${event.id}/responses`, 'POST', {
    name: 'Whole block',
    timezone: 'UTC',
    ranges: [
      {
        start: '2030-01-15T09:00Z',
        end: '2030-01-15T09:30Z',
      },
    ],
  });
  expect(response.status).toBe(201);
  const saved = (await (await request('/events/' + event.id)).json()) as MeetingEvent;
  vi.stubGlobal('window', { innerWidth: 390 });
  try {
    const html = renderToStaticMarkup(
      <AvailabilityGrid
        event={saved}
        zone="UTC"
        view="group"
        selected={new Set()}
        onChange={() => {}}
      />,
    );
    expect(html.match(/data-stamp=/g)).toHaveLength(2);
    expect(html).toContain('1 of 1 available');
    expect(html).toContain('9:00 AM–9:30 AM');
    expect(html).not.toContain('Partly available');
    expect(html).not.toContain('selection-guide');
  } finally {
    vi.unstubAllGlobals();
  }
});
