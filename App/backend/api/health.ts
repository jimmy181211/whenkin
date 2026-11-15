import type { RequestHandler } from 'express';
import type { Database } from '../db/types.js';

export default function health(database: Database): RequestHandler {
  return async (_req, res) => {
    try {
      await database.query('SELECT 1 FROM events LIMIT 1');
      return res.json({ ready: true });
    } catch {
      return res.json({ ready: false });
    }
  };
}
