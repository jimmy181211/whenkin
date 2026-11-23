/** Updates a response and its ranges while checking the expected revision. */
import {
  isTimezone,
  slotDuration,
} from '../../shared/time.js';
import {
  Problem,
  checkId,
  text,
  validateRanges,
} from '../shared/validation.js';
import { readEvent } from '../shared/event-queries.js';
import { body } from '../shared/request.js';
import type { RequestHandler } from 'express';
import type { Database } from '../db/types.js';

/**
 * Build the handler that replaces an existing reply's name, zone, and availability.
 * Both the reply revision and schedule revision must match; otherwise return 409
 * so the caller reloads instead of overwriting a newer version.
 * @returns An Express handler for updating a reply with revision checks.
 */
export default function updateResponse(
  database: Database,
): RequestHandler<{ id: string;
  responseId: string }> {
  /**
   * Replace the reply and its ranges after checking both revision numbers.
   * Missing or expired records, invalid input, and conflicts pass to API error handling.
   * @returns The sent JSON response with the reply id and its new revision.
   */
  return async (req, res) => {
    const event = await readEvent(database, req.params.id);
    const id = req.params.responseId;
    checkId(id);
    const existing = await database.query(
      'SELECT id FROM responses WHERE id=$1 AND event_id=$2',
      [
        id,
        event.id,
      ],
    );
    if (!existing.length) {
      throw new Problem(
        404,
        'This response could not be found. Refresh the group and try again.',
      );
    }
    const input = await body(req);
    const name = text(input.name, 'your name', 60);
    if (
      typeof input.timezone !== 'string' ||
      !isTimezone(input.timezone) ||
      typeof input.revision !== 'number' ||
      !Number.isInteger(input.revision) ||
      input.revision < 1
    ) {
      throw new Problem(
        400,
        'Please reload this response and choose a valid time zone.',
      );
    }
    const expectedSchedule = input.schedule_revision ?? event.schedule_revision;
    if (expectedSchedule !== event.schedule_revision) {
      throw new Problem(
        409,
        'The event schedule changed. Reload before saving your changes.',
      );
    }
    const ranges = validateRanges(
      input.ranges,
      event.windows,
      slotDuration(event),
    );
    // One statement checks revisions, removes old ranges, and inserts replacements.
    // The new ranges are inserted only for the reply accepted by "target".
    const updated = await database.query<{
      id: string;
      revision: number;
    }>(
      `WITH gate AS (
  UPDATE events SET write_revision=write_revision+1 WHERE id=$6 AND schedule_revision=$7 AND expires_at>clock_timestamp() RETURNING id
), target AS (
  UPDATE responses SET name=$1,timezone=$2,revision=revision+1,updated_at=now() WHERE id=$3 AND event_id=$6 AND revision=$4 AND EXISTS (SELECT 1 FROM gate) RETURNING id,revision
), removed AS (
  DELETE FROM availability WHERE response_id IN (SELECT id FROM target) RETURNING id
), inserted AS (
  INSERT INTO availability(response_id,starts_at,ends_at)
  SELECT target.id,a.start::timestamptz,a.end::timestamptz FROM target CROSS JOIN jsonb_to_recordset($5::jsonb) AS a(start text,"end" text)
  WHERE (SELECT count(*) FROM removed)>=0 RETURNING id
) SELECT id,revision FROM target`,
      [
        name,
        input.timezone,
        id,
        input.revision,
        JSON.stringify(ranges),
        event.id,
        expectedSchedule,
      ],
    );
    if (!updated.length) {
      await readEvent(database, event.id);
      throw new Problem(
        409,
        'This response changed. Select the person again to load the latest version before saving.',
      );
    }
    return res.json(updated[0]);
  };
}
