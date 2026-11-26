/** Response writes and verification of a reply reported as already deleted. */
import { api, ApiError } from './client';
import type { MeetingEvent, ResponseData, TimeRange } from '../../shared/types';

/** The draft's saved-coordinate ranges and the revisions that protect the write. */
type ResponsePayload = {
  name: string;
  timezone: string;
  ranges: TimeRange[];
  revision: number;
  schedule_revision?: number;
};

/**
 * Create a reply on its first save, or update the identified reply afterward.
 * @returns The saved id and revision; failures reject without retrying the write.
 */
export function saveEventResponse(
  eventId: string,
  responseId: string | null,
  payload: ResponsePayload,
) {
  const path = '/events/' + eventId + '/responses' + (responseId ? '/' + responseId : '');
  return api<{ id: string; revision: number }>(path, {
    method: responseId ? 'PUT' : 'POST',
    keepalive: true,
    body: JSON.stringify(payload),
  });
}

/**
 * Delete the expected reply version. A 404 is accepted only if a fresh event
 * confirms its absence; missing/expired events and all other errors still reject.
 * @returns Fresh event data when absence needed verification, otherwise undefined.
 */
export async function removeEventResponse(
  eventId: string,
  response: Pick<ResponseData, 'id' | 'revision'>,
  scheduleRevision: number | undefined,
  load: () => Promise<MeetingEvent>,
): Promise<MeetingEvent | undefined> {
  try {
    await api('/events/' + eventId + '/responses/' + response.id, {
      method: 'DELETE',
      keepalive: true,
      body: JSON.stringify({ revision: response.revision, schedule_revision: scheduleRevision }),
    });
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 404) {
      throw error;
    }
    const fresh = await load();
    if (
      fresh.responses.some(
        /** Keep a 404 failure when the reply still appears in the refreshed event. */
        (person) => person.id === response.id,
      )
    ) {
      throw error;
    }
    return fresh;
  }
}
