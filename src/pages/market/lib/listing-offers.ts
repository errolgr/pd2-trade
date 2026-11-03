import type { TradeOffer } from '@/hooks/useTradeOffers';

/** The signed-in user's existing offers on one listing, newest first. */
export interface ListingOffers {
  /** Offers you made on it (buying). */
  mine: TradeOffer[];
  /** Offers others made on it (it is your listing). */
  received: TradeOffer[];
}

/**
 * Offers by listing id, from the offers lists the provider keeps (PD2 shows offers only to the buyer and
 * the seller). `outgoing` should include offers hidden from the chat: they still exist on PD2.
 */
export function indexListingOffers(
  outgoing: readonly TradeOffer[],
  incoming: readonly TradeOffer[],
): ReadonlyMap<string, ListingOffers> {
  const byListing = new Map<string, ListingOffers>();
  const add = (offer: TradeOffer, side: keyof ListingOffers) => {
    if (!offer.listingId) return;
    let entry = byListing.get(offer.listingId);
    if (!entry) {
      entry = { mine: [], received: [] };
      byListing.set(offer.listingId, entry);
    }
    entry[side].push(offer);
  };
  outgoing.forEach((o) => add(o, 'mine'));
  incoming.forEach((o) => add(o, 'received'));
  const newestFirst = (a: TradeOffer, b: TradeOffer) => b.timestamp.getTime() - a.timestamp.getTime();
  for (const entry of byListing.values()) {
    entry.mine.sort(newestFirst);
    entry.received.sort(newestFirst);
  }
  return byListing;
}

/** The listing accepted this offer. */
export const isAccepted = (offer: TradeOffer) => offer.acceptedOfferId === offer.id;
