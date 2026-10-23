import type { Candidate, ResponseData, TimeRange } from '../../src/lib/types';

type Edge = { windows: number; people: Map<string, number> };
type Match = { start: number; end: number; missing: string | null };

// Sweep range boundaries once. A secondary match keeps the same person absent
// from start to finish; adjacent matches with different people never merge.
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
  const ids = responses.map(person => person.id);
  const missing = new Set(ids), counts = new Map<string, number>();
  const stamps = [...edges.keys()].sort((a, b) => a - b), matches: Match[] = [];
  let inside = 0;
  for (let i = 0; i < stamps.length - 1; i++) {
    const start = stamps[i], end = stamps[i + 1], change = edges.get(start)!;
    inside += change.windows;
    for (const [id, delta] of change.people) {
      const count = (counts.get(id) ?? 0) + delta;
      counts.set(id, count);
      if (count > 0) missing.delete(id); else missing.add(id);
    }
    if (!inside || missing.size > 1 || missing.size === responses.length) continue;
    const absent = missing.size ? missing.values().next().value! : null;
    const previous = matches.at(-1);
    if (previous && previous.end === start && previous.missing === absent) previous.end = end;
    else matches.push({ start, end, missing: absent });
  }
  // Keep the existing five-result limit, with all-person matches first.
  return matches.sort((a, b) => Number(a.missing !== null) - Number(b.missing !== null) || a.start - b.start)
    .slice(0, 5).map(match => ({
      start: new Date(match.start).toISOString(), end: new Date(match.end).toISOString(),
      available: ids.filter(id => id !== match.missing), missing: match.missing ? [match.missing] : [],
    }));
}
