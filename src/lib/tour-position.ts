// Move only as far as needed to reveal the target, preserving nearby context.
export function tourScrollDelta(target: { top: number; bottom: number }, bounds: { top: number; bottom: number }) {
  const room = bounds.bottom - bounds.top;
  if (room <= 0) return 0;
  // Large sections need a clear visible portion, not a viewport-filling close-up.
  if (target.bottom - target.top <= Math.min(240, room)) {
    if (target.top < bounds.top) return target.top - bounds.top;
    if (target.bottom > bounds.bottom) return target.bottom - bounds.bottom;
    return 0;
  }
  const needed = Math.min(140, room / 2);
  const visible = Math.min(target.bottom, bounds.bottom) - Math.max(target.top, bounds.top);
  if (visible >= needed) return 0;
  return target.top > bounds.top ? target.top - (bounds.bottom - needed) : target.bottom - (bounds.top + needed);
}
