/**
 * Choose the smallest vertical move needed to reveal a guide target.
 * @returns A signed pixel delta: negative scrolls up, positive scrolls down,
 * and zero means enough of the target is already visible or no space is available.
 */
export function tourScrollDelta(
  target: {
    top: number;
    bottom: number;
  },
  bounds: {
    top: number;
    bottom: number;
  },
) {
  const room = bounds.bottom - bounds.top;
  if (room <= 0) {
    return 0;
  }
  // Large sections need a clear visible portion, not a viewport-filling close-up.
  if (target.bottom - target.top <= Math.min(240, room)) {
    if (target.top < bounds.top) {
      return target.top - bounds.top;
    }
    if (target.bottom > bounds.bottom) {
      return target.bottom - bounds.bottom;
    }
    return 0;
  }
  const needed = Math.min(140, room / 2);
  const visible = Math.min(target.bottom, bounds.bottom) - Math.max(target.top, bounds.top);
  if (visible >= needed) {
    return 0;
  }
  return target.top > bounds.top
    ? target.top - (bounds.bottom - needed)
    : target.bottom - (bounds.top + needed);
}

/** Measured rectangles and viewport bounds used without reading the DOM. */
type GuideLayout = {
  vw: number;
  vh: number;
  top: number;
  left: number;
  width: number;
  height: number;
  rect?: Pick<DOMRect, 'top' | 'bottom' | 'left' | 'right' | 'width' | 'height'>;
};

/**
 * Fit the guide and its highlight inside the visible viewport.
 * @returns Card/highlight coordinates; a missing target gives a centered card and no highlight.
 */
export function guidePosition({
  vw,
  vh,
  top,
  left,
  width,
  height,
  rect,
}: GuideLayout) {
  let cardX = left + (vw - width) / 2;
  let cardY = top + (vh - height) / 2;
  let x = 0;
  let y = 0;
  let w = 0;
  let h = 0;
  if (rect && rect.width && rect.height) {
    const fitsRight = rect.right + 16 + width <= left + vw - 16;
    const fitsLeft = rect.left - 16 - width >= left + 16;
    const stacked = vw < 700 || (!fitsRight && !fitsLeft);
    if (stacked) {
      cardX = vw < 700 ? left + 12 : left + (vw - width) / 2;
      cardY = top + vh - height - 12;
      // At the end of the page scrolling may stop before the target clears the card.
      if (rect.bottom + 6 > cardY - 12 && rect.top >= top + height + 28) {
        cardY = top + 12;
      }
    } else {
      cardX = fitsRight ? rect.right + 16 : rect.left - 16 - width;
      cardY = Math.max(top + 16, Math.min(top + vh - height - 16, rect.top));
    }
    x = Math.max(left + 8, rect.left - 6);
    y = Math.max(top + 8, rect.top - 6);
    const cardBelowTarget = stacked && cardY >= rect.top;
    const bottom = Math.min(rect.bottom + 6, cardBelowTarget ? cardY - 12 : top + vh - 8);
    w = Math.max(0, Math.min(rect.right + 6, left + vw - 8) - x);
    h = Math.max(0, bottom - y);
  }
  return {
    x,
    y,
    width: w,
    height: h,
    cardX,
    cardY,
  };
}
