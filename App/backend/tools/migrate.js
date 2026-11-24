/** Applies checked SQL migrations on one locked database connection. */
import { PostgresDatabase } from '../db/connection.js';
import {
  readFile,
  readdir,
} from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { sqlStatements } from './sql-statements.js';

/**
 * Hash migration contents to detect edits to previously applied SQL.
 * @returns The content's SHA-256 digest as hexadecimal text.
 */
const digest = (contents) => createHash('sha256').update(contents).digest('hex');

/**
 * Apply unapplied SQL files in filename order and check previously saved checksums.
 * Keep each migration and its history entry in one transaction; rollback on failure.
 * Only the failing file is rolled back; earlier successful migrations remain applied.
 * @param client - One checked-out connection that owns the lock for the whole run.
 */
export async function migrate(
  client,
  directory = new URL('../db/migrations/', import.meta.url),
  log = console.log,
) {
  await client.query('SELECT pg_advisory_lock(742051839)');
  try {
    await client.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY , checksum text NOT
  NULL , applied_at timestamptz NOT NULL DEFAULT now())`,
    );
    for (const name of (await readdir(directory))
      .filter(
        /* Select only SQL files from the migration directory. */
        (n) => n.endsWith('.sql'),
      )
      .sort()) {
      const contents = await readFile(new URL(name, directory), 'utf8');
      // Normalize only line endings; actual edits to applied SQL remain an error.
      const canonical = contents.replaceAll('\r\n', '\n');
      const checksum = digest(canonical);
      const existing = (
        await client.query('SELECT checksum FROM schema_migrations WHERE name=$1', [name])
      ).rows;
      if (existing.length) {
        // Accept the same historical SQL checked out with either OS's line endings.
        const compatible = [
          checksum,
          digest(canonical.replaceAll('\n', '\r\n')),
        ];
        if (!compatible.includes(existing[0].checksum)) {
          throw new Error('A previously applied migration changed.');
        }
        log('Already applied: ' + name);
        continue;
      }
      await client.query('BEGIN');
      try {
        for (const statement of sqlStatements(contents)) {
          await client.query(statement);
        }
        await client.query('INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)', [
          name,
          checksum,
        ]);
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
  let database;
  let client;
  try {
    database = new PostgresDatabase();
    client = await database.connect();
    await migrate(client);
  } catch {
    console.error(
      'Migration failed. Check database access and migration history. No credentials were printed.',
    );
    process.exitCode = 1;
  } finally {
    client?.release();
    await database?.close();
  }
}
