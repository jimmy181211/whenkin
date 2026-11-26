/** ISO timestamps with a timezone offset; start is included and end is excluded. */
export type TimeRange = { start: string; end: string };
/**
 * One saved reply with its display name, timezone, revision, and available
 * ranges.
 */
export type ResponseData = {
  id: string;
  name: string;
  timezone: string;
  /** Server version used to reject edits based on an older copy of this reply. */
  revision: number;
  ranges: TimeRange[];
};
/**
 * Event data returned by the API, including its schedule, saved replies,
 * and results.
 */
export type MeetingEvent = {
  id: string;
  title: string;
  description: string;
  organizer_name: string;
  timezone: string;
  schedule_mode?: 'dates' | 'weekdays';
  /** Saved selection granularity; missing metadata belongs to the legacy 15-minute format. */
  slot_minutes?: 15 | 30;
  /** All times offered by the event; a response must stay inside these windows. */
  windows: TimeRange[];
  responses: ResponseData[];
  /** Version of the offered schedule, checked separately from reply revisions. */
  schedule_revision?: number;
  response_count?: number;
  created_at?: string;
  expires_at?: string;
  /** Periods when every saved responder is available, calculated by the backend. */
  candidates?: Candidate[];
};
/** Browser form values; the backend converts these local dates/times to windows. */
export type CreateInput = {
  title: string;
  description: string;
  organizer_name?: string;
  timezone: string;
  dates: string[];
  schedule_mode?: 'dates' | 'weekdays';
  weekdays?: number[];
  startTime: string;
  endTime: string;
};
/** A shared free-time range; available contains responder ids, not names. */
export type Candidate = TimeRange & { available: string[] };
