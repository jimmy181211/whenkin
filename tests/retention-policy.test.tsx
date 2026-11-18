import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import {
  readFile,
  readdir,
} from 'node:fs/promises';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  EventCleanup,
  cleanupOptions,
} from '../App/backend/tools/cleanup.js';
import { parseRetentionPolicy } from '../App/shared/retention.js';
import { createApp } from '../App/backend/app';
import { testClient } from './test-client';
import EventLimits from '../App/frontend/components/EventLimits';
import { setLanguage } from '../App/frontend/i18n/index';

const pg = new PGlite();

/**
 * Return retention fixture query rows through the application interface.
 * @returns Fixture-query rows, or a rejected promise when the SQL fails.
 */
const query = async <T,>(sql: string, params: unknown[] = []) =>
  (await pg.query<T>(sql, params)).rows;

const app = testClient(createApp({ query }, { rateLimit: false }));
beforeAll(
  /* Apply migrations before this suite uses its isolated fixture database. */
  async () => {
    for (const name of (await readdir('App/backend/db/migrations')).sort()) {
      await pg.exec(
        await readFile('App/backend/db/migrations/' + name, 'utf8'),
      );
    }
  },
  30000,
);
beforeEach(
  /* Clear event fixtures so each test starts without another test's data. */
  async () => {
    await pg.exec('TRUNCATE events CASCADE');
    await query('SELECT * FROM set_event_retention_months(12)');
  },
);
afterEach(
  /* Restore English after localized retention-policy checks. */
  () => setLanguage('en'),
);
afterAll(
  /* Close the fixture database after this suite finishes. */
  async () => {
    await pg.close();
  },
);

/**
 * Group the administrator-controlled retention in calendar months
 * checks.
 */
describe('administrator-controlled retention in calendar months', () => {
  /**
   * Parses maintenance options without mistaking a misspelled dry run for
   * permission to delete.
   */
  it('parses maintenance options without mistaking a misspelled dry run for permission to delete', () => {
    expect(cleanupOptions([])).toEqual({
      months: undefined,
      dryRun: false,
    });
    expect(cleanupOptions([
      '--months',
      '2',
      '--dry-run',
    ])).toEqual({
      months: 2,
      dryRun: true,
    });
    for (const args of [
      ['--dry-run=true'],
      ['--dryrun'],
      ['--months'],
      [
        '--months',
        '2.5',
      ],
      [
        '--months',
        '0',
      ],
      [
        '--months',
        '2',
        '--months',
        '3',
      ],
    ]) {
      expect(
        /* Parse invalid cleanup arguments so their errors can be asserted. */
        () => cleanupOptions(args),
      ).toThrow();
    }
  });
  /** Defaults to 12 months without constructor database side effects. */
  it('defaults to 12 months without constructor database side effects', () => {
    const execute = vi.fn();
    expect(new EventCleanup(execute).getTime()).toBe(12);
    expect(new EventCleanup(execute, 2).getTime()).toBe(2);
    expect(execute).not.toHaveBeenCalled();
    for (const value of [
      0,
      -1,
      1.5,
      NaN,
      Infinity,
      1201,
      '2',
      null,
    ]) {
      expect(
        /* Construct cleanup with an invalid duration to verify validation happens early. */
        () => new EventCleanup(execute, value as number),
      ).toThrow();
    }
  });
  /**
   * Persists setter changes, updates existing deadlines, and supplies
   * future event defaults.
   */
  it('persists setter changes, updates existing deadlines, and supplies future event defaults', async () => {
    const cleaner = new EventCleanup(query);

    /**
     * Insert one event fixture for retention-deadline comparisons.
     * @returns A promise resolving to the single inserted fixture event id in a result row.
     */
    const insert = () =>
      query<{ id: string }>(
        "INSERT INTO events(id,title,organizer_name,timezone) VALUES(gen_random_uuid(),'Fixture','','UTC') RETURNING id",
      );

    await insert();
    await cleaner.setTime(2);
    await insert();
    expect(cleaner.getTime()).toBe(2);
    expect((await EventCleanup.load(query)).getTime()).toBe(2);
    const rows = await query<{ matches: boolean }>(
      'SELECT expires_at=event_retention_deadline(created_at,2) AS matches FROM events',
    );
    expect(rows).toHaveLength(2);
    expect(
      rows.every(
        /* Confirm every stored expiry matches the expected database deadline. */
        (row) => row.matches,
      ),
    ).toBe(true);
    await expect(cleaner.setTime(0)).rejects.toThrow();
    expect(cleaner.getTime()).toBe(2);
    expect(await query('SELECT * FROM get_event_retention_policy()')).toEqual([
      {
        value: 2,
        unit: 'month',
      },
    ]);
    await expect(
      query('SELECT * FROM set_event_retention_months(-1)'),
    ).rejects.toMatchObject({ code: '22023' });
  });
  /**
   * Keeps a proposed dry run read-only and applies the duration before
   * explicit manual deletion.
   */
  it('keeps a proposed dry run read-only and applies the duration before explicit manual deletion', async () => {
    await query(
      "INSERT INTO events(id,title,organizer_name,timezone,created_at) VALUES(gen_random_uuid(),'Old','','UTC',now()-interval '3 months'),(gen_random_uuid(),'Young','','UTC',now()-interval '1 month')",
    );
    const cleaner = new EventCleanup(query, 2);
    expect(await cleaner.dryRun()).toEqual({
      months: 2,
      eligibleEvents: 1,
    });
    expect((await EventCleanup.load(query)).getTime()).toBe(12);
    expect(await cleaner.run()).toEqual({ deletedEvents: 1 });
    expect(await query('SELECT title FROM events')).toEqual([
      { title: 'Young' },
    ]);
    expect((await EventCleanup.load(query)).getTime()).toBe(2);
    expect(await cleaner.run()).toEqual({ deletedEvents: 0 });
  });
  /** Uses calendar month-end and leap-year arithmetic in UTC. */
  it('uses calendar month-end and leap-year arithmetic in UTC', async () => {
    const rows = await query<{ month_end: string;
      leap: string }>(
      "SELECT (event_retention_deadline('2027-01-31T12:00Z',1) AT TIME ZONE 'UTC')::text AS month_end,(event_retention_deadline('2028-02-29T12:00Z',12) AT TIME ZONE 'UTC')::text AS leap",
    );
    expect(rows[0].month_end).toContain('2027-02-28 12:00:00');
    expect(rows[0].leap).toContain('2029-02-28 12:00:00');
  });
  /** Exposes read-only public metadata and restricts the database setter. */
  it('exposes read-only public metadata and restricts the database setter', async () => {
    const response = await app.request('http://localhost/api/retention');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      value: 12,
      unit: 'month',
    });
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(
      (
        await app.request('http://localhost/api/retention', {
          method: 'PUT',
          body: '{}',
        })
      ).status,
    ).toBe(404);
    const rights = await query<{ count: number }>(
      "SELECT count(*)::integer AS count FROM pg_proc p CROSS JOIN LATERAL aclexplode(p.proacl) acl WHERE p.oid='set_event_retention_months(integer)'::regprocedure AND acl.grantee=0 AND acl.privilege_type='EXECUTE'",
    );
    expect(rights[0].count).toBe(0);
  });
  /** Returns immutable month metadata and rejects invalid units. */
  it('returns immutable month metadata and rejects invalid units', () => {
    expect(
      Object.isFrozen(
        parseRetentionPolicy({
          value: 2,
          unit: 'month',
        }),
      ),
    ).toBe(true);
    expect(
      /* Reject a policy using a year unit instead of the required month unit. */
      () =>
        parseRetentionPolicy({
          value: 1,
          unit: 'year',
        }),
    ).toThrow();
    expect(
      /* Reject a string month count instead of a validated number. */
      () =>
        parseRetentionPolicy({
          value: '2',
          unit: 'month',
        }),
    ).toThrow();
  });
  /**
   * Uses the same component for localized months, years, and
   * singular/plural units.
   */
  it('uses the same component for localized months, years, and singular/plural units', () => {
    const labels = {
      en: [
        '1 month',
        '2 months',
        '1 year',
        '2 years',
      ],
      zh: [
        '1 个月',
        '2 个月',
        '1 年',
        '2 年',
      ],
      es: [
        '1 mes',
        '2 meses',
        '1 año',
        '2 años',
      ],
      pt: [
        '1 mês',
        '2 meses',
        '1 ano',
        '2 anos',
      ],
      de: [
        '1 Monat',
        '2 Monate',
        '1 Jahr',
        '2 Jahre',
      ],
    };
    for (const language of [
      'en',
      'zh',
      'es',
      'pt',
      'de',
    ] as const) {
      setLanguage(language);
      [
        1,
        2,
        12,
        24,
      ].forEach(
        /* Check each month count against its expected localized expiry wording. */
        (value, index) =>
          expect(
            renderToStaticMarkup(
              <EventLimits
                policy={{
                  value,
                  unit: 'month',
                }}
              />,
            ),
          ).toContain(labels[language][index]),
      );
    }
    expect(renderToStaticMarkup(<EventLimits />)).not.toContain('1 year');
  });
});
