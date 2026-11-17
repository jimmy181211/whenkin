/** Creates the Node PostgreSQL pool used by the server and maintenance tools. */
import { Pool } from 'pg';

// One bounded pool per process, for local or hosted PostgreSQL.
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
  pool.on('error', () =>
    console.error(
      'A database connection was interrupted. The pool will reconnect when needed.',
    ),
  );
  return {
    /** @param {string} sql @param {unknown[]} [params] */
    async query(sql, params = []) {
      return (await pool.query(sql, params)).rows;
    },
    connect: () => pool.connect(),
    close: () => pool.end(),
  };
}
