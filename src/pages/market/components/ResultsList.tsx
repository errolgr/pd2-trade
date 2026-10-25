import React, { useEffect, useRef, useState } from 'react';
import moment from 'moment';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Heart, Loader2, Sigma } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { isUserOnlineIngame } from '@/lib/user-online-status';
import { ListingThumb } from '@/pages/chat/components/ListingCard';
import { DealBadge } from '@/pages/market/enrich/DealBadge';
import type { Deal } from '@/pages/market/enrich/useDealIndicators';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { listingAge } from '../lib/listing';
import { statWithValue } from './stat-text';
import type { ScoredListing } from '../lib/types';
import { displayMods, itemNameColor } from './ItemTooltip';
import { EnterOnce, type EnterTracker } from './EnterOnce';
import { SellerName } from './SellerName';
import { useOpenTrader } from '../hooks/useListingActions';

const ROW_HEIGHT = 58;
/** Rows from the end at which the next server page is requested. */
const LOAD_MORE_AHEAD = 6;
const SUMMARY_MODS = 4;

/** "2.5 HR" / "0.75 HR"; null when the listing has no HR price (note only). */
export function formatHrPrice(hr: number): string | null {
  if (!(hr > 0)) return null;
  return `${hr >= 10 ? Math.round(hr * 10) / 10 : Math.round(hr * 100) / 100} HR`;
}

/** A failed next-page load (see useMarketSearch). */
export interface LoadMoreState {
  error: string | null;
  /** Rate limited: Retry stays disabled until then (epoch ms). */
  retryAt: number | null;
  onRetry: () => void;
}

/** Under the results: "Loading more…", or "Couldn't load more · Retry" after a failed page. */
export function LoadMoreFooter({ loading, error, retryAt, onRetry }: LoadMoreState & { loading: boolean }) {
  // Rate limited: Retry unlocks when `retryAt` has passed (the timer marks it; no clock read during render)
  const [unlockedAt, setUnlockedAt] = useState<number | null>(null);
  const waiting = retryAt !== null && unlockedAt !== retryAt;
  useEffect(() => {
    if (retryAt === null) return;
    const timer = window.setTimeout(() => setUnlockedAt(retryAt), Math.max(0, retryAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [retryAt]);

  if (loading) {
    return (
      <div aria-busy
        className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" />
        Loading more…
      </div>
    );
  }
  if (!error) return null;
  return (
    <div role="status"
      className="flex items-center justify-center gap-1.5 py-2 text-xs text-muted-foreground">
      <span title={error}>{"Couldn't load more"}</span>
      <span aria-hidden>·</span>
      <button
        type="button"
        disabled={waiting}
        title={waiting && retryAt !== null ? `Rate limited until ${moment(retryAt).format('LT')}` : error}
        onClick={onRetry}
        className="rounded-sm font-medium text-primary underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/60 disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
      >
        Retry
      </button>
    </div>
  );
}

/** Site and in-game presence dots of a listing's seller. */
export function OnlineDots({ listing, className }: { listing: MarketListingEntry; className?: string }) {
  const site = isUserOnlineIngame(listing.user_last_online);
  const game = isUserOnlineIngame(listing.user_last_ingame);
  return (
    <span
      className={cn('inline-flex items-center gap-0.5', className)}
      title={`${site ? 'Online' : 'Offline'} on the site · ${game ? 'in game' : 'not in game'}`}
    >
      <span className={cn('size-1.5 rounded-full', site ? 'bg-info' : 'bg-muted-foreground/35')} />
      <span
        className={cn('size-1.5 rounded-full', game ? 'bg-success ring-2 ring-success/25' : 'bg-muted-foreground/35')}
      />
    </span>
  );
}

export interface ResultsListProps {
  rows: ScoredListing[];
  selectedId: string | null;
  /** Click: select the row and show it in the detail pane. */
  onSelect: (listingId: string) => void;
  deals: ReadonlyMap<string, Deal>;
  /** Enabled pseudo stat keys: their totals show on each row. */
  pseudoKeys: string[];
  favoriteIds: Set<string>;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  /** A failed next page: the footer offers Retry instead of loading on scroll. */
  loadMore: LoadMoreState;
  /** Entrance animations of this result set (rows enter once; see EnterOnce). */
  enter: EnterTracker;
  footer?: React.ReactNode;
}

/** Virtualized compact listing rows. */
export function ResultsList({
  rows,
  selectedId,
  onSelect,
  deals,
  pseudoKeys,
  favoriteIds,
  hasMore,
  loadingMore,
  onLoadMore,
  loadMore,
  enter,
  footer,
}: ResultsListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line react-hooks/incompatible-library -- no React Compiler; the virtualizer re-renders us
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () =>
      containerRef.current?.querySelector<HTMLDivElement>('[data-slot="scroll-area-viewport"]') ?? null,
    estimateSize: () => ROW_HEIGHT,
    getItemKey: (index) => rows[index].listing._id,
    overscan: 10,
  });

  // Keep the keyboard selection in view
  const selectedIndex = selectedId ? rows.findIndex((r) => r.listing._id === selectedId) : -1;
  useEffect(() => {
    if (selectedIndex >= 0) virtualizer.scrollToIndex(selectedIndex, { align: 'auto' });
  }, [selectedIndex, virtualizer]);

  // Infinite load: the last rendered row is near the end
  const lastVisible = virtualizer.getVirtualItems().at(-1)?.index ?? -1;
  useEffect(() => {
    if (hasMore && !loadingMore && rows.length > 0 && lastVisible >= rows.length - LOAD_MORE_AHEAD) onLoadMore();
  }, [hasMore, loadingMore, lastVisible, rows.length, onLoadMore]);

  return (
    <ScrollArea
      ref={containerRef}
      className="min-h-0 flex-1 overflow-hidden [&_[data-radix-scroll-area-viewport]>div]:!block"
    >
      <div
        role="listbox"
        aria-label="Listings"
        className="relative w-full"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualizer.getVirtualItems().map((item) => {
          const row = rows[item.index];
          return (
            <div
              key={`${enter.generation}:${item.key}`}
              className="absolute left-0 top-0 w-full"
              style={{ transform: `translateY(${item.start}px)`, height: ROW_HEIGHT }}
            >
              <EnterOnce tracker={enter}
                id={row.listing._id}
                index={item.index}
                className="h-full">
                <ResultRow
                  row={row}
                  selected={row.listing._id === selectedId}
                  onSelect={onSelect}
                  deal={deals.get(row.listing._id)}
                  pseudoKeys={pseudoKeys}
                  favorite={favoriteIds.has(row.listing._id)}
                />
              </EnterOnce>
            </div>
          );
        })}
      </div>
      <LoadMoreFooter loading={loadingMore}
        {...loadMore} />
      {footer}
    </ScrollArea>
  );
}

const ResultRow = React.memo(function ResultRow({
  row,
  selected,
  onSelect,
  deal,
  pseudoKeys,
  favorite,
}: {
  row: ScoredListing;
  selected: boolean;
  onSelect: (id: string) => void;
  deal: Deal | undefined;
  pseudoKeys: string[];
  favorite: boolean;
}) {
  const { listing } = row;
  const { item } = listing;
  const price = formatHrPrice(listing.hr_price);
  const openTrader = useOpenTrader(listing);
  const summary = displayMods(item)
    .slice(0, SUMMARY_MODS)
    .map((m) => m.label)
    .join(' · ');
  const base = item.base?.name && item.base.name !== item.name ? item.base.name : null;
  return (
    <div
      role="option"
      aria-selected={selected}
      data-listing-id={listing._id}
      onClick={() => onSelect(listing._id)}
      className={cn(
        'flex h-full w-full cursor-default items-center gap-2.5 border-b border-border/40 px-2.5 transition-colors duration-(--dur-med)',
        selected ? 'bg-accent/70 shadow-[inset_2px_0_0_var(--primary)]' : 'hover:bg-accent/30',
      )}
    >
      <ListingThumb listing={listing}
        className="size-10"
        artClassName="max-h-9 max-w-9" />

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-baseline gap-1.5">
          <span className={cn('truncate text-[13px] font-semibold', itemNameColor(item))}>{item.name}</span>
          {base && <span className="truncate text-[11px] text-muted-foreground">{base}</span>}
          {item.is_ethereal && <span className="shrink-0 text-[10px] text-info">eth</span>}
          {item.socket_count > 0 && (
            <span className="shrink-0 text-[10px] text-muted-foreground">{`${item.socket_count}os`}</span>
          )}
          {item.corrupted && <span className="shrink-0 text-[10px] text-q-corrupted">corr</span>}
          {favorite && <Heart className="size-3 shrink-0 fill-destructive text-destructive"
            aria-label="Favorite" />}
        </div>
        <div className="truncate text-[11px] leading-4 text-muted-foreground"
          title={summary}>
          {summary || '\u00a0'}
        </div>
        {pseudoKeys.length > 0 && (
          <div className="flex min-w-0 gap-1 overflow-hidden">
            {pseudoKeys.map((key) => (
              <span
                key={key}
                title={statWithValue(key, row.pseudo[key] ?? 0)}
                className="inline-flex h-4 max-w-40 shrink-0 items-center gap-0.5 rounded-sm bg-info/10 px-1 text-[10px] tabular-nums text-info"
              >
                <Sigma className="size-2.5 shrink-0" />
                <span className="truncate">{statWithValue(key, row.pseudo[key] ?? 0, { short: true })}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex w-28 shrink-0 flex-col items-end gap-0.5">
        <div className="flex items-center gap-1.5">
          <DealBadge deal={deal}
            compact />
          <span
            className={cn('text-xs font-semibold tabular-nums', price ? 'text-q-gold' : 'text-muted-foreground')}
            title={listing.price || undefined}
          >
            {price ?? (listing.price ? 'Offer' : '—')}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          {listing.user?.username && (
            <SellerName onOpen={openTrader}
              className="max-w-16">
              {listing.user.username}
            </SellerName>
          )}
          <OnlineDots listing={listing} />
          <span className="tabular-nums">{listingAge(listing)}</span>
        </div>
      </div>
    </div>
  );
});
