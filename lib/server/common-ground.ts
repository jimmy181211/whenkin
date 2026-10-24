import type { Candidate, ResponseData, TimeRange } from '../../src/lib/types';

type Edge = { windows: number; people: Map<string, number> };

// Sweep range boundaries and return only periods when every respondent is free.
export function commonGround(windows: TimeRange[], responses: ResponseData[]): Candidate[] {
  if (!responses.length) return [];
  const edges = new Map<number, Edge>();
  const edge = (at: string) => {
    const stamp = Date.parse(at);
    if (!edges.has(stamp)) edges.set(stamp, { windows: 0, people: new Map() });
    return edges.get(stamp)!;
  };
  for (const range of windows) { edge(range.start).windows++; edge(range.end).windows--; }
  for (const person of responses) for (const range of person.ranges) {
    for (const [at, delta] of [[range.start, 1], [range.end, -1]] as const) {
      const change = edge(at).people;
      change.set(person.id, (change.get(person.id) ?? 0) + delta);
    }
  }
  const counts = new Map<string, number>();
  const stamps = [...edges.keys()].sort((a, b) => a - b);
  const matches: { start: number; end: number }[] = [];
  let inside = 0, available = 0;
  for (let i = 0; i < stamps.length - 1; i++) {
    const start = stamps[i], end = stamps[i + 1], change = edges.get(start)!;
    inside += change.windows;
    for (const [id, delta] of change.people) {
      const previous = counts.get(id) ?? 0, next = previous + delta;
      counts.set(id, next);
      if (previous <= 0 && next > 0) available++;
      else if (previous > 0 && next <= 0) available--;
    }
    if (!inside || available !== responses.length) continue;
    const previous = matches.at(-1);
    if (previous?.end === start) previous.end = end;
    else matches.push({ start, end });
  }
  const ids = responses.map(person => person.id);
  return matches.map(match => ({
    start: new Date(match.start).toISOString(), end: new Date(match.end).toISOString(), available: ids,
  }));
}
