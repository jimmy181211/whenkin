import { allSlots } from './time';
import type { ResponseData } from './types';

// Count each saved person once per instant, even if their ranges overlap.
export function groupAvailability(responses: ResponseData[]) {
  const counts = new Map<number, number>();
  for (const response of responses) {
    for (const stamp of new Set(allSlots(response.ranges))) {
      counts.set(stamp, (counts.get(stamp) ?? 0) + 1);
    }
  }
  return counts;
}

export function availabilityColor(count: number, total: number) {
  if (!total || !count) return '#fafbf8';
  const percent = Math.round(100 * Math.min(count, total) / total);
  return `color-mix(in srgb, var(--primary) ${percent}%, var(--lime))`;
}

export function inspectAvailability(responses: ResponseData[], stamps: number[]) {
  const available: ResponseData[] = [];
  const unavailable: (ResponseData & { partial: boolean })[] = [];
  for (const person of responses) {
    const selected = new Set(allSlots(person.ranges));
    const count = stamps.filter(stamp => selected.has(stamp)).length;
    if (stamps.length && count === stamps.length) available.push(person);
    else unavailable.push({ ...person, partial: count > 0 });
  }
  return { available, unavailable };
}
