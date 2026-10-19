import React, { useState } from 'react';
import moment from 'moment';
import { Package, User as UserIcon } from 'lucide-react';
import { openUrl } from '@/lib/browser-opener';
import { cn } from '@/lib/utils';
import { useItems } from '@/hooks/useItems';
import { isUserOnlineIngame } from '@/lib/user-online-status';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PopoverKeyValue } from '@/components/custom/popover-parts';
import { Skeleton } from '@/components/ui/skeleton';
import { qualityColor } from '@/pages/price-check/lib/qualityColor';
import ItemStatsDisplay from '@/pages/quick-list/components/ItemStatsDisplay';
import type { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { listingArtUrl } from '../lib/listing-art';
import { type ListingMarketPrice, useListingMarketPrices } from '../hooks/useListingMarketPrices';

/**
 * Inline pill for listing links, so "interested in your [Ohm Rune 75 wss]" reads as one sentence. Shared by
 * the item card and the plain link MessageContent falls back to when a listing can't be looked up.
 */
export const listingPillClass = cn(
  'mx-0.5 inline-flex max-w-full items-center gap-1.5 rounded-md border border-border/70 bg-background/50 py-0.5 pr-2 pl-0.5 align-middle text-sm',
  'transition-[border-color,background-color,transform] duration-(--dur-fast) ease-out hover:border-info/40 hover:bg-accent/40',
  'active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
);

/** Thumbnail tile at the pill's start, a shade off the pill so the art reads as its own slot. */
export const listingIconBoxClass =
  'flex size-6 shrink-0 items-center justify-center rounded-[5px] border border-border/60 bg-muted/70';

/** Same footprint as a loaded pill, so the sentence doesn't reflow much when the listing arrives. */
export function ListingCardSkeleton() {
  return <Skeleton aria-label="Loading listing"
    className="mx-0.5 inline-block h-[30px] w-36 align-middle" />;
}

function ItemArt({ listing }: { listing: MarketListingEntry }) {
  const { itemsMapByKey } = useItems();
  const [failed, setFailed] = useState(false);
  const src = listingArtUrl(listing.item, itemsMapByKey);
  if (!src || failed) return <Package className="size-3.5 text-muted-foreground" />;
  return <img src={src}
    alt=""
    className="max-h-5 max-w-5 object-contain"
    onError={() => setFailed(true)} />;
}

const nameColor = (listing: MarketListingEntry) =>
  listing.item.is_runeword || / Rune$/.test(listing.item.name)
    ? 'text-q-rune'
    : qualityColor(listing.item.quality?.name ?? '');

/** Compact stash tab, as the net worth tabs label it: "Shared 3", "Personal", else the storage name. */
function stashLabel(listing: MarketListingEntry): string | null {
  const location = listing.item.location;
  if (!location?.storage) return null;
  if (/shared/i.test(location.storage)) {
    return typeof location.stash_page === 'number' ? `Shared ${location.stash_page}` : 'Shared';
  }
  if (/^(personal )?stash$/i.test(location.storage)) return 'Personal';
  return location.storage;
}

/** "12% under market" / "5% over market" / "at market" for an asking price against the market price. */
function marketDelta(askingHr: number, marketHr: number): { text: string; className: string } {
  const percent = Math.round(((askingHr - marketHr) / marketHr) * 100);
  if (percent === 0) return { text: 'at market', className: 'text-muted-foreground' };
  return percent < 0
    ? { text: `${-percent}% under market`, className: 'text-success' }
    : { text: `${percent}% over market`, className: 'text-warning' };
}

/** Hover detail: full stats plus the trade context the card leaves out. */
function ListingDetails({
  listing,
  listed,
  market,
}: {
  listing: MarketListingEntry;
  listed: boolean;
  market: ListingMarketPrice | undefined;
}) {
  const { item, user } = listing;
  const online = listed && isUserOnlineIngame(listing.user_last_ingame);
  const delta = market && listing.hr_price > 0 ? marketDelta(listing.hr_price, market.hr) : null;
  return (
    <div className="w-80 max-w-[calc(100vw-16px)] rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-panel">
      <div className={cn('truncate text-sm font-semibold', nameColor(listing))}>{item.name}</div>
      {item.base?.name && item.base.name !== item.name && (
        <div className="truncate text-xs text-muted-foreground">{item.base.name}</div>
      )}
      <ItemStatsDisplay
        // Listing ItemDetail is a superset-compatible view of the stash item for display purposes.
        stashItem={item as unknown as GameStashItem}
        isExpanded={true}
        onToggleExpanded={() => {}}
        hideToggle={true}
      />
      <div className="mt-2 space-y-1 border-t border-border pt-2 text-xs">
        {listing.hr_price > 0 && <PopoverKeyValue label="Price">{`${listing.hr_price} HR`}</PopoverKeyValue>}
        {market && (
          <PopoverKeyValue label="Market">
            {`${Number(market.hr.toFixed(2))} HR `}
            <span className="text-muted-foreground">{`· ${market.window}`}</span>
            {delta && <span className={cn('ml-1.5', delta.className)}>{delta.text}</span>}
          </PopoverKeyValue>
        )}
        {listing.price && (
          <div className="flex justify-between gap-3">
            <span className="shrink-0 text-muted-foreground">Note:</span>
            <span className="min-w-0 break-words text-right">{listing.price}</span>
          </div>
        )}
        <PopoverKeyValue label="Status">
          {listed ? `Listed, bumped ${moment(listing.bumped_at).fromNow()}` : 'Sold or delisted'}
        </PopoverKeyValue>
        <PopoverKeyValue label="Mode">
          {`${listing.is_ladder ? 'Ladder' : 'Non-ladder'} · ${listing.is_hardcore ? 'Hardcore' : 'Softcore'}`}
        </PopoverKeyValue>
        {stashLabel(listing) && (
          <PopoverKeyValue label="Stash">
            {`${stashLabel(listing)}${item.position ? ` · column ${item.position.column + 1}, row ${item.position.row + 1}` : ''}`}
          </PopoverKeyValue>
        )}
        {item.item_level > 0 && <PopoverKeyValue label="Item level">{item.item_level}</PopoverKeyValue>}
        {item.requirements?.level > 0 && (
          <PopoverKeyValue label="Required level">{item.requirements.level}</PopoverKeyValue>
        )}
        {user?.username && (
          <div className="flex items-center gap-1.5 pt-1 text-muted-foreground">
            <UserIcon className="size-3" />
            Seller: <span className="text-foreground">{user.username}</span>
            {online && (
              <span className="size-2 rounded-full bg-success ring-2 ring-success/25"
                title="Online in-game" />
            )}
          </div>
        )}
      </div>
      <div className="mt-2 border-t border-border pt-2 text-[11px] text-muted-foreground">
        Click to open on projectdiablo2.com
      </div>
    </div>
  );
}

/**
 * A listing linked in chat, inline in the sentence: thumbnail, name and whether it's still listed;
 * price, stash location, base, stats, seller, mode and age live in the hover popover.
 */
export function ListingCard({ listing, listed, url }: { listing: MarketListingEntry; listed: boolean; url: string }) {
  const [open, setOpen] = useState(false);
  // Fetched with the pill rather than on hover, so the popover opens priced; a thread's pills share one batch.
  const market = useListingMarketPrices([listing]).get(listing._id);
  return (
    <Popover open={open}
      onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <a
          href={url}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            openUrl(url);
          }}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          className={listingPillClass}
        >
          <span className={cn(listingIconBoxClass, !listed && 'opacity-50 grayscale')}>
            <ItemArt listing={listing} />
          </span>
          <span className={cn('truncate font-semibold', nameColor(listing))}>{listing.item.name}</span>
          {!listed && (
            <span className="shrink-0 rounded-sm bg-muted px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Unlisted
            </span>
          )}
        </a>
      </PopoverTrigger>
      <PopoverContent
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onOpenAutoFocus={(e) => e.preventDefault()}
        side="top"
        align="start"
        className="w-auto border-0 bg-transparent p-0 shadow-none"
      >
        <ListingDetails listing={listing}
          listed={listed}
          market={market} />
      </PopoverContent>
    </Popover>
  );
}
