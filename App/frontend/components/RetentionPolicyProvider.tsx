import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '../api/client';
import { parseRetentionPolicy, type RetentionPolicy } from '../../shared/retention.mjs';

const RetentionContext = createContext<Readonly<RetentionPolicy> | null>(null);
export function useRetentionPolicy() { return useContext(RetentionContext); }

export default function RetentionPolicyProvider({ children }: { children: ReactNode }) {
  const [policy, setPolicy] = useState<Readonly<RetentionPolicy> | null>(null);
  useEffect(() => {
    let alive = true;
    let pending: AbortController | undefined;
    const refresh = () => {
      pending?.abort();
      const controller = new AbortController(); pending = controller;
      void api('/retention', { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(12000)]) })
        .then(value => { if (alive && !controller.signal.aborted) setPolicy(parseRetentionPolicy(value)); })
        .catch(() => { if (alive && !controller.signal.aborted) setPolicy(null); });
    };
    refresh(); window.addEventListener('focus', refresh);
    return () => { alive = false; pending?.abort(); window.removeEventListener('focus', refresh); };
  }, []);
  return <RetentionContext.Provider value={policy}>{children}</RetentionContext.Provider>;
}
