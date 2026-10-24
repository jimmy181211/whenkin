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
  const percent = total ? Math.round(100 * count / total) : 0;
  return `color-mix(in srgb, var(--lime) ${percent}%, #fafbf8)`;
}
