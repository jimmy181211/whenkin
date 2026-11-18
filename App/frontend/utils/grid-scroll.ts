/**
 * Scroll the calendar with a mouse wheel or trackpad without trapping page scroll.
 * Prevent default scrolling only if the grid actually moved; preserve browser zoom.
 */
export function scrollGrid(element: HTMLElement, event: WheelEvent) {
  if (event.ctrlKey || event.metaKey) {
    return;
  }
  // Wheel deltas may be pixels, lines, or pages; convert them to pixel movement.
  const unit =
    event.deltaMode === 1
      ? 16
      : event.deltaMode === 2
        ? element.clientHeight
        : 1;
  const top = element.scrollTop;
  const left = element.scrollLeft;
  const hasHorizontalOverflow = element.scrollWidth > element.clientWidth;
  const vertical =
    event.deltaY ||
    (!hasHorizontalOverflow && !event.shiftKey ? event.deltaX : 0);
  element.scrollTop += vertical * unit;
  if (hasHorizontalOverflow) {
    element.scrollLeft += event.deltaX * unit;
  }
  if (element.scrollTop !== top || element.scrollLeft !== left) {
    event.preventDefault();
  }
}
