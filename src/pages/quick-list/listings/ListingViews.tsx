import React from 'react';
import moment from 'moment';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { DealBadge } from '@/pages/market/enrich/DealBadge';
import { OfferBadge } from '@/pages/market/components/OfferBadge';
import { displayMods } from '@/pages/market/components/ItemTooltip';
import type { Deal } from '@/pages/market/enrich/useDealIndicators';
import type { ListingOffers } from '@/pages/market/lib/listing-offers';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';
import { bumpReadyAt } from './my-listings';
import {
  baseName,
  ListingActions,
  type ListingActionHandlers,
  ListingArt,
  ListingEditor,
  ListingName,
  PriceText,
  sideNote,
} from './ListingPieces';

/** Mod lines a card shows before the tooltip takes over. */
const CARD_MODS = 3;

export interface ListingViewProps {
  listing: MarketListingEntry;
  now: number;
  deal: Deal | undefined;
  offers: ListingOffers | undefined;
  editing: boolean;
  bumping: boolean;
  deleting: boolean;
  /** Bump All just ran: flash this row after `flashDelay` ms. */
  flashKey: number;
  flashDelay: number;
  handlers: ListingActionHandlers;
  onSaveEdit: (listing: MarketListingEntry, price: string, note: string) => Promise<void>;
  onCancelEdit: () => void;
}

/** Status edge: offers waiting, then bump ready. */
function statusEdge(listing: MarketListingEntry, now: number, offers: ListingOffers | undefined): string | null {
  if ((offers?.received.length ?? 0) > 0) return 'bg-primary';
  if (bumpReadyAt(listing) <= now) return 'bg-success';
  return null;
}

function BumpFlash({ flashKey, delay }: { flashKey: number; delay: number }) {
  if (!flashKey) return null;
  return (
    <span
      key={flashKey}
      aria-hidden
      className="pointer-events-none absolute -inset-px rounded-[inherit] border border-success/45 bg-success/10 opacity-0 animate-bump-flash"
      style={{ animationDelay: `${delay}ms` }}
    />
  );
}

export const ListingCard = React.memo(function ListingCard(props: ListingViewProps) {
  const { listing, now, deal, offers, editing, bumping, deleting, handlers } = props;
  const { t } = useTranslation('quickList');
  const edge = statusEdge(listing, now, offers);
  const base = baseName(listing);
  const mods = displayMods(listing.item).slice(0, CARD_MODS);
  const ready = bumpReadyAt(listing) <= now;
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg border border-border bg-card/60 py-2.5 pr-2.5 pl-3.5 shadow-xs transition-colors duration-(--dur-fast) hover:border-ring/40',
        deleting && 'border-destructive/40 bg-destructive/5 opacity-70',
      )}
    >
      <BumpFlash flashKey={props.flashKey}
        delay={props.flashDelay} />
      {edge && <span aria-hidden
        className={cn('absolute inset-y-0 left-0 w-1', edge)} />}
      <div className="flex gap-3">
        <ListingArt listing={listing}
          size="md" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex min-w-0 items-baseline gap-2">
            <ListingName listing={listing}
              className="text-sm" />
            {base && <span className="shrink-0 truncate text-xs text-muted-foreground">{base}</span>}
            <span className="ml-auto max-w-[35%] shrink-0 truncate pl-2 text-right">
              <PriceText listing={listing}
                className="text-base" />
            </span>
          </div>
          <div className="flex min-w-0 items-baseline gap-2 text-xs">
            <span className="min-w-0 flex-1 truncate text-q-magic">{mods.map((m) => m.label).join(' · ')}</span>
            {sideNote(listing) && (
              <span className="max-w-[40%] shrink-0 truncate text-muted-foreground italic">{sideNote(listing)}</span>
            )}
          </div>
          {editing ? (
            <ListingEditor
              listing={listing}
              onSave={(price, note) => props.onSaveEdit(listing, price, note)}
              onCancel={props.onCancelEdit}
            />
          ) : (
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="flex shrink-0 items-center gap-1">
                <DealBadge deal={deal} />
                <OfferBadge offers={offers} />
              </span>
              <span className="min-w-0 truncate text-[11px] text-muted-foreground">
                {ready
                  ? t('myListings.readyListed', { listed: moment(listing.created_at).fromNow() })
                  : t('myListings.bumpedListed', {
                      bumped: moment(listing.bumped_at).fromNow(),
                      listed: moment(listing.created_at).fromNow(),
                    })}
              </span>
              <span className="ml-auto" />
              <ListingActions listing={listing}
                now={now}
                bumping={bumping}
                deleting={deleting}
                handlers={handlers} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export const ListingRow = React.memo(function ListingRow(props: ListingViewProps) {
  const { listing, now, deal, offers, editing, bumping, deleting, handlers } = props;
  const edge = statusEdge(listing, now, offers);
  return (
    <div
      className={cn(
        'group/row relative flex h-9 items-center gap-2 border-b border-border/50 pr-1 pl-2.5 transition-colors duration-(--dur-fast) hover:bg-accent/40',
        deleting && 'bg-destructive/5 opacity-70',
      )}
    >
      <BumpFlash flashKey={props.flashKey}
        delay={props.flashDelay} />
      {edge && <span aria-hidden
        className={cn('absolute inset-y-1.5 left-0 w-0.5 rounded-full', edge)} />}
      <ListingArt listing={listing}
        size="sm" />
      {editing ? (
        <>
          <ListingName listing={listing}
            className="max-w-40 text-xs" />
          <ListingEditor
            listing={listing}
            onSave={(price, note) => props.onSaveEdit(listing, price, note)}
            onCancel={props.onCancelEdit}
          />
        </>
      ) : (
        <>
          <ListingName listing={listing}
            className="w-0 flex-[1_1_40%] text-xs" />
          <span className="flex w-0 flex-[1_1_30%] items-center gap-1 overflow-hidden">
            <DealBadge deal={deal}
              compact />
            <OfferBadge offers={offers}
              compact />
            {sideNote(listing) && (
              <span className="truncate text-[11px] text-muted-foreground italic">{sideNote(listing)}</span>
            )}
          </span>
          <PriceText listing={listing}
            className="w-16 shrink-0 text-right text-xs" />
          <ListingActions
            listing={listing}
            now={now}
            bumping={bumping}
            deleting={deleting}
            handlers={handlers}
            compact
          />
        </>
      )}
    </div>
  );
});
