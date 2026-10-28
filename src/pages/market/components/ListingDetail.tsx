import React from 'react';
import moment from 'moment';
import { ExternalLink, Heart, MessageSquare, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { DealBadge } from '@/pages/market/enrich/DealBadge';
import { PriceHistoryMini } from '@/pages/market/enrich/PriceHistoryMini';
import { SellerCard } from '@/pages/market/enrich/SellerCard';
import type { Deal } from '@/pages/market/enrich/useDealIndicators';
import { useListingActions } from '../hooks/useListingActions';
import { listingAge } from '../lib/listing';
import type { MarketApi, ScoredListing } from '../lib/types';
import { statWithValue } from './stat-text';
import { ItemTooltip } from './ItemTooltip';
import { OfferButton, WhisperButton } from './ListingActions';
import { formatHrPrice } from './ResultsList';
import { AddAllModsButton } from './ModMenu';
import { useTranslation } from '@/i18n';

export interface ListingDetailProps {
  row: ScoredListing;
  deal: Deal | undefined;
  api: MarketApi | null;
  /** Sold archive rows: no offer/whisper (the item is gone). */
  archived: boolean;
  favorite: boolean;
  onToggleFavorite: (listing: MarketListingEntry) => void;
  onClose: () => void;
  /** Seller card's "browse": search this seller's listings. */
  onBrowseSeller: (listing: MarketListingEntry) => void;
  /** Seller card's other listings: show that listing here. */
  onSelectListing: (listing: MarketListingEntry) => void;
  /** Enabled pseudo stat keys (their totals show above the tooltip). */
  pseudoKeys: string[];
}

/** Right pane: in-game tooltip, price, enrichments and the trade actions. */
export function ListingDetail({
  row,
  deal,
  api,
  archived,
  favorite,
  onToggleFavorite,
  onClose,
  onBrowseSeller,
  onSelectListing,
  pseudoKeys,
}: ListingDetailProps) {
  const { t } = useTranslation('market');
  const { listing } = row;
  const actions = useListingActions(listing);
  const price = formatHrPrice(listing.hr_price);

  return (
    <aside aria-label={t('detail.label')}
      className="flex h-full min-h-0 flex-col border-l border-border bg-card/40">
      <div className="flex items-center gap-1.5 border-b border-border px-2.5 py-1.5">
        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
          {archived ? t('detail.sold') : t('detail.listed')}
          {` · ${listing.is_ladder ? 'Ladder' : 'Non-ladder'} ${listing.is_hardcore ? 'HC' : 'SC'} · ${listingAge(listing)}`}
        </span>
        <AddAllModsButton
          item={listing.item}
          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        />
        <Button
          variant="ghost"
          size="sm"
          className={cn('size-7 p-0', favorite && 'text-destructive')}
          aria-pressed={favorite}
          aria-label={favorite ? t('detail.unfavorite') : t('detail.favorite')}
          title={favorite ? t('detail.unfavorite') : t('detail.favorite')}
          onClick={() => onToggleFavorite(listing)}
        >
          <Heart className={cn('size-4', favorite && 'fill-current')} />
        </Button>
        <Button variant="ghost"
          size="sm"
          className="size-7 p-0"
          aria-label={t('detail.close')}
          onClick={onClose}>
          <X className="size-4" />
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1 [&_[data-radix-scroll-area-viewport]>div]:!block">
        <div className="space-y-2.5 p-2.5">
          <ItemTooltip item={listing.item} />

          {pseudoKeys.length > 0 && (
            <div className="grid grid-cols-2 gap-1">
              {pseudoKeys.map((key) => (
                <div
                  key={key}
                  title={statWithValue(key, row.pseudo[key] ?? 0)}
                  className="truncate rounded-md bg-info/10 px-2 py-0.5 text-[11px] tabular-nums text-info"
                >
                  {statWithValue(key, row.pseudo[key] ?? 0, { short: true })}
                </div>
              ))}
            </div>
          )}

          <div className="rounded-md border border-border/60 bg-muted/30 p-2">
            <div className="flex items-center justify-between gap-2">
              <span className={cn('text-base font-bold tabular-nums', price ? 'text-q-gold' : 'text-muted-foreground')}>
                {price ?? t('detail.noHrPrice')}
              </span>
              <DealBadge deal={deal} />
            </div>
            {listing.price && (
              <p className="mt-1 whitespace-pre-wrap break-words text-xs text-foreground/90">{listing.price}</p>
            )}
            <div className="mt-1 text-[11px] text-muted-foreground"
              title={moment(listing.bumped_at).format('LLL')}>
              {t('detail.bumpedListed', {
                bumped: moment(listing.bumped_at).fromNow(),
                listed: moment(listing.created_at).fromNow(),
              })}
            </div>
            <PriceHistoryMini listing={listing} />
          </div>

          <SellerCard
            listing={listing}
            onSelectListing={onSelectListing}
            onBrowseSeller={() => onBrowseSeller(listing)}
          />
        </div>
      </ScrollArea>

      <div className="grid grid-cols-2 gap-1.5 border-t border-border p-2.5">
        {!archived && (
          <OfferButton api={api}
            listing={listing}
            onWebsite={actions.openWebsite}
            ensureFresh={actions.ensureFresh} />
        )}
        {!archived && <WhisperButton actions={actions} />}
        <Button variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={actions.openDm}>
          <MessageSquare className="size-3.5" />
          {t('detail.message')}
        </Button>
        <Button variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={actions.openWebsite}>
          <ExternalLink className="size-3.5" />
          {t('detail.website')}
        </Button>
      </div>
    </aside>
  );
}
