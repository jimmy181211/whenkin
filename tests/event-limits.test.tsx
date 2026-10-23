import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { sqlStatements } from '../scripts/sql-statements.mjs';
import EventLimits from '../src/components/EventLimits';
import { isEventFull } from '../src/lib/event-limits';
import { setLanguage, t } from '../src/lib/i18n';

afterEach(() => setLanguage('en'));
describe('event limit notices', () => {
  it('explains both limits in all three languages', () => {
    for (const language of ['en', 'zh', 'es'] as const) {
      setLanguage(language);
      const html = renderToStaticMarkup(<EventLimits/>);
      expect(html).toContain(t('Links expire in 1 month'));
      expect(html).toContain(t('Max. {count} participants', { count: 1000 }));
    }
  });
  it('shows the fixed expiry date in the selected time zone', () => {
    const expiresAt = '2026-11-23T01:00:00Z';
    expect(renderToStaticMarkup(<EventLimits expiresAt={expiresAt} timezone="America/Los_Angeles"/>)).toContain('Nov 22, 2026');
    expect(renderToStaticMarkup(<EventLimits expiresAt={expiresAt} timezone="Asia/Shanghai"/>)).toContain('Nov 23, 2026');
  });
  it('blocks new participants at capacity but leaves existing participants able to edit', () => {
    expect(isEventFull(999, false)).toBe(false);
    expect(isEventFull(1000, false)).toBe(true);
    expect(isEventFull(1000, true)).toBe(false);
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
