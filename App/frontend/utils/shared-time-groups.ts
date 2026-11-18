import { localDate } from './time';
import type {
  Candidate,
  TimeRange,
} from '../../shared/types';

/** Original shared-time range paired with its viewer-facing display range. */
export type SharedTimeEntry = { candidate: Candidate;
  shown: TimeRange };
/** Shared-time entries collected under one viewer-local date. */
export type SharedTimeGroup = { date: string;
  entries: SharedTimeEntry[] };

/**
 * Group by the viewer's local date while retaining original ranges for grid selection.
 * @returns Chronological date groups with entries ordered by display time; empty
 * candidate input returns an empty list.
 */
export function groupSharedTimes(
  candidates: Candidate[],
  zone: string,
  project?: (range: TimeRange) => TimeRange,
): SharedTimeGroup[] {
  const groups = new Map<string, SharedTimeEntry[]>();
  for (const candidate of candidates) {
    const shown = project ? project(candidate) : candidate;
    const date = localDate(shown.start, zone);
    const entries = groups.get(date) ?? [];
    entries.push({
      candidate,
      shown,
    });
    groups.set(date, entries);
  }
  return [...groups.entries()]
    .sort(
      /* Order shared-time groups by the viewer's local date. */
      ([a], [b]) => a.localeCompare(b),
    )
    .map(
      /* Build a date group with its entries sorted by displayed start time. */
      ([date, entries]) => ({
        date,
        entries: entries.sort(
          /** Order this day's displayed free-time ranges from earliest to latest. */
          (a, b) => Date.parse(a.shown.start) - Date.parse(b.shown.start),
        ),
      }),
    );
}
