import { api } from './api';
import type { MeetingEvent } from './types';

export function loadEvent(id: string) {
  return api<MeetingEvent>(`/events/${id}`);
}
