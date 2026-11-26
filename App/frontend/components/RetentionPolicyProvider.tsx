import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '../api/client';
import { parseRetentionPolicy, type RetentionPolicy } from '../../shared/retention.js';

const RetentionContext = createContext<Readonly<RetentionPolicy> | null>(null);

/**
 * Read the shared policy; null means it is loading or could not be retrieved.
 * @returns The shared month-based retention policy, or null while loading or
 * after a failed request.
 */
export function useRetentionPolicy() {
  return useContext(RetentionContext);
}

/**
 * Context provider component that shares the backend retention policy with
 * expiry messages. Refresh on focus and ignore canceled responses so older
 * requests cannot win.
 * @returns The supplied children inside the retention-policy context.
 */
export default function RetentionPolicyProvider({ children }: { children: ReactNode }) {
  const [policy, setPolicy] = useState<Readonly<RetentionPolicy> | null>(null);
  /**
   * Load the shared expiry policy and refresh it when the user returns to the
   * page.
   * @returns Cleanup that cancels the active policy request and removes the
   * focus listener.
   */
  useEffect(() => {
    let alive = true;
    // Cancel the previous request before starting a replacement or leaving the page.
    let pending: AbortController | undefined;

    /** Replace any older retention request with a new cancelable request. */
    const refresh = () => {
      pending?.abort();
      const controller = new AbortController();
      pending = controller;
      void api('/retention', {
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(12000)]),
      })
        .then(
          /* Accept a valid policy only while this request and provider are still active. */
          (value) => {
            if (alive && !controller.signal.aborted) {
              setPolicy(parseRetentionPolicy(value));
            }
          },
        )
        .catch(
          /* Use fallback expiry wording if the active policy request fails. */
          () => {
            if (alive && !controller.signal.aborted) {
              setPolicy(null);
            }
          },
        );
    };

    refresh();
    window.addEventListener('focus', refresh);
    // Cancel the pending policy request and remove its focus listener.
    return () => {
      alive = false;
      pending?.abort();
      window.removeEventListener('focus', refresh);
    };
  }, []);
  return <RetentionContext.Provider value={policy}>{children}</RetentionContext.Provider>;
}
