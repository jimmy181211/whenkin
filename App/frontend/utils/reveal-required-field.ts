/** Inputs that can receive a required-field reminder. */
export type RequiredField = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

/** Check that the field fits inside the visible viewport, including a mobile keyboard. */
function isVisible(field: RequiredField) {
  const rect = field.getBoundingClientRect();
  const viewport = window.visualViewport;
  const top = viewport?.offsetTop ?? 0;
  return rect.top >= top && rect.bottom <= top + (viewport?.height ?? window.innerHeight);
}

/** Wait for native scrollend events; cancellation releases the obsolete reminder's listeners. */
function scrollToField(field: RequiredField, signal: AbortSignal): Promise<boolean> {
  return new Promise(
    /** Track native events only; no animation loop or position polling is needed. */
    (resolve) => {
      // One controller releases all listeners when this wait ends.
      const listeners = new AbortController();
      const moving = new Set<EventTarget>();
      const events = [
        'scroll',
        'scrollend',
        'wheel',
        'touchmove',
        'keydown',
        'resize',
        'pointerdown',
      ];

      /** Release listeners and report whether this reminder should continue. */
      const finish = (arrived: boolean) => {
        clearTimeout(timer);
        listeners.abort();
        resolve(arrived);
      };

      /** Track native scrolling until every container ends; user input cancels the reminder. */
      const handleEvent = (event: Event) => {
        if (event.type === 'scroll' && event.target) {
          moving.add(event.target);
        } else if (event.type === 'scrollend') {
          if (event.target && moving.delete(event.target) && !moving.size) {
            finish(true);
          }
        } else {
          finish(false);
        }
      };

      /** Avoid an endless wait if the browser cannot move the field or emits no end event. */
      const timer = setTimeout(() => finish(false), 5000);
      /** Cancel an obsolete reminder without waiting for scrolling to finish. */
      signal.addEventListener('abort', () => finish(false), { signal: listeners.signal });
      for (const type of events) {
        window.addEventListener(type, handleEvent, {
          capture: true,
          passive: true,
          signal: listeners.signal,
        });
      }
      field.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    },
  );
}

/**
 * Reveal and focus an empty field using browser scrolling and completion events.
 * Already-visible fields need no scroll; reduced motion and older browsers use instant scrolling.
 * @param signal - Cancels this reminder when it is replaced, dismissed, or unmounted.
 * @returns Whether the field is visible and focused; false on cancellation or failed scrolling.
 */
export async function revealRequiredField(
  field: RequiredField,
  signal: AbortSignal,
): Promise<boolean> {
  if (signal.aborted || !field.isConnected || field.value.trim()) {
    return false;
  }
  if (!isVisible(field)) {
    const instant =
      window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('onscrollend' in document);
    if (instant) {
      field.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'nearest' });
    } else if (!(await scrollToField(field, signal))) {
      return false;
    }
  }
  if (signal.aborted || !field.isConnected || field.value.trim() || !isVisible(field)) {
    return false;
  }
  field.focus({ preventScroll: true });
  return true;
}
