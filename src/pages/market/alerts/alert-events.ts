import type { MarketAlert } from './saved-search-api';

/**
 * Live market alerts as they arrive (useMarketAlerts publishes each batch): the open market panel listens to
 * light up the cards of its watched search. In-process only; nothing is buffered for late subscribers.
 */
type Listener = (alerts: readonly MarketAlert[]) => void;
const listeners = new Set<Listener>();

export function publishMarketAlerts(alerts: readonly MarketAlert[]): void {
  listeners.forEach((listener) => listener(alerts));
}

/** Returns the unsubscribe function. */
export function subscribeMarketAlerts(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
