import { useCallback, useRef, useState } from 'react';

/** Use with Toast for the same anchored reminder on every page. */
export function useNotice() {
  const [notice, setNotice] = useState<{ message: string; id: number; anchor: HTMLElement | null } | null>(null);
  const nextId = useRef(0);
  const dismissNotice = useCallback(() => setNotice(null), []);
  const notify = useCallback((message: string, anchor: HTMLElement | null) => {
    setNotice({ message, anchor, id: ++nextId.current });
  }, []);
  return { notice, notify, dismissNotice };
}
