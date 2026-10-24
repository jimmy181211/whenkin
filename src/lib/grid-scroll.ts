// Wheel events cover both mouse wheels and two-finger laptop trackpads.
// Preserve browser zoom and let the page scroll when the grid reaches an edge.
export function scrollGrid(element: HTMLElement, event: WheelEvent) {
  if (event.ctrlKey || event.metaKey) return;
  const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientHeight : 1;
  const top = element.scrollTop;
  const left = element.scrollLeft;
  const hasHorizontalOverflow = element.scrollWidth > element.clientWidth;
  const vertical = event.deltaY || (!hasHorizontalOverflow && !event.shiftKey ? event.deltaX : 0);
  element.scrollTop += vertical * unit;
  if (hasHorizontalOverflow) element.scrollLeft += event.deltaX * unit;
  if (element.scrollTop !== top || element.scrollLeft !== left) event.preventDefault();
}
