import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { sqlStatements } from '../scripts/sql-statements.mjs';
import EventLimits from '../src/components/EventLimits';
import { setLanguage, t } from '../src/lib/i18n';

afterEach(() => setLanguage('en'));
describe('event expiry notice', () => {
  it('shows only the one-year notice in all three languages', () => {
    for (const language of ['en', 'zh', 'es'] as const) {
      setLanguage(language);
      const html = renderToStaticMarkup(<EventLimits/>);
      expect(html).toContain(t('Links expire in 1 year'));
      expect(html).not.toMatch(/1,000|participants|1 month/);
    }
  });
});

describe('SQL migration statements', () => {
  it('preserves function bodies, escaped quotes, dollar tags, and nested comments', () => {
    const statements = sqlStatements(`-- a comment;\nSELECT 'it''s; quoted', "a;name";
      /* outer; /* nested; */ */ CREATE FUNCTION example() RETURNS text LANGUAGE plpgsql AS $body$
      BEGIN RETURN 'a;b'; END; $body$;
      SELECT $$another;value$$; -- end`);
    expect(statements).toHaveLength(3);
    expect(statements[1]).toContain("BEGIN RETURN 'a;b'; END; $body$");
    expect(statements[2]).toBe('SELECT $$another;value$$');
  });
  it('fails on an incomplete function rather than sending partial migrations', () => {
    expect(() => sqlStatements('SELECT $$unfinished;')).toThrow('Unterminated SQL');
  });
  it('keeps the capacity trigger and cleanup function intact in the migration', async () => {
    const migration = await readFile(new URL('../migrations/006_event_lifetime.sql', import.meta.url), 'utf8');
    const statements = sqlStatements(migration);
    expect(statements).toHaveLength(9);
    expect(statements.find(s => s.includes('CREATE FUNCTION check_response_limit'))).toContain("ERRCODE = 'WK002'");
    expect(statements.find(s => s.includes('CREATE FUNCTION purge_expired_events'))).toContain('FOR UPDATE SKIP LOCKED');
  });
});
