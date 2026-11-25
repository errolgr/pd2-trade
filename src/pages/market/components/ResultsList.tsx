import React, { createContext, useContext } from 'react';
import { Heart, Sigma } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tip } from '@/components/ui/tooltip';
import { isUserOnlineIngame } from '@/lib/user-online-status';
import { ListingThumb } from '@/pages/chat/components/ListingCard';
import { DealBadge } from '@/pages/market/enrich/DealBadge';
import type { Deal } from '@/pages/market/enrich/useDealIndicators';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { listingAge } from '../lib/listing';
import { isAnniversaryItem } from '../lib/anniversary';
import { statWithValue } from './stat-text';
import type { ScoredListing } from '../lib/types';
import { itemNameColor } from './ItemTooltip';
import { displayMods } from '../lib/card-model';
import type { EnterTracker } from './EnterOnce';
import { SellerName } from './SellerName';
import { EndedTag } from './EndedTag';
import { OfferBadge } from './OfferBadge';
import type { ListingOffers } from '../lib/listing-offers';
import { roundHr } from '../lib/price-stats';
import { useOpenTrader } from '../hooks/useListingActions';
import { useTranslation } from '@/i18n';
import { type LoadMoreState, ResultRowFrame, RowFlags, VirtualRowList } from './card-parts';

/** Height of a compact result row (listing or buy request). */
export const ROW_HEIGHT = 58;
const SUMMARY_MODS = 4;

/** "2.5 HR" / "0.75 HR"; null when the listing has no HR price (note only). */
export function formatHrPrice(hr: number): string | null {
  if (!(hr > 0)) return null;
  return `${roundHr(hr)} HR`;
}

/**
 * A glow around the item's art: white (the normal-quality colour, dark on light themes) when ethereal, gold (unique
 * colour) for the 5th Anniversary Edition skin, both stacked when it is both. Follows the art's outline
 * (drop-shadow), not its tile.
 */
export function itemArtGlow(item: { is_ethereal?: boolean; modifiers?: readonly { name: string }[] }): string {
  const ethereal = !!item.is_ethereal;
  const anniversary = isAnniversaryItem(item);
  if (ethereal && anniversary)
    return '[filter:drop-shadow(0_0_2px_var(--q-normal))_drop-shadow(0_0_7px_var(--q-unique))]';
  if (ethereal)
    return '[filter:drop-shadow(0_0_2px_var(--q-normal))_drop-shadow(0_0_6px_color-mix(in_oklab,var(--q-normal)_55%,transparent))]';
  if (anniversary) return '[filter:drop-shadow(0_0_2px_var(--q-unique))_drop-shadow(0_0_6px_var(--q-unique))]';
  return '';
}

/**
 * The time seller presence on result rows is judged at (epoch ms): when the search was shown, so a seller doesn't
 * turn offline while the list sits open, only on the next refresh. Null: judged at render time.
 */
export const PresenceAsOf = createContext<number | null>(null);

/** Whether `lastSeen` counts as online on a result row (as of PresenceAsOf). */
export function useRowOnline(lastSeen: string | undefined): boolean {
  return isUserOnlineIngame(lastSeen, useContext(PresenceAsOf) ?? undefined);
}

/** Site and in-game presence dots of a listing's seller. */
export function OnlineDots({ listing, className }: { listing: MarketListingEntry; className?: string }) {
  const site = useRowOnline(listing.user_last_online);
  const game = useRowOnline(listing.user_last_ingame);
  const { t } = useTranslation('market');
  return (
    <Tip
      label={t('presence.dots', {
        site: site ? t('presence.siteOnline') : t('presence.siteOffline'),
        game: game ? t('presence.inGame') : t('presence.notInGame'),
      })}
    >
      <span className={cn('inline-flex items-center gap-0.5', className)}>
        <span className={cn('size-1.5 rounded-full', site ? 'bg-info' : 'bg-muted-foreground/35')} />
        <span
          className={cn('size-1.5 rounded-full', game ? 'bg-success ring-2 ring-success/25' : 'bg-muted-foreground/35')}
        />
      </span>
    </Tip>
  );
}

export interface ResultsListProps {
  rows: ScoredListing[];
  selectedId: string | null;
  /** Click: select the row and show it in the detail pane. */
  onSelect: (listingId: string) => void;
  deals: ReadonlyMap<string, Deal>;
  /** The signed-in user's offers by listing id (made, or received on their listings). */
  offers: ReadonlyMap<string, ListingOffers>;
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
  offers,
  pseudoKeys,
  favoriteIds,
  hasMore,
  loadingMore,
  onLoadMore,
  loadMore,
  enter,
  footer,
}: ResultsListProps) {
  const { t } = useTranslation('market');
  return (
    <VirtualRowList
      items={rows}
      getKey={listingKey}
      selectedKey={selectedId}
      rowHeight={ROW_HEIGHT}
      enter={enter}
      hasMore={hasMore}
      loadingMore={loadingMore}
      onLoadMore={onLoadMore}
      loadMore={loadMore}
      ariaLabel={t('results.listings')}
      footer={footer}
      renderRow={(row) => (
        <ResultRow
          row={row}
          selected={row.listing._id === selectedId}
          onSelect={onSelect}
          deal={deals.get(row.listing._id)}
          offers={offers.get(row.listing._id)}
          pseudoKeys={pseudoKeys}
          favorite={favoriteIds.has(row.listing._id)}
        />
      )}
    />
  );
}

const listingKey = (row: ScoredListing) => row.listing._id;

const ResultRow = React.memo(function ResultRow({
  row,
  selected,
  onSelect,
  deal,
  offers,
  pseudoKeys,
  favorite,
}: {
  row: ScoredListing;
  selected: boolean;
  onSelect: (id: string) => void;
  deal: Deal | undefined;
  offers: ListingOffers | undefined;
  pseudoKeys: string[];
  favorite: boolean;
}) {
  const { t } = useTranslation('market');
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
    <ResultRowFrame
      id={listing._id}
      selected={selected}
      onSelect={() => onSelect(listing._id)}
      art={
        <ListingThumb listing={listing}
          className="size-10"
          artClassName={cn('max-h-9 max-w-9', itemArtGlow(item))} />
      }
      title={
        <>
          <span className={cn('truncate text-[13px] font-semibold', itemNameColor(item))}>{item.name}</span>
          {base && <span className="truncate text-[11px] text-muted-foreground">{base}</span>}
          <RowFlags
            ethereal={!!item.is_ethereal}
            anniversary={isAnniversaryItem(item)}
            sockets={item.socket_count > 0 ? `${item.socket_count}os` : null}
            corrupted={!!item.corrupted}
          />
          {favorite && (
            <Heart className="size-3 shrink-0 fill-destructive text-destructive"
              aria-label={t('results.favorite')} />
          )}
          <OfferBadge offers={offers}
            compact />
        </>
      }
      summary={summary}
      extra={
        pseudoKeys.length > 0 && (
          <div className="flex min-w-0 gap-1 overflow-hidden">
            {pseudoKeys.map((key) => (
              <Tip key={key}
                label={statWithValue(key, row.pseudo[key] ?? 0)}>
                <span className="inline-flex h-4 max-w-40 shrink-0 items-center gap-0.5 rounded-sm bg-info/10 px-1 text-[10px] tabular-nums text-info">
                  <Sigma className="size-2.5 shrink-0" />
                  <span className="truncate">{statWithValue(key, row.pseudo[key] ?? 0, { short: true })}</span>
                </span>
              </Tip>
            ))}
          </div>
        )
      }
      aside={
        <>
          <div className="flex min-w-0 max-w-full items-center gap-1.5">
            <DealBadge deal={deal}
              compact />
            <Tip label={listing.price || undefined}>
              <span
                className={cn(
                  'truncate text-xs font-semibold tabular-nums',
                  price ? 'text-q-gold' : 'text-foreground/85',
                )}
              >
                {price ?? (listing.price || '—')}
              </span>
            </Tip>
          </div>
          {price && listing.price && (
            <Tip label={listing.price}>
              <span className="max-w-full truncate text-[10px] text-muted-foreground">{listing.price}</span>
            </Tip>
          )}
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            {listing.user?.username && (
              <SellerName onOpen={openTrader}
                className="max-w-16">
                {listing.user.username}
              </SellerName>
            )}
            <OnlineDots listing={listing} />
            <EndedTag row={row} />
            <span className="tabular-nums">{listingAge(listing)}</span>
          </div>
        </>
      }
    />
  );
});
