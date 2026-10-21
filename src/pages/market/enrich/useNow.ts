import { useEffect, useState } from 'react';

/** Epoch ms, re-read every `tickMs`, for "3d ago" style labels (as the chat overlay's clock). */
export function useNow(tickMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), tickMs);
    return () => window.clearInterval(id);
  }, [tickMs]);
  return now;
}
