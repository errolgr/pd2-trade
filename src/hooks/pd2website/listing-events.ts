/**
 * The user's market listings removed from anywhere (Manage tab, Ctrl+U delist, its picker, chat):
 * deleteMarketListing publishes each one once the API confirmed it, so the quick list's cached listings and
 * count drop it without a refetch of their own. In-process only; nothing is buffered for late subscribers.
 */
type Listener = (listingId: string) => void;
const listeners = new Set<Listener>();

export function publishListingDeleted(listingId: string): void {
  listeners.forEach((listener) => listener(listingId));
}

/** Returns the unsubscribe function. */
export function subscribeListingDeleted(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
