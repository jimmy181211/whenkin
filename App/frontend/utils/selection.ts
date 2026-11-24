/** Adds or clears selected slots without mutating the previous selection. */
/**
 * Decide the whole drag's action from its first block.
 * Any selected slot makes this a clear gesture, including a partly selected block.
 * @returns True to clear this drag's slots, or false to mark them available.
 */
export function clearsSelection(stamps: number[], selected: Set<number>) {
  return stamps.some(
    /* Check whether the starting block contains any selected slot. */
    (stamp) => selected.has(stamp),
  );
}

/**
 * Add or remove slots on a copy of the selection from before the gesture.
 * @param clear - Remove these stamps when true; otherwise add them.
 * @returns A new selection set; base is never mutated.
 */
export function paintSelection(base: Set<number>, stamps: number[], clear: boolean) {
  const next = new Set(base);
  for (const stamp of stamps) {
    if (clear) {
      next.delete(stamp);
    } else {
      next.add(stamp);
    }
  }
  return next;
}
