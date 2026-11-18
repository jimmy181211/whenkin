import type { RequestHandler } from 'express';
import type { Database } from '../db/types.js';

/**
 * Build a readiness endpoint that checks database access without writing data.
 * @returns An Express handler that reports whether event queries can run.
 */
export default function health(database: Database): RequestHandler {
  /**
   * Check whether the database can serve event requests.
   * @returns The sent JSON response with ready=true on success or false on failure.
   */
  return async (_req, res) => {
    try {
      await database.query('SELECT 1 FROM events LIMIT 1');
      return res.json({ ready: true });
    } catch {
      return res.json({ ready: false });
    }
  };
}
