import { readEvent } from '../shared/event-queries.js';
import type { RequestHandler } from 'express';
import type { Database } from '../db/types.js';

/**
 * Build the endpoint for reading an active event and its replies.
 * @returns An Express handler that includes shared free-time results in its response.
 */
export default function getEvent(database: Database): RequestHandler<{ id: string }> {
  /** @returns The sent JSON response containing the event, replies, and shared times. */
  return async (req, res) => {
    return res.json(await readEvent(database, req.params.id, true));
  };
}
