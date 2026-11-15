export type TimeRange = { start: string; end: string };
export type ResponseData = { id: string; name: string; timezone: string; revision: number; ranges: TimeRange[] };
export type MeetingEvent = {
  id: string; title: string; description: string; organizer_name: string; timezone: string;
  schedule_mode?: 'dates' | 'weekdays';
  windows: TimeRange[]; responses: ResponseData[];
  schedule_revision?: number; response_count?: number;
  created_at?: string; expires_at?: string; candidates?: Candidate[];
};
export type CreateInput = { title: string; description: string; organizer_name?: string; timezone: string; dates: string[]; schedule_mode?: 'dates' | 'weekdays'; weekdays?: number[]; startTime: string; endTime: string };
export type Candidate = TimeRange & { available: string[] };
