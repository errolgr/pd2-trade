import React from 'react';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { PriceSparkline } from '@/pages/price-check/components/PriceSparkline';
import { usePriceHistory } from './usePriceHistory';

/**
 * Detail-pane price line: the 30-day market for economy items. Rares show their history in the pane's
 * Market section (ListingMarket). Renders nothing without a line to show.
 */
export function PriceHistoryMini({ listing }: { listing: MarketListingEntry }) {
  const state = usePriceHistory(listing);
  if (state.kind !== 'economy') return null;
  return (
    <section aria-label="Price history"
      className="space-y-1">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">30-day market</div>
      <PriceSparkline query={state.query} />
    </section>
  );
}
