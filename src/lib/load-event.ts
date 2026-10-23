import { api, ApiError } from './api';
import type { ResponseIdentity } from './event-access';
import type { MeetingEvent } from './types';

export function loadEvent(id: string, response: ResponseIdentity | null) {
  return api<MeetingEvent>(`/events/${id}${response ? '?response_id=' + encodeURIComponent(response.id) : ''}`, {
    headers: response ? { Authorization: `Bearer ${response.token}` } : {},
  });
}

// Saved credentials are optional on a shared link. An explicitly opened edit
// link must still report invalid access, rather than silently creating a reply.
export async function restoreEvent(id: string, response: ResponseIdentity | null, explicitEdit: boolean) {
  try {
    return { event: await loadEvent(id, response), response };
  } catch (error) {
    if (!explicitEdit && response && error instanceof ApiError && (error.status === 403 || error.status === 404)) {
      return { event: await loadEvent(id, null), response: null };
    }
    throw error;
  }
}
