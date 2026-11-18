/** Creates the Node PostgreSQL pool used by the server and maintenance tools. */
import { Pool } from 'pg';

/**
 * Create a bounded PostgreSQL pool; callers must close it when finished.
 * @returns Query, connection checkout, and shutdown actions backed by the same pool.
 */
export function createDatabase(connectionString = process.env.DATABASE_URL) {
  if (!connectionString && !process.env.PGHOST) {
    throw new Error(
      'Set DATABASE_URL or PostgreSQL environment variables before starting Whenkin.',
    );
  }
  const pool = new Pool({
    connectionString,
    max: 10,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    query_timeout: 15000,
    options: '-c timezone=UTC',
  });
  pool.on(
    'error',
    /* Log a safe message when an idle database connection fails. */
    () =>
      console.error(
        'A database connection was interrupted. The pool will reconnect when needed.',
      ),
  );
  return {
    /**
     * Execute parameterized SQL and return its rows.
     * @param {string} sql
     * @param {unknown[]} [params] - Values for the SQL placeholders.
     * @returns The result rows after the query completes, without driver metadata.
     */
    async query(sql, params = []) {
      return (await pool.query(sql, params)).rows;
    },
    /**
     * Check out one connection for operations that must share a transaction
     * or lock.
     * @returns A checked-out connection after it is available; release it when finished.
     */
    connect: () => pool.connect(),
    /**
     * Close the pool after the server or maintenance command finishes.
     * @returns A promise that resolves once the pool has finished shutting down.
     */
    close: () => pool.end(),
  };
}
