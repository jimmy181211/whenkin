import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from 'vitest';
import {
  readFile,
  readdir,
} from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { commonGround } from '../App/backend/shared/common-ground';
import { analyzeSnapshot } from '../App/backend/tools/analyze-events.js';
import { slotsToRanges } from '../App/frontend/utils/time';
const pg = new PGlite();

/**
 * Return fixture-query rows through the same interface as the application
 * database.
 * @returns A promise resolving to fixture-query rows, or rejecting on a database error.
 */
const query = async (sql: string, p: unknown[] = []) => (await pg.query(sql, p)).rows;

beforeAll(
  /* Apply migrations before this suite uses its isolated fixture database. */
  async () => {
    for (const name of (await readdir(new URL('../App/backend/db/migrations/', import.meta.url)))
      .filter(
        /* Select SQL migrations for the analytics fixture database. */
        (n) => n.endsWith('.sql'),
      )
      .sort()) {
      await pg.exec(
        await readFile(new URL('../App/backend/db/migrations/' + name, import.meta.url), 'utf8'),
      );
    }
  },
  30000,
);
afterAll(
  /* Close the fixture database after this suite finishes. */
  async () => {
    await pg.close();
  },
);
/** Group the read-only analytics checks. */
describe('read-only analytics', () => {
  /**
   * Reconciles anonymous SQL metrics with the app intersection across
   * empty, partial, overlapping and disjoint data.
   */
  it(
    'reconciles anonymous SQL metrics with the app intersection across ' +
      'empty, partial, overlapping and disjoint data',
    async () => {
      const base = Date.parse('2027-01-15T09:00Z');
      let seed = 42;

      /** Generate repeatable pseudo-random availability from the fixed test seed. */
      const random = () => (seed = (seed * 1664525 + 1013904223) >>> 0) % 5 > 1;

      const expected = [];
      let availableTotal = 0;
      for (let i = 0; i < 16; i++) {
        const rows = await query(
          `INSERT INTO events(id , title , organizer_name , timezone , created_at , schedule_mode)
  VALUES(gen_random_uuid() , 'Test' , '' , 'UTC' , '2026-11-01T00:00Z'
  ::timestamptz+$1*interval '1 day' , $2) RETURNING id`,
          [
            i,
            i === 0 ? 'weekdays' : 'dates',
          ],
        );
        const id = (rows[0] as { id: string }).id;
        const windows = [
          {
            start: new Date(base).toISOString(),
            end: new Date(base + 90 * 60000).toISOString(),
          },
          {
            start: new Date(base + 60 * 60000).toISOString(),
            end: new Date(base + 120 * 60000).toISOString(),
          },
        ];
        for (const w of windows) {
          await query('INSERT INTO event_windows(event_id,starts_at,ends_at) VALUES($1,$2,$3)', [
            id,
            w.start,
            w.end,
          ]);
        }
        const people = [];
        for (let n = 0; n < i % 4; n++) {
          const r = (
            await query(
              `INSERT INTO responses(id , event_id , name , timezone , edit_hash)
  VALUES(gen_random_uuid() , $1 , 'Test' , 'UTC' , '' ) RETURNING id`,
              [id],
            )
          )[0] as { id: string };
          const ranges = slotsToRanges(
            Array.from(
              { length: 8 },
              /* Enumerate the fixture's eight possible slot positions. */
              (_, j) => j,
            )
              .filter(
                /* Keep a repeatable random subset of those fixture slots. */
                () => random(),
              )
              .map(
                /* Convert fixture slot positions to 15-minute start timestamps. */
                (j) => base + j * 900000,
              ),
          );
          // Duplicate availability must count one responder only.
          for (const a of [
            ...ranges,
            ...ranges.slice(0, 1),
          ]) {
            await query(
              'INSERT INTO availability(response_id,starts_at,ends_at) VALUES($1,$2,$3)',
              [
                r.id,
                a.start,
                a.end,
              ],
            );
          }
          people.push({
            id: r.id,
            name: 'Test',
            timezone: 'UTC',
            revision: 1,
            ranges,
          });
          availableTotal += ranges.reduce(
            /** Sum offered range lengths in minutes for the expected analytics result. */
            (sum, r) => sum + (Date.parse(r.end) - Date.parse(r.start)) / 60000,
            0,
          );
        }
        const shared = commonGround(windows, people);
        expected.push({
          response_count: people.length,
          shared_period_count: shared.length,
          shared_minutes: people.length
            ? shared.reduce(
              /** Sum shared free-time lengths in minutes. */
              (n, r) => n + (Date.parse(r.end) - Date.parse(r.start)) / 60000,
              0,
            )
            : null,
          longest_shared_minutes: people.length
            ? Math.max(
              0,
              ...shared.map(
                /**
                   * Calculate individual shared-period lengths for the longest-period
                   * assertion.
                   */
                (r) => (Date.parse(r.end) - Date.parse(r.start)) / 60000,
              ),
            )
            : null,
        });
      }
      const sql = await readFile(
        new URL('../App/backend/tools/analytics-extract.sql', import.meta.url),
        'utf8',
      );
      const snapshot = (await query(sql))[0] as {
        snapshot: {
          events: Record<string, unknown>[];
          source_counts: {
            events: number;
            responses: number;
          };
        };
      };
      expect(snapshot.snapshot.events).toHaveLength(16);
      for (let i = 0; i < 16; i++) {
        expect(snapshot.snapshot.events[i]).toMatchObject({
          ...expected[i],
          offered_minutes: 120,
          first_response_hours: null,
          creator_identity: null,
          actual_location: null,
        });
        if (i === 0) {
          expect(snapshot.snapshot.events[i].lead_days).toBeNull();
        }
      }
      const result = analyzeSnapshot(snapshot.snapshot);
      expect(result.summary.events).toBe(16);
      expect(result.summary.excluded_events).toBe(0);
      expect(result.summary.missing.first_response_hours).toBe(16);
      expect(JSON.stringify(snapshot.snapshot)).not.toMatch(
        /"name"|"title"|"ranges"|"starts_at"|"response_id"|"event_id"/,
      );
      const hist = (
        snapshot.snapshot as unknown as {
          availability_histogram: {
            topic: string;
            time_frame: string;
            available_minutes: number;
            offered_minutes: number;
          }[];
        }
      ).availability_histogram;
      for (const frame of [
        'event_local',
        'responder_local',
      ]) {
        const all = hist.filter(
          /** Select the aggregate histogram for the schedule frame being checked. */
          (h) => h.topic === 'all' && h.time_frame === frame,
        );
        expect(
          all.reduce(
            /* Total the offered minutes represented by the histogram. */
            (sum, h) => sum + h.offered_minutes,
            0,
          ),
        ).toBe(2880);
        expect(
          all.reduce(
            /* Total the available minutes represented by the histogram. */
            (sum, h) => sum + h.available_minutes,
            0,
          ),
        ).toBe(availableTotal);
      }
    },
  );
  /**
   * Retains extreme values and distinguishes unknown results from measured
   * zero.
   */
  it('retains extreme values and distinguishes unknown results from measured zero', () => {
    const events = [
      0,
      1,
      2,
      3,
      10000,
    ].map(
      /* Build fixtures with missing values and an extreme reply count for review flags. */
      (n, i) => ({
        event_code: 'E' + i,
        response_count: n,
        shared_minutes: i ? 0 : null,
        first_response_hours: null,
        lead_days: i === 0 ? null : -10,
      }),
    );
    const result = analyzeSnapshot({ events });
    expect(result.events).toHaveLength(5);
    expect(result.summary.excluded_events).toBe(0);
    expect(result.events[4].response_count).toBe(10000);
    expect(result.events[4].review_flags.length).toBeGreaterThan(0);
    expect(result.events[0].shared_minutes).toBeNull();
    expect(result.events[1].shared_minutes).toBe(0);
    expect(result.summary.missing.shared_minutes).toBe(1);
  });
});
