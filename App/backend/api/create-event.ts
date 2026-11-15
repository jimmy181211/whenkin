import type { CreateInput } from '../../shared/types.js';
import { validateEvent } from '../shared/validation.js';
import { body } from '../shared/request.js';
import type { RequestHandler } from 'express';
import type { Database } from '../db/types.js';

export default function createEvent(database: Database): RequestHandler {
  return async (req, res) => {
    const input = await body(req) as CreateInput;
    const valid = validateEvent(input);
    const id = crypto.randomUUID();
    await database.query(`WITH event AS (
  INSERT INTO events(id,title,description,organizer_name,timezone,schedule_mode) VALUES($1,$2,$3,$4,$5,$7) RETURNING id
) INSERT INTO event_windows(event_id,starts_at,ends_at)
  SELECT event.id,w.start::timestamptz,w.end::timestamptz FROM event CROSS JOIN jsonb_to_recordset($6::jsonb) AS w(start text,"end" text)`, [id, valid.title, valid.description, valid.organizer, input.timezone, JSON.stringify(valid.windows), valid.mode]);
    return res.status(201).json({ id });
  };
}
