import { renderToStaticMarkup } from 'react-dom/server';
import {
  afterEach,
  describe,
  expect,
  it,
} from 'vitest';
import { readFile } from 'node:fs/promises';
import { sqlStatements } from '../App/backend/tools/sql-statements.js';
import EventLimits from '../App/frontend/components/EventLimits';
import {
  setLanguage,
  t,
} from '../App/frontend/i18n/index';
import { retentionDuration } from '../App/frontend/utils/retention-label';

afterEach(
  /* Restore English after event-expiry wording tests. */
  () => setLanguage('en'),
);
/** Group the event expiry notice checks. */
describe('event expiry notice', () => {
  /** Shows only the one-year notice in all three languages. */
  it('shows only the one-year notice in all three languages', () => {
    for (const language of [
      'en',
      'zh',
      'es',
    ] as const) {
      setLanguage(language);
      const html = renderToStaticMarkup(
        <EventLimits
          policy={{
            value: 12,
            unit: 'month',
          }}
        />,
      );
      expect(html).toContain(
        t('Links expire in {duration}', {
          duration: retentionDuration({
            value: 12,
            unit: 'month',
          }),
        }),
      );
      expect(html).not.toMatch(/1,000|participants|1 month/);
    }
  });
});

/** Group the SQL migration statements checks. */
describe('SQL migration statements', () => {
  /**
   * Preserves function bodies, escaped quotes, dollar tags, and nested
   * comments.
   */
  it('preserves function bodies, escaped quotes, dollar tags, and nested comments', () => {
    const statements =
      sqlStatements(`-- a comment;\nSELECT 'it''s; quoted', "a;name";
      /* outer; /* nested; */ */ CREATE FUNCTION example() RETURNS text LANGUAGE plpgsql AS $body$
      BEGIN RETURN 'a;b'; END; $body$;
      SELECT $$another;value$$; -- end`);
    expect(statements).toHaveLength(3);
    expect(statements[1]).toContain("BEGIN RETURN 'a;b'; END; $body$");
    expect(statements[2]).toBe('SELECT $$another;value$$');
  });
  /**
   * Fails on an incomplete function rather than sending partial
   * migrations.
   */
  it('fails on an incomplete function rather than sending partial migrations', () => {
    expect(
      /* Parse an unfinished dollar quote so its rejection can be asserted. */
      () => sqlStatements('SELECT $$unfinished;'),
    ).toThrow('Unterminated SQL');
  });
  /**
   * Keeps the capacity trigger and cleanup function intact in the
   * migration.
   */
  it('keeps the capacity trigger and cleanup function intact in the migration', async () => {
    const migration = await readFile(
      new URL(
        '../App/backend/db/migrations/006_event_lifetime.sql',
        import.meta.url,
      ),
      'utf8',
    );
    const statements = sqlStatements(migration);
    expect(statements).toHaveLength(9);
    expect(
      statements.find(
        /* Find the migration's response-limit function without splitting its body. */
        (s) => s.includes('CREATE FUNCTION check_response_limit'),
      ),
    ).toContain("ERRCODE = 'WK002'");
    expect(
      statements.find(
        /* Find the cleanup function in the parsed migration statements. */
        (s) => s.includes('CREATE FUNCTION purge_expired_events'),
      ),
    ).toContain('FOR UPDATE SKIP LOCKED');
  });
});
