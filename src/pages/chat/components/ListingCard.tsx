import React, { useState } from 'react';
import moment from 'moment';
import { Package, User as UserIcon } from 'lucide-react';
import { openUrl } from '@/lib/browser-opener';
import { cn } from '@/lib/utils';
import { useItems } from '@/hooks/useItems';
import { isUserOnlineIngame } from '@/lib/user-online-status';
import { HoverPopover } from '@/components/custom/hover-popover';
import { PopoverKeyValue } from '@/components/custom/popover-parts';
import { Skeleton } from '@/components/ui/skeleton';
import { qualityColor } from '@/pages/price-check/lib/qualityColor';
import ItemStatsDisplay from '@/pages/quick-list/components/ItemStatsDisplay';
import type { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { listingArtUrl } from '../lib/listing-art';

const cardClass =
  'my-1 flex w-72 max-w-full items-center gap-2.5 rounded-xl border border-border/70 bg-background/50 p-2 text-left';

/** Same footprint as a loaded card, so the bubble doesn't jump when the listing arrives. */
export function ListingCardSkeleton() {
  return (
    <div className={cardClass}
      aria-label="Loading listing">
      <Skeleton className="size-12 shrink-0 rounded-lg" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}

function ItemArt({ listing }: { listing: MarketListingEntry }) {
  const { itemsMapByKey } = useItems();
  const [failed, setFailed] = useState(false);
  const src = listingArtUrl(listing.item, itemsMapByKey);
  if (!src || failed) return <Package className="size-6 text-muted-foreground" />;
  return (
    <img
      src={src}
      alt=""
      className="max-h-11 max-w-11 object-contain drop-shadow-[0_2px_4px_rgb(0_0_0/0.35)]"
      onError={() => setFailed(true)}
    />
  );
}

const nameColor = (listing: MarketListingEntry) =>
  listing.item.is_runeword || / Rune$/.test(listing.item.name)
    ? 'text-q-rune'
    : qualityColor(listing.item.quality?.name ?? '');

/** Hover detail: full stats plus the trade context the card leaves out. */
function ListingDetails({ listing, listed }: { listing: MarketListingEntry; listed: boolean }) {
  const { item, user } = listing;
  const online = listed && isUserOnlineIngame(listing.user_last_ingame);
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
 * A listing linked in chat. At a glance: art, name, base, price and whether it's still listed;
 * stats, seller, mode and age live in the hover popover.
 */
export function ListingCard({ listing, listed, url }: { listing: MarketListingEntry; listed: boolean; url: string }) {
  const { item } = listing;
  const sockets = item.socket_count || 0;
  return (
    <HoverPopover side="right"
      content={<ListingDetails listing={listing}
        listed={listed} />}>
      <a
        href={url}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          openUrl(url);
        }}
        className={cn(
          cardClass,
          'transition-[border-color,background-color,transform] duration-(--dur-fast) ease-out hover:border-info/40 hover:bg-accent/40',
          'active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
        )}
      >
        <div
          className={cn(
            'flex size-12 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/40',
            !listed && 'opacity-50 grayscale',
          )}
        >
          <ItemArt listing={listing} />
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <div className={cn('truncate text-sm font-semibold', nameColor(listing))}>{item.name}</div>
          {item.base?.name && item.base.name !== item.name && (
            <div className="truncate text-xs text-muted-foreground">{item.base.name}</div>
          )}
          <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs">
            <span className={cn('truncate tabular-nums', listing.hr_price ? 'font-semibold' : 'text-foreground/85')}>
              {listing.hr_price ? `${listing.hr_price} HR` : listing.price || 'No price'}
            </span>
            {item.is_ethereal && <span className="shrink-0 text-info">Eth</span>}
            {item.corrupted && <span className="shrink-0 text-q-corrupted">Corrupted</span>}
            {sockets > 0 && <span className="shrink-0 text-muted-foreground">{`${sockets} os`}</span>}
          </div>
        </div>
        {!listed && (
          <span className="shrink-0 self-start rounded-full border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            Unlisted
          </span>
        )}
      </a>
    </HoverPopover>
  );
}
