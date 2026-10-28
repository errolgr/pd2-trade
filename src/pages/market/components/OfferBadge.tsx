import React from 'react';
import moment from 'moment';
import { HandCoins } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { TradeOffer } from '@/hooks/useTradeOffers';
import { isAccepted, type ListingOffers } from '../lib/listing-offers';
import { useTranslation } from '@/i18n';

function OfferLines({ title, offers, showPlayer }: { title: string; offers: TradeOffer[]; showPlayer: boolean }) {
  const { t } = useTranslation('market');
  return (
    <div className="space-y-0.5">
      <div className="font-semibold">{title}</div>
      {offers.map((o) => (
        <div key={o.id}
          className="flex gap-1.5">
          {showPlayer && <span className="font-medium">{o.playerName}</span>}
          <span className="max-w-56 truncate">{o.price || t('offerBadge.noText')}</span>
          <span className="text-muted-foreground">{moment(o.timestamp).fromNow()}</span>
          {isAccepted(o) && <span className="text-success">{t('offerBadge.acceptedLower')}</span>}
        </div>
      ))}
    </div>
  );
}

/**
 * The signed-in user's existing offers on a listing: "Offered <price>" on one they made, "N offers" on their
 * own listing; each offer on hover. Nothing without offers. `compact` (list rows) drops the price.
 * Host mounts a TooltipProvider.
 */
export function OfferBadge({ offers, compact = false }: { offers: ListingOffers | undefined; compact?: boolean }) {
  const { t } = useTranslation('market');
  if (!offers || (offers.mine.length === 0 && offers.received.length === 0)) return null;
  const { mine, received } = offers;
  const accepted = mine.some(isAccepted) || received.some(isAccepted);
  const latest = mine[0]?.price;
  const text = accepted
    ? t('offerBadge.accepted')
    : mine.length > 0
      ? compact || !latest
        ? t('offerBadge.offered')
        : t('offerBadge.offeredPrice', { price: latest })
      : t('offerBadge.received', { count: received.length });
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          aria-label={text}
          className={cn(
            'inline-flex min-w-0 shrink cursor-default items-center gap-1 rounded-full border px-1.5 py-px text-[10px] leading-4 whitespace-nowrap',
            accepted ? 'border-success/50 bg-success/15 text-success' : 'border-primary/40 bg-primary/10 text-primary',
          )}
        >
          <HandCoins className="size-3 shrink-0" />
          <span className="truncate">{text}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent side="top">
        <div className="space-y-1.5">
          {mine.length > 0 && <OfferLines title={t('offerBadge.yours')}
            offers={mine}
            showPlayer={false} />}
          {received.length > 0 && <OfferLines title={t('offerBadge.onYourListing')}
            offers={received}
            showPlayer />}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
