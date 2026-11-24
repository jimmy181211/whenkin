import type { RequestHandler } from 'express';
import type { Database } from '../db/types.js';
import { parseRetentionPolicy } from '../../shared/retention.js';
import { Problem } from '../shared/validation.js';

/**
 * Build the endpoint that reads the saved retention policy.
 * @returns An Express handler used by the frontend's shared expiry notices.
 */
export default function getRetention(database: Database): RequestHandler {
  /**
   * Read the current retention policy or report that it is unavailable.
   * @returns The sent JSON response with the validated month count and unit.
   */
  return async (_req, res) => {
    try {
      const rows = await database.query('SELECT * FROM public.get_event_retention_policy()');
      return res.json(parseRetentionPolicy(rows[0]));
    } catch {
      throw new Problem(503, 'The retention policy is temporarily unavailable.');
    }
  };
}
