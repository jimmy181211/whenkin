/** Deletes a shared response after validating its event and revision. */
import {
  Problem,
  checkId,
} from '../shared/validation.js';
import { readEvent } from '../shared/event-queries.js';
import { body } from '../shared/request.js';
import type { RequestHandler } from 'express';
import type { Database } from '../db/types.js';

/**
 * Build the handler that deletes the reviewed reply revision.
 * Check its event and schedule as well; database foreign keys remove that reply's
 * availability rows without touching anyone else's responses.
 * @returns An Express handler for deleting the specified saved reply revision.
 */
export default function deleteResponse(
  database: Database,
): RequestHandler<{ id: string;
  responseId: string }> {
  /**
   * Delete only the reviewed reply revision and its availability rows.
   * @returns The sent JSON response identifying the removed reply.
   */
  return async (req, res) => {
    const event = await readEvent(database, req.params.id);
    const id = req.params.responseId;
    checkId(id);
    const input = await body(req);
    if (
      typeof input.revision !== 'number' ||
      !Number.isInteger(input.revision) ||
      input.revision < 1
    ) {
      throw new Problem(400, 'Please reload this response before deleting it.');
    }
    const expectedSchedule = input.schedule_revision ?? event.schedule_revision;
    if (expectedSchedule !== event.schedule_revision) {
      throw new Problem(
        409,
        'The event schedule changed. Reload before saving your changes.',
      );
    }
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
    // Parent lock serializes deletion with writes; FK cascade removes only this response's availability.
    const removed = await database.query<{ id: string }>(
      `WITH gate AS (
      UPDATE events SET write_revision=write_revision+1
      WHERE id=$2 AND schedule_revision=$4 AND expires_at>clock_timestamp() RETURNING id
    ) DELETE FROM responses WHERE id=$1 AND event_id=$2 AND revision=$3
      AND EXISTS (SELECT 1 FROM gate) RETURNING id`,
      [
        id,
        event.id,
        input.revision,
        expectedSchedule,
      ],
    );
    if (!removed.length) {
      await readEvent(database, event.id);
      throw new Problem(
        409,
        'This response changed. Review it before deleting.',
      );
    }
    return res.json({ id: removed[0].id });
  };
}
