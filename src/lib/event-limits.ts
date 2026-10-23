export const MAX_PARTICIPANTS = 1000;
export const EVENT_FULL_MESSAGE = 'This event has reached its limit of 1,000 participants.';
export const EVENT_EXPIRED_MESSAGE = 'This event has expired.';

export function isEventFull(responseCount: number, hasSavedResponse: boolean) {
  return !hasSavedResponse && responseCount >= MAX_PARTICIPANTS;
}
