import { readEvent } from '../shared/event-queries.js';
import type { RequestHandler } from 'express';
import type { Database } from '../db/types.js';

export default function getEvent(
  database: Database,
): RequestHandler<{ id: string }> {
  return async (req, res) => {
    return res.json(await readEvent(database, req.params.id, true));
  };
}
