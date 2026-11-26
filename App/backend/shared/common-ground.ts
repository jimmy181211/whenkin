import type { Candidate, ResponseData, TimeRange } from '../../shared/types.js';

/**
 * Changes in open event windows and responder ranges at one sweep
 * boundary.
 */
type Edge = { windows: number; people: Map<string, number> };

/**
 * Sweep time boundaries to find when all respondents are free within the event.
 * Count responders separately from their ranges so overlaps cannot count a person twice.
 * @param windows - Allowed event ranges that bound the shared-time search.
 * @returns Merged UTC ISO ranges listing every responder id, or [] if none match.
 */
export function commonGround(windows: TimeRange[], responses: ResponseData[]): Candidate[] {
  if (!responses.length) {
    return [];
  }
  // At each timestamp, record which ranges start (+1) or end (-1).
  const edges = new Map<number, Edge>();

  /**
   * Get or create the boundary record for an ISO timestamp.
   * @returns The shared record in the boundary map, ready to accumulate range changes.
   */
  const edge = (at: string) => {
    const stamp = Date.parse(at);
    if (!edges.has(stamp)) {
      edges.set(stamp, { windows: 0, people: new Map() });
    }
    return edges.get(stamp)!;
  };

  for (const range of windows) {
    edge(range.start).windows++;
    edge(range.end).windows--;
  }
  for (const person of responses) {
    for (const range of person.ranges) {
      for (const [at, delta] of [
        [range.start, 1],
        [range.end, -1],
      ] as const) {
        const change = edge(at).people;
        change.set(person.id, (change.get(person.id) ?? 0) + delta);
      }
    }
  }
  // Open range count per person; more than one still means just one available person.
  const counts = new Map<string, number>();
  // Ordered boundaries split the timeline into intervals with constant availability.
  const stamps = [...edges.keys()].sort(
    /* Visit time boundaries from earliest to latest. */
    (a, b) => a - b,
  );
  const matches: { start: number; end: number }[] = [];
  // Number of event windows covering the interval between this boundary and the next.
  let inside = 0;
  // Number of distinct people whose open range count is positive.
  let available = 0;
  for (let i = 0; i < stamps.length - 1; i++) {
    const start = stamps[i];
    const end = stamps[i + 1];
    const change = edges.get(start)!;
    inside += change.windows;
    for (const [id, delta] of change.people) {
      const previous = counts.get(id) ?? 0;
      const next = previous + delta;
      counts.set(id, next);
      if (previous <= 0 && next > 0) {
        available++;
      } else if (previous > 0 && next <= 0) {
        available--;
      }
    }
    if (!inside || available !== responses.length) {
      continue;
    }
    // Adjacent matching intervals form one shared period, rather than many small ones.
    const previous = matches.at(-1);
    if (previous?.end === start) {
      previous.end = end;
    } else {
      matches.push({ start, end });
    }
  }
  const ids = responses.map(
    /* Collect responder ids to attach to every shared-time result. */
    (person) => person.id,
  );
  return matches.map(
    /* Convert matching millisecond intervals to the API's ISO range shape. */
    (match) => ({
      start: new Date(match.start).toISOString(),
      end: new Date(match.end).toISOString(),
      available: ids,
    }),
  );
}
