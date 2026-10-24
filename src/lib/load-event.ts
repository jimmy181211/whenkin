import { api } from './api';
import type { ResponseIdentity } from './event-access';
import type { MeetingEvent } from './types';

export function loadEvent(id: string, response: ResponseIdentity | null) {
  return api<MeetingEvent>(`/events/${id}${response ? '?response_id=' + encodeURIComponent(response.id) : ''}`, {
    headers: response ? { Authorization: `Bearer ${response.token}` } : {},
  });
}
