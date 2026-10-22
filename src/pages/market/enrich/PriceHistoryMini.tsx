import React from 'react';
import { Loader2 } from 'lucide-react';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { fmtBandHr, plural } from '@/components/rares/rares-format';
import { PriceSparkline } from '@/pages/price-check/components/PriceSparkline';
import { shortAgo } from '@/pages/chat/hooks/useTraderProfile';
import { usePriceHistory } from './usePriceHistory';
import { useNow } from './useNow';

/** Earlier listings shown for a rare. */
const RARE_ROWS = 5;

/**
 * Detail-pane price history: the 30-day market line for economy items, earlier listings of the same item for
 * rares/crafted. Renders nothing when there is no history to show.
 */
export function PriceHistoryMini({ listing }: { listing: MarketListingEntry }) {
  const state = usePriceHistory(listing);
  const now = useNow();
  if (state.kind === 'none') return null;

  if (state.kind === 'economy') {
    return (
      <section aria-label="Price history"
        className="space-y-1">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">30-day market</div>
        <PriceSparkline query={state.query} />
      </section>
    );
  }

  if (state.status === 'loading') {
    return (
      <div className="flex h-6 items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="size-3 animate-spin" />
        Loading item history...
      </div>
    );
  }

  const { history } = state;
  return (
    <section aria-label="Item history"
      className="space-y-1">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Seen before</div>
      <div className="text-xs text-muted-foreground">
        Listed {plural(history.timesListed, 'time')} by {plural(history.distinctSellers, 'seller')}, first{' '}
        {shortAgo(Date.parse(history.firstSeen), now)}
      </div>
      <ul className="space-y-0.5 text-xs">
        {history.listings.slice(0, RARE_ROWS).map((l) => (
          <li key={`${l.listedAt}|${l.lastSeenAt}`}
            className="flex items-baseline gap-2">
            <span className="w-14 shrink-0 text-muted-foreground tabular-nums">
              {shortAgo(Date.parse(l.listedAt), now)}
            </span>
            <span className="min-w-0 truncate tabular-nums">
              {l.hrPrice !== null && l.hrPrice > 0 ? `${fmtBandHr(l.hrPrice)} HR` : (l.priceText ?? '—')}
            </span>
            {l.sellerChanged && <span className="shrink-0 text-[10px] text-info">new seller</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}
