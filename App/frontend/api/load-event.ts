import { api } from './client';
import type { MeetingEvent } from '../../shared/types';

/**
 * Fetch the event, saved responses, and shared-time results by id.
 * @returns A promise for the event data; API failures reject with ApiError.
 */
export function loadEvent(id: string) {
  return api<MeetingEvent>(`/events/${id}`);
}
