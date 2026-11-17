import React from 'react';
import { ArrowRight, ShoppingCart } from 'lucide-react';
import { useTranslation } from '@/i18n';
import type { DemandBarModel } from './wtb-demand';

/**
 * Over Live / Sold archive results: how many open buy requests could take what the search finds, and what they
 * offer. Informational only; "View requests" switches the search to the Wanted source.
 */
export function DemandBar({ model, onViewRequests }: { model: DemandBarModel; onViewRequests: () => void }) {
  const { t } = useTranslation('market');
  let text: string;
  if (model.kind === 'live') {
    text = [
      model.includesYours
        ? t('wtb.demand.buyingIncludingYours', { count: model.count })
        : t('wtb.demand.buying', { count: model.count }),
      model.topOffers.length ? t('wtb.demand.offersUpTo', { offers: model.topOffers.join(' · ') }) : null,
    ]
      .filter(Boolean)
      .join(' · ');
  } else {
    text = [
      model.sold
        ? t('wtb.demand.soldLately', { low: model.sold.low, high: model.sold.high, count: model.sold.count })
        : null,
      model.offers
        ? t('wtb.demand.openOffers', { low: model.offers.low, high: model.offers.high, count: model.count })
        : t('wtb.demand.openOffersNoHr', { count: model.count }),
    ]
      .filter(Boolean)
      .join(' · ');
  }
  return (
    <div
      role="status"
      className="flex h-7 shrink-0 items-center gap-2 border-b border-success/25 bg-success/5 px-2.5 text-[11px] text-foreground/90"
    >
      <ShoppingCart className="size-3.5 shrink-0 text-success" />
      <span className="min-w-0 flex-1 truncate tabular-nums">{text}</span>
      <button
        type="button"
        onClick={onViewRequests}
        className="inline-flex shrink-0 items-center gap-0.5 rounded-sm font-medium text-success underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        {t('wtb.demand.viewRequests')}
        <ArrowRight className="size-3" />
      </button>
    </div>
  );
}
