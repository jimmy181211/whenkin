import { localDate } from './time';
import type { Candidate, TimeRange } from './types';

export type SharedTimeEntry = { candidate: Candidate; shown: TimeRange };
export type SharedTimeGroup = { date: string; entries: SharedTimeEntry[] };

// Group by the date the viewer sees; retain canonical ranges for grid selection.
export function groupSharedTimes(candidates: Candidate[], zone: string, project?: (range: TimeRange) => TimeRange): SharedTimeGroup[] {
  const groups = new Map<string, SharedTimeEntry[]>();
  for (const candidate of candidates) {
    const shown = project ? project(candidate) : candidate;
    const date = localDate(shown.start, zone);
    const entries = groups.get(date) ?? [];
    entries.push({ candidate, shown });
    groups.set(date, entries);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, entries]) => ({
    date,
    entries: entries.sort((a, b) => Date.parse(a.shown.start) - Date.parse(b.shown.start)),
  }));
}
