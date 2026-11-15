import { createDatabase } from '../db/connection.mjs';
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { sqlStatements } from './sql-statements.mjs';

// One checked-out connection owns the lock, statements and checksum transaction.
export async function migrate(client, directory = new URL('../db/migrations/', import.meta.url), log = console.log) {
  await client.query('SELECT pg_advisory_lock(742051839)');
  try {
    await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
    for (const name of (await readdir(directory)).filter(n => n.endsWith('.sql')).sort()) {
      const contents = await readFile(new URL(name, directory), 'utf8');
      const checksum = createHash('sha256').update(contents).digest('hex');
      const existing = (await client.query('SELECT checksum FROM schema_migrations WHERE name=$1', [name])).rows;
      if (existing.length) {
        if (existing[0].checksum !== checksum) throw new Error('A previously applied migration changed.');
        log('Already applied: ' + name);
        continue;
      }
      await client.query('BEGIN');
      try {
        for (const statement of sqlStatements(contents)) await client.query(statement);
        await client.query('INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)', [name, checksum]);
        await client.query('COMMIT');
        log('Applied: ' + name);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock(742051839)');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let database, client;
  try {
    database = createDatabase();
    client = await database.connect();
    await migrate(client);
  } catch {
    console.error('Migration failed. Check database access and migration history. No credentials were printed.');
    process.exitCode = 1;
  } finally {
    client?.release();
    await database?.close();
  }
}
