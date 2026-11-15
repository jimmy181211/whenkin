// A drag keeps the action chosen by its starting cell, even when it crosses
// mixed availability. A partially marked cell counts as marked when clearing.
export function clearsSelection(stamps: number[], selected: Set<number>) {
  return stamps.some(stamp => selected.has(stamp));
}
export function paintSelection(base: Set<number>, stamps: number[], clear: boolean) {
  const next = new Set(base);
  for (const stamp of stamps) {
    if (clear) next.delete(stamp);
    else next.add(stamp);
  }
  return next;
}
