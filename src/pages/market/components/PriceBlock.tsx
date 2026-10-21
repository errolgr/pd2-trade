import React from 'react';
import { cn } from '@/lib/utils';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { DealBadge } from '@/pages/market/enrich/DealBadge';
import type { Deal } from '@/pages/market/enrich/useDealIndicators';
import { formatHrAmount } from './ResultsList';

/**
 * The listing's price as the primary decision number: HR amount as the hero with a small unit, the seller's
 * note muted below, the deal badge under it. Note-only listings show the note itself large with an "offer" label.
 */
export function PriceBlock({
  listing,
  deal,
  align = 'end',
  className,
}: {
  listing: MarketListingEntry;
  deal: Deal | undefined;
  /** `end`: card header (right-aligned chip); `start`: full-width block (detail pane). */
  align?: 'start' | 'end';
  className?: string;
}) {
  const amount = formatHrAmount(listing.hr_price);
  const note = listing.price?.trim() ?? '';
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-1 rounded-md border border-l-2 border-border/60 border-l-q-gold/70 bg-q-gold/[0.06] px-2.5 py-1.5',
        align === 'end' ? 'items-end text-right' : 'items-start text-left',
        className,
      )}
    >
      {amount ? (
        <span className="flex items-baseline gap-1 leading-none"
          title={`${amount} HR`}>
          <span className="text-[22px] font-bold tabular-nums text-foreground">{amount}</span>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-q-gold">HR</span>
        </span>
      ) : (
        <>
          <span className="text-[10px] font-medium uppercase leading-none tracking-wider text-q-gold">offer</span>
          <span
            className={cn(
              'max-w-full break-words text-base font-bold leading-tight',
              note ? 'text-foreground' : 'text-muted-foreground',
              note && (align === 'end' ? 'line-clamp-2' : 'whitespace-pre-wrap'),
            )}
            title={note || undefined}
          >
            {note || 'No price'}
          </span>
        </>
      )}
      {amount && note && (
        <span
          className={cn(
            'max-w-full text-[11px] leading-tight text-muted-foreground',
            align === 'end' ? 'truncate' : 'whitespace-pre-wrap break-words',
          )}
          title={note}
        >
          {note}
        </span>
      )}
      <DealBadge deal={deal} />
    </div>
  );
}
