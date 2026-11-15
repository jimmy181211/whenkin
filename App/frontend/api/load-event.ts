import { api } from './client';
import type { MeetingEvent } from '../../shared/types';

export function loadEvent(id: string) {
  return api<MeetingEvent>(`/events/${id}`);
}
