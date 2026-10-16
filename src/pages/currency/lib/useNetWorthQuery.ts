import { useCallback, useEffect, useState } from 'react';
import { NetWorthApiError } from '@/lib/networth-api';

export interface NetWorthQuery<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

interface Settled<T> {
  load: () => Promise<T>;
  nonce: number;
  refreshKey: string | null | undefined;
  data: T | null;
  error: string | null;
}

/**
 * Runs `load` whenever its identity (memoize it with useCallback) or `refreshKey` changes, and on `reload()`.
 * The previous result stays visible while a reload is in flight. `load === null` means disabled: no data.
 */
export function useNetWorthQuery<T>(load: (() => Promise<T>) | null, refreshKey?: string | null): NetWorthQuery<T> {
  const [nonce, setNonce] = useState(0);
  const [settled, setSettled] = useState<Settled<T> | null>(null);

  useEffect(() => {
    if (!load) return;
    let cancelled = false;
    load().then(
      (data) => {
        if (!cancelled) setSettled({ load, nonce, refreshKey, data, error: null });
      },
      (err: unknown) => {
        if (cancelled) return;
        const error =
          err instanceof NetWorthApiError && err.status === 401
            ? 'Your PD2 session expired. Sign in again.'
            : err instanceof Error
              ? err.message
              : String(err);
        setSettled({ load, nonce, refreshKey, data: null, error });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [load, nonce, refreshKey]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  if (!load) return { data: null, loading: false, error: null, reload };
  const current = settled?.load === load && settled.nonce === nonce && settled.refreshKey === refreshKey;
  return { data: settled?.data ?? null, loading: !current, error: current ? settled.error : null, reload };
}
