import type { CreateInput } from '../../shared/types.js';
import { validateEvent } from '../shared/validation.js';
import { body } from '../shared/request.js';
import type { RequestHandler } from 'express';
import type { Database } from '../db/types.js';

/**
 * Build the POST /api/events handler for the supplied database.
 * Validate the form and insert the event plus its offered windows in one statement.
 * The response contains the new event id, used to open its reply page.
 * @returns An Express handler that creates an event when a request arrives.
 */
export default function createEvent(database: Database): RequestHandler {
  /**
   * Validate and save the submitted event and its offered windows.
   * Invalid form data or database failures pass to the shared API error handler.
   * @returns The sent 201 JSON response containing the new event id.
   */
  return async (req, res) => {
    const input = (await body(req)) as CreateInput;
    const valid = validateEvent(input);
    const id = crypto.randomUUID();
    await database.query(
      `WITH event AS (
  INSERT INTO events(id,title,description,organizer_name,timezone,schedule_mode) VALUES($1,$2,$3,$4,$5,$7) RETURNING id
) INSERT INTO event_windows(event_id,starts_at,ends_at)
  SELECT event.id,w.start::timestamptz,w.end::timestamptz FROM event CROSS JOIN jsonb_to_recordset($6::jsonb) AS w(start text,"end" text)`,
      [
        id,
        valid.title,
        valid.description,
        valid.organizer,
        input.timezone,
        JSON.stringify(valid.windows),
        valid.mode,
      ],
    );
    return res.status(201).json({ id });
  };
}
