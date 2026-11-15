import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { migrate } from '../App/backend/tools/migrate.mjs';

const pg = new PGlite();
const client = { query: async (sql: string, params: unknown[] = []) => {
  // PGlite is single-session; PostgreSQL session locks are exercised by the Docker check.
  if (sql.startsWith('SELECT pg_advisory_')) return { rows: [] };
  return pg.query(sql, params);
} };
let temporary: string;
beforeAll(async () => { temporary = await mkdtemp(join(tmpdir(), 'whenkin-migrations-')); });
afterAll(async () => { await pg.close(); await rm(temporary, { recursive: true }); });

describe('PostgreSQL migration runner', () => {
  it('applies all eight original migrations once and preserves checksums', async () => {
    await migrate(client, undefined, () => {});
    expect((await pg.query('SELECT name FROM schema_migrations')).rows).toHaveLength(8);
    await pg.query("INSERT INTO events(id,title,organizer_name,timezone) VALUES(gen_random_uuid(),'Retained','','UTC')");
    await migrate(client, undefined, () => {});
    expect((await pg.query('SELECT title FROM events')).rows).toEqual([{ title: 'Retained' }]);
    expect((await pg.query('SELECT name FROM schema_migrations')).rows).toHaveLength(8);
  });
  it('rolls back failed schema changes together with their migration record', async () => {
    await writeFile(join(temporary, '009_failure.sql'), 'CREATE TABLE rollback_probe(id integer); SELECT missing_function();');
    await expect(migrate(client, pathToFileURL(temporary + '/'), () => {})).rejects.toThrow();
    expect((await pg.query("SELECT to_regclass('rollback_probe') AS name")).rows).toEqual([{ name: null }]);
    expect((await pg.query("SELECT name FROM schema_migrations WHERE name='009_failure.sql'")).rows).toEqual([]);
  });
  it('rejects altered migration history', async () => {
    await pg.query("UPDATE schema_migrations SET checksum='changed' WHERE name='001_initial.sql'");
    await expect(migrate(client, undefined, () => {})).rejects.toThrow('previously applied migration changed');
  });
});
