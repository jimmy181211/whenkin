import { useCallback, useEffect, useRef, useState } from 'react';
import { revealRequiredField, type RequiredField } from './reveal-required-field';

/** Use with Toast for the same anchored reminder on every page. */
export function useNotice() {
  const [notice, setNotice] = useState<{ message: string; id: number; anchor: HTMLElement | null } | null>(null);
  const nextId = useRef(0);
  const pending = useRef<AbortController | null>(null);
  const cancelPending = useCallback(() => { pending.current?.abort(); pending.current = null; }, []);
  useEffect(() => cancelPending, [cancelPending]);
  const dismissNotice = useCallback(() => { cancelPending(); setNotice(null); }, [cancelPending]);
  const notify = useCallback((message: string, anchor: HTMLElement | null) => {
    cancelPending();
    setNotice({ message, anchor, id: ++nextId.current });
  }, [cancelPending]);
  const notifyRequired = useCallback(async (message: string, field: RequiredField | null) => {
    cancelPending();
    setNotice(null);
    if (!field) return;
    const controller = new AbortController();
    pending.current = controller;
    const ready = await revealRequiredField(field, controller.signal);
    if (pending.current === controller) pending.current = null;
    if (ready && !controller.signal.aborted) notify(message, field);
  }, [cancelPending, notify]);
  return { notice, notify, notifyRequired, dismissNotice };
}
