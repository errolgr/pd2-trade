/**
 * The user's market listings removed from anywhere (Manage tab, Ctrl+U delist, its picker, chat, auto-delist):
 * deleteMarketListing publishes each one once the API confirmed it, so the quick list's cached listings and
 * count drop it without a refetch of their own. In-process only; nothing is buffered for late subscribers.
 */
type Listener = (listingId: string) => void;
const listeners = new Set<Listener>();

/**
 * Every listing deleted this session. PD2's listing queries can still return a listing after its DELETE went
 * through, and deleteMarketListing takes a 404 as done, so acting on such a result would delete (and announce)
 * it twice. A listing id never comes back: relisting creates a new one.
 */
const deleted = new Set<string>();

export function publishListingDeleted(listingId: string): void {
  deleted.add(listingId);
  listeners.forEach((listener) => listener(listingId));
}

export function isListingDeleted(listingId: string): boolean {
  return deleted.has(listingId);
}

/** Returns the unsubscribe function. */
export function subscribeListingDeleted(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
