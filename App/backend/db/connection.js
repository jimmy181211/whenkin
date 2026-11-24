/** Creates the Node PostgreSQL pool used by the server and maintenance tools. */
import { Pool } from 'pg';

/**
 * Own a bounded PostgreSQL pool and its query, checkout, and shutdown operations.
 * The server and each maintenance command own their own instance and must close it.
 */
export class PostgresDatabase {
  #pool;

  /** Create the pool without executing SQL; missing connection settings throw. */
  constructor(connectionString = process.env.DATABASE_URL) {
    if (!connectionString && !process.env.PGHOST) {
      throw new Error(
        'Set DATABASE_URL or PostgreSQL environment variables before starting Whenkin.',
      );
    }
    this.#pool = new Pool({
      connectionString,
      max: 10,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      query_timeout: 15000,
      options: '-c timezone=UTC',
    });
    this.#pool.on(
      'error',
      /* Log a safe message when an idle database connection fails. */
      () =>
        console.error(
          'A database connection was interrupted. The pool will reconnect when needed.',
        ),
    );
  }

  /**
   * Execute parameterized SQL and return its rows.
   * @param {string} sql
   * @param {unknown[]} [params] - Values for the SQL placeholders.
   * @returns The result rows after the query completes, without driver metadata.
   */
  async query(sql, params = []) {
    return (await this.#pool.query(sql, params)).rows;
  }

  /**
   * Check out one connection for operations that must share a transaction
   * or lock.
   * @returns A checked-out connection after it is available; release it when finished.
   */
  connect() {
    return this.#pool.connect();
  }

  /**
   * Close the pool after the server or maintenance command finishes.
   * @returns A promise that resolves once the pool has finished shutting down.
   */
  close() {
    return this.#pool.end();
  }
}
