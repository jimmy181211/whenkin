/** Validates and inserts a response with its availability in one SQL statement. */
import { isTimezone } from '../../shared/time.js';
import {
  Problem,
  text,
  validateRanges,
} from '../shared/validation.js';
import { readEvent } from '../shared/event-queries.js';
import { body } from '../shared/request.js';
import type { RequestHandler } from 'express';
import type { Database } from '../db/types.js';

export default function createResponse(
  database: Database,
): RequestHandler<{ id: string }> {
  return async (req, res) => {
    const event = await readEvent(database, req.params.id);
    const input = await body(req);
    const name = text(input.name, 'your name', 60);
    if (typeof input.timezone !== 'string' || !isTimezone(input.timezone)) {
      throw new Problem(400, 'Please choose a valid time zone.');
    }
    const expectedSchedule = input.schedule_revision ?? event.schedule_revision;
    if (expectedSchedule !== event.schedule_revision) {
      throw new Problem(
        409,
        'The event schedule changed. Reload before saving your changes.',
      );
    }
    const ranges = validateRanges(input.ranges, event.windows);
    const id = crypto.randomUUID();
    const created = await database.query(
      `WITH gate AS (
  UPDATE events SET write_revision=write_revision+1 WHERE id=$2 AND schedule_revision=$6 AND expires_at>clock_timestamp() RETURNING id
), response AS (
  INSERT INTO responses(id,event_id,name,timezone,edit_hash) SELECT $1,gate.id,$3,$4,'' FROM gate RETURNING id
), inserted AS (INSERT INTO availability(response_id,starts_at,ends_at)
  SELECT response.id,a.start::timestamptz,a.end::timestamptz FROM response CROSS JOIN jsonb_to_recordset($5::jsonb) AS a(start text,"end" text) RETURNING id) SELECT id FROM response`,
      [
        id,
        event.id,
        name,
        input.timezone,
        JSON.stringify(ranges),
        expectedSchedule,
      ],
    );
    if (!created.length) {
      await readEvent(database, event.id);
      throw new Problem(
        409,
        'The event schedule changed. Reload before saving your changes.',
      );
    }
    return res.status(201).json({
      id,
      revision: 1,
    });
  };
}
