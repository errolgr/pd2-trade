import type { WtbResponse } from '../lib/wtb';
import type { MarketAlert } from './market-api';

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

/**
 * Responses to the user's buy requests as they arrive on the same stream (`wtb.response`): Chat and the request
 * drawer's Responses list add them without refetching. In-process only, like the alerts.
 */
type ResponseListener = (response: WtbResponse) => void;
const responseListeners = new Set<ResponseListener>();

export function publishWtbResponse(response: WtbResponse): void {
  responseListeners.forEach((listener) => listener(response));
}

/** Returns the unsubscribe function. */
export function subscribeWtbResponses(listener: ResponseListener): () => void {
  responseListeners.add(listener);
  return () => {
    responseListeners.delete(listener);
  };
}
