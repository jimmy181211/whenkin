/** Shared layout-change subscriptions for anchored overlays and field reminders. */

/**
 * Measure immediately, then follow element sizes, nested scrolling and viewport changes.
 * @param elements - Existing anchor/panel elements to observe; null entries are skipped.
 * @returns Cleanup removing all observers and listeners registered by this call.
 */
export function observeOverlayLayout(measure: () => void, elements: (Element | null)[]) {
  measure();
  // Retain the original viewport so cleanup removes listeners from the same object.
  const viewport = window.visualViewport;
  window.addEventListener('scroll', measure, { capture: true });
  window.addEventListener('resize', measure);
  viewport?.addEventListener('resize', measure);
  viewport?.addEventListener('scroll', measure);
  const observer = new ResizeObserver(measure);
  for (const element of elements) {
    if (element) {
      observer.observe(element);
    }
  }

  /** Release this overlay's layout tracking without affecting other overlays. */
  return () => {
    window.removeEventListener('scroll', measure, { capture: true });
    window.removeEventListener('resize', measure);
    viewport?.removeEventListener('resize', measure);
    viewport?.removeEventListener('scroll', measure);
    observer.disconnect();
  };
}
