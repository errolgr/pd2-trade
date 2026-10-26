import React from 'react';
import type { TradeOffer } from '@/hooks/useTradeOffers';
import { useChatListings } from '../hooks/useChatListings';
import { useListingMarketPrices } from '../hooks/useListingMarketPrices';
import { OfferHoverCard } from './ThreadDeals';

/**
 * The offer hover card for a lone offer (an offer row in the conversation), looking its listing up itself.
 * Listing lookups are cached app-wide and market prices batched per tick, so each row costs one lookup at most.
 */
export function OfferListingHoverCard({ offer, children }: { offer: TradeOffer; children: React.ReactElement }) {
  const states = useChatListings(offer.listingId ? [offer.listingId] : []);
  const state = offer.listingId ? states.get(offer.listingId) : undefined;
  const listing = state && 'listing' in state ? state.listing : undefined;
  const prices = useListingMarketPrices(listing ? [listing] : []);
  return (
    <OfferHoverCard
      offer={offer}
      listing={listing}
      listed={state?.status === 'listed'}
      loading={state?.status === 'loading'}
      market={listing && prices.get(listing._id)}
      align="center"
    >
      {children}
    </OfferHoverCard>
  );
}
