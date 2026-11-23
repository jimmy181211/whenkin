import {
  allSlots,
  SLOT,
} from './time';
import type { ResponseData } from '../../shared/types';

/**
 * Count responders at each stored slot start, in milliseconds.
 * Overlapping ranges from one responder still count as one person.
 * @param duration - Event-specific milliseconds per slot; defaults to legacy slots.
 * @returns A lookup from slot timestamp to available responder count.
 */
export function groupAvailability(responses: ResponseData[], duration = SLOT) {
  const counts = new Map<number, number>();
  for (const response of responses) {
    for (const stamp of new Set(allSlots(response.ranges, duration))) {
      counts.set(stamp, (counts.get(stamp) ?? 0) + 1);
    }
  }
  return counts;
}

/**
 * Map the available fraction to the group heatmap.
 * @returns A CSS color expression; empty slots use the neutral background color.
 */
export function availabilityColor(count: number, total: number) {
  if (!total || !count) {
    return '#fafbf8';
  }
  const percent = Math.round((100 * Math.min(count, total)) / total);
  return `color-mix(in srgb, var(--primary) ${percent}%, var(--lime))`;
}

/**
 * Check each responder against all slots in the inspected block.
 * A partial match is not fully available, so it stays in unavailable with partial=true.
 * @param stamps - Stored starts of every slot in the block.
 * @param duration - Slot length for this event, in milliseconds; defaults to legacy slots.
 * @returns Separate lists for full matches and unavailable/partial matches.
 */
export function inspectAvailability(
  responses: ResponseData[],
  stamps: number[],
  duration = SLOT,
) {
  const available: ResponseData[] = [];
  const unavailable: (ResponseData & { partial: boolean })[] = [];
  for (const person of responses) {
    const selected = new Set(allSlots(person.ranges, duration));
    const count = stamps.filter(
      /* Count inspected slots that this responder has selected. */
      (stamp) => selected.has(stamp),
    ).length;
    if (stamps.length && count === stamps.length) {
      available.push(person);
    } else {
      unavailable.push({
        ...person,
        partial: count > 0,
      });
    }
  }
  return {
    available,
    unavailable,
  };
}
