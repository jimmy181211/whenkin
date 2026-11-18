import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import {
  mkdtemp,
  writeFile,
  rm,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { migrate } from '../App/backend/tools/migrate.js';

const pg = new PGlite();
const client = {
  /**
   * Adapt fixture queries to PGlite while leaving session-lock checks to
   * Docker tests.
   * @returns A driver-style query result; simulated advisory-lock operations have an empty rows list.
   */
  query: async (sql: string, params: unknown[] = []) => {
    // PGlite is single-session; PostgreSQL session locks are exercised by the Docker check.
    if (sql.startsWith('SELECT pg_advisory_')) {
      return { rows: [] };
    }
    return pg.query(sql, params);
  },
};
let temporary: string;
beforeAll(
  /* Create a temporary migration directory for checksum and ordering tests. */
  async () => {
    temporary = await mkdtemp(join(tmpdir(), 'whenkin-migrations-'));
  },
);
afterAll(
  /* Close the fixture database after this suite finishes. */
  async () => {
    await pg.close();
    await rm(temporary, { recursive: true });
  },
);

/** Group the PostgreSQL migration runner checks. */
describe('PostgreSQL migration runner', () => {
  /**
   * Applies nine migrations once and preserves the original migration
   * checksums.
   */
  it('applies nine migrations once and preserves the original migration checksums', async () => {
    await migrate(
      client,
      undefined,
      /* Suppress routine migration logs while checking first application. */
      () => {},
    );
    expect(
      (await pg.query('SELECT name FROM schema_migrations')).rows,
    ).toHaveLength(9);
    await pg.query(
      "INSERT INTO events(id,title,organizer_name,timezone) VALUES(gen_random_uuid(),'Retained','','UTC')",
    );
    await migrate(
      client,
      undefined,
      /* Suppress the repeated-run logs while checking migration idempotence. */
      () => {},
    );
    expect((await pg.query('SELECT title FROM events')).rows).toEqual([
      { title: 'Retained' },
    ]);
    expect(
      (await pg.query('SELECT name FROM schema_migrations')).rows,
    ).toHaveLength(9);
  });
  /** Rolls back failed schema changes together with their migration record. */
  it('rolls back failed schema changes together with their migration record', async () => {
    await writeFile(
      join(temporary, '009_failure.sql'),
      'CREATE TABLE rollback_probe(id integer); SELECT missing_function();',
    );
    await expect(
      migrate(
        client,
        pathToFileURL(temporary + '/'),
        /* Keep rollback assertions independent of migration log output. */
        () => {},
      ),
    ).rejects.toThrow();
    expect(
      (await pg.query("SELECT to_regclass('rollback_probe') AS name")).rows,
    ).toEqual([{ name: null }]);
    expect(
      (
        await pg.query(
          "SELECT name FROM schema_migrations WHERE name='009_failure.sql'",
        )
      ).rows,
    ).toEqual([]);
  });
  /**
   * Keeps migration history compatible across Windows and Linux line
   * endings.
   */
  it('keeps migration history compatible across Windows and Linux line endings', async () => {
    const source = 'CREATE TABLE newline_probe(id integer);\n';
    await writeFile(join(temporary, '009_failure.sql'), source);
    await migrate(
      client,
      pathToFileURL(temporary + '/'),
      /* Suppress logs while recording the original migration checksum. */
      () => {},
    );
    const legacy = createHash('sha256')
      .update(source.replaceAll('\n', '\r\n'))
      .digest('hex');
    await pg.query(
      "UPDATE schema_migrations SET checksum=$1 WHERE name='009_failure.sql'",
      [legacy],
    );
    await migrate(
      client,
      pathToFileURL(temporary + '/'),
      /* Suppress logs while checking compatible line-ending checksums. */
      () => {},
    );
    await writeFile(
      join(temporary, '009_failure.sql'),
      source.replaceAll('\n', '\r\n'),
    );
    await migrate(
      client,
      pathToFileURL(temporary + '/'),
      /* Keep altered-history rejection checks independent of routine logging. */
      () => {},
    );
    expect(
      (await pg.query("SELECT to_regclass('newline_probe') AS name")).rows,
    ).toEqual([{ name: 'newline_probe' }]);
  });
  /** Rejects altered migration history. */
  it('rejects altered migration history', async () => {
    await pg.query(
      "UPDATE schema_migrations SET checksum='changed' WHERE name='001_initial.sql'",
    );
    await expect(
      migrate(
        client,
        undefined,
        /* Suppress logs while applying migrations in the ordering fixture. */
        () => {},
      ),
    ).rejects.toThrow('previously applied migration changed');
  });
});
