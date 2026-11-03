import React from 'react';
import { ChevronRight, Store, User as UserIcon } from 'lucide-react';
import { Button, ItemName, PriceTag, Skeleton, cn } from '@pd2-trader/ui';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { ListingThumb } from '@/pages/chat/components/ListingCard';
import type { TraderPresence } from '@/pages/chat/hooks/useTraderProfile';
import { DealBadge } from './DealBadge';
import { useSellerContext } from './useSellerContext';
import { useDealIndicators } from './useDealIndicators';
import { SellerName } from '../components/SellerName';
import { useOpenTrader } from '../hooks/useListingActions';
import { currentLocale, useTranslation } from '@/i18n';

/** Same tones as the chat Trader sidebar's presence dot. */
const PRESENCE_TONE: Record<TraderPresence['kind'], string> = {
  ingame: 'bg-success shadow-[0_0_6px] shadow-success/60',
  online: 'bg-warning',
  seen: 'bg-muted-foreground/50',
  unknown: 'bg-muted-foreground/30',
};

/**
 * Detail-pane seller block: name + in-game account, presence (in game / online / last seen), account age, and
 * their other live listings (click selects one; `onBrowseSeller` opens a search for all of them).
 * Host mounts a TooltipProvider (deal badges).
 */
export function SellerCard({
  listing,
  onSelectListing,
  onBrowseSeller,
  className,
}: {
  listing: MarketListingEntry;
  onSelectListing?: (listing: MarketListingEntry) => void;
  onBrowseSeller?: () => void;
  className?: string;
}) {
  const { t } = useTranslation('market');
  const seller = useSellerContext(listing);
  const deals = useDealIndicators(seller.others);
  const openTrader = useOpenTrader(listing);

  let others: React.ReactNode;
  if (seller.status === 'loading') {
    others = (
      <div aria-busy
        className="space-y-1">
        <span className="sr-only">{t('seller.loadingListings')}</span>
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i}
            className="h-8 rounded-md" />
        ))}
      </div>
    );
  } else if (seller.status === 'error') {
    others = <div className="text-xs text-muted-foreground">{t('seller.loadFailed')}</div>;
  } else if (seller.status === 'ready' && seller.others.length === 0) {
    others = <div className="text-xs text-muted-foreground">{t('seller.noOthers')}</div>;
  } else if (seller.others.length > 0) {
    others = (
      <ul className="space-y-0.5">
        {seller.others.map((other) => (
          <li key={other._id}>
            <Button
              type="button"
              variant="ghost"
              size="inline"
              disabled={!onSelectListing}
              onClick={() => onSelectListing?.(other)}
              className="flex w-full min-w-0 justify-start gap-2 px-1 py-0.5 text-left font-normal hover:bg-accent/40 hover:text-current disabled:cursor-default disabled:opacity-100"
            >
              <ListingThumb listing={other}
                className="size-7"
                artClassName="max-h-6 max-w-6" />
              <ItemName
                name={other.item.name}
                quality={other.item.quality?.name}
                runeword={other.item.is_runeword}
                className="min-w-0 flex-1 truncate text-xs font-semibold"
              />
              <DealBadge deal={deals.get(other._id)}
                compact />
              <span className="max-w-24 shrink-0 truncate text-2xs tabular-nums text-foreground/85">
                {other.hr_price > 0 ? <PriceTag amount={other.hr_price}
                  unit="hr" /> : other.price || '—'}
              </span>
            </Button>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <section aria-label={t('filters.seller')}
      className={cn('space-y-2', className)}>
      <div className="flex items-start gap-2">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
          <UserIcon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-baseline gap-1.5">
            {listing.user_id ? (
              <SellerName onOpen={openTrader}
                className="text-sm font-semibold">
                {seller.username ?? t('seller.unknown')}
              </SellerName>
            ) : (
              <span className="truncate text-sm font-semibold">{seller.username ?? t('seller.unknown')}</span>
            )}
            {seller.inGameAccount && (
              <span className="truncate text-xs text-muted-foreground">*{seller.inGameAccount}</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span aria-hidden
                className={cn('size-2 shrink-0 rounded-full', PRESENCE_TONE[seller.presence.kind])} />
              {seller.presenceText}
            </span>
            {seller.accountCreatedAt !== null && (
              <span title={new Date(seller.accountCreatedAt).toLocaleDateString(currentLocale())}>
                {t('seller.joined', { ago: seller.accountAgeText })}
              </span>
            )}
          </div>
        </div>
      </div>

      {(others || onBrowseSeller) && (
        <div className="space-y-1">
          <h4 className="flex items-center gap-1.5 px-0.5 text-3xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Store className="size-3" />
            <span className="flex-1">
              {seller.othersTotal > 0
                ? t('seller.otherListingsCount', { count: seller.othersTotal })
                : t('seller.otherListings')}
            </span>
          </h4>
          {others}
          {onBrowseSeller && (
            <Button
              type="button"
              variant="quiet"
              size="inline"
              onClick={onBrowseSeller}
              className="flex w-full gap-1 px-1.5 py-1 text-2xs hover:bg-primary/10"
            >
              {seller.username ? t('seller.browseAllFrom', { name: seller.username }) : t('seller.browseAllThis')}
              <ChevronRight className="size-3" />
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
