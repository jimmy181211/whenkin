/**
 * Viewport rectangle used to position a panel without reading the DOM
 * here.
 */
export type PanelRect = {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
};

/**
 * Choose a position beside the trigger, flipping sides if space is limited.
 * @param viewport - Visible bounds in CSS pixels, including any mobile offset.
 * @returns Viewport coordinates clamped to leave padding around the panel.
 */
export function anchoredPanelPosition(
  anchor: PanelRect,
  box: { width: number;
    height: number },
  viewport: { left: number;
    top: number;
    width: number;
    height: number },
) {
  // Leave space at viewport edges (pad) and between the trigger and panel (gap).
  const pad = 12;
  const gap = 10;
  const minX = viewport.left + pad;
  const minY = viewport.top + pad;
  // Bounds apply to the panel's top-left corner, accounting for its own size.
  const maxX = Math.max(minX, viewport.left + viewport.width - box.width - pad);
  const maxY = Math.max(
    minY,
    viewport.top + viewport.height - box.height - pad,
  );
  let left = anchor.right + gap;
  if (left > maxX) {
    left =
      anchor.left - box.width - gap >= minX
        ? anchor.left - box.width - gap
        : anchor.left + (anchor.width - box.width) / 2;
  }
  let top = anchor.bottom + gap;
  if (top > maxY) {
    top = anchor.top - box.height - gap;
  }
  return {
    left: Math.max(minX, Math.min(maxX, left)),
    top: Math.max(minY, Math.min(maxY, top)),
  };
}
