/** Coordinates a small nonmodal disclosure and its outside/Escape dismissal. */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

/**
 * Disclosure hook shared by navigation and display options. Outside clicks close
 * without moving focus; Escape returns focus to the visible trigger.
 * @returns Open state, container/trigger refs, and open/close actions.
 */
export function useDisclosure() {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  /** Hide the disclosure without taking focus from the next action. */
  const close = useCallback(() => setOpen(false), []);

  /** Hide the disclosure and focus its trigger when the trigger is visible. */
  const closeAndFocus = useCallback(() => {
    setOpen(false);
    if (trigger.current?.getClientRects().length) {
      trigger.current.focus({ preventScroll: true });
    }
  }, []);

  /** Toggle the disclosure using its latest state. */
  const toggle = useCallback(
    () =>
      setOpen(
        /* Reverse the current state rather than a captured render's value. */
        (value) => !value,
      ),
    [],
  );

  /**
   * Listen only while open; clicks inside, including native selects, stay open.
   * @returns Cleanup for the document pointer and keyboard listeners.
   */
  useEffect(() => {
    if (!open) {
      return;
    }

    /** Close when the pointer is outside this disclosure. */
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !container.current?.contains(event.target)) {
        close();
      }
    };

    /** Dismiss on Escape without propagating it to another open surface. */
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeAndFocus();
      }
    };

    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', keyboard);
    // Remove listeners when closed or unmounted.
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', keyboard);
    };
  }, [
    open,
    close,
    closeAndFocus,
  ]);

  return {
    open,
    container,
    trigger,
    toggle,
    close,
    closeAndFocus,
  };
}
