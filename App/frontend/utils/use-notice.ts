import { useCallback, useEffect, useRef, useState } from 'react';
import { revealRequiredField, type RequiredField } from './reveal-required-field';

/**
 * React Hook for one anchored Toast reminder and its required-field reveal.
 * Replacing or dismissing a notice cancels the previous reveal, avoiding late popups.
 * @returns The current reminder and actions to show it, reveal its field, or dismiss it.
 */
export function useNotice() {
  const [notice, setNotice] = useState<{
    message: string;
    id: number;
    anchor: HTMLElement | null;
  } | null>(null);
  // A fresh id lets Toast restart its lifetime even when the message is unchanged.
  const nextId = useRef(0);
  const pending = useRef<AbortController | null>(null);

  /**
   * Cancel the current reminder and release any pending scroll listeners.
   */
  const cancelPending = useCallback(() => {
    pending.current?.abort();
    pending.current = null;
  }, []);

  /** Cancel a pending field reminder when this hook unmounts. */
  useEffect(() => cancelPending, [cancelPending]);

  /** Cancel any pending reveal and close the current reminder. */
  const dismissNotice = useCallback(() => {
    cancelPending();
    setNotice(null);
  }, [cancelPending]);

  /** Replace the current reminder at the supplied anchor. */
  const notify = useCallback(
    (message: string, anchor: HTMLElement | null) => {
      cancelPending();
      setNotice({ message, anchor, id: ++nextId.current });
    },
    [cancelPending],
  );

  /**
   * Scroll to and focus a required field before showing its reminder.
   * Show nothing if the reveal was canceled, interrupted, or the field was filled.
   */
  const notifyRequired = useCallback(
    async (message: string, field: RequiredField | null) => {
      dismissNotice();
      if (!field) {
        return;
      }
      // Each reminder owns a controller, so cancellation cannot affect its replacement.
      const controller = new AbortController();
      pending.current = controller;
      const ready = await revealRequiredField(field, controller.signal);
      if (pending.current === controller) {
        pending.current = null;
      }
      if (ready && !controller.signal.aborted) {
        notify(message, field);
      }
    },
    [dismissNotice, notify],
  );

  return { notice, notify, notifyRequired, dismissNotice };
}
