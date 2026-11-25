import React, { useState } from 'react';
import { ArrowRight, Check, ChevronRight, ShoppingCart, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tip } from '@/components/ui/tooltip';
import { useOptions } from '@/hooks/useOptions';
import { useOverlay } from '@/overlay';
import { encodeItemForQuickList } from '@/lib/item-utils';
import { trackEvent } from '@/lib/telemetry';
import { shortAgo } from '@/pages/chat/hooks/useTraderProfile';
import { useNow } from '@/pages/market/enrich/useNow';
import { useTranslation } from '@/i18n';
import { formatStat } from '../components/stat-text';
import {
  byBestOffer,
  formatOffer,
  listPriceFor,
  type WtbItemMatch,
  type WtbListPrice,
  type WtbRealm,
  type WtbSearchBody,
} from '../lib/wtb';
import { buyerChipModel, metStats, nearMisses, type RowValue } from './wtb-chip';
import { countWtbViews, useWtbOverlap } from './useWtbData';
import { WtbSellActions } from './WtbSellActions';
import type { WtbContactItem } from '../alerts/wtb-api';

export interface WtbBuyersChipProps {
  /** The open requests the item exactly fills; no chip without one. */
  matches: readonly WtbItemMatch[];
  /** The item's raw clipboard JSON (the request match, views, "List at" from the price check). */
  itemText: string | null;
  /** What a contact tells the buyer the user has: the price-checked item, or the stash item being listed. */
  contactItem: WtbContactItem | null;
  /** The item's value for a request's stat row (the price check's rolls, or the stash item's). */
  valueOf: RowValue;
  /** The item's overlap search (its item fields, no stats) for "Almost"; null: none. */
  nearBody: WtbSearchBody | null;
  realm: WtbRealm | null;
  token: string | null;
  source: 'priceCheck' | 'listItem';
  /** List item tab: "List at {offer}" fills the price; elsewhere it opens the list item tab. */
  onListAt?: (price: WtbListPrice) => void;
}

/** The buyers chip, shown only when the item fills at least one open request. */
export function WtbBuyersChip(props: WtbBuyersChipProps) {
  return props.matches.length > 0 ? <BuyersChip {...props} /> : null;
}

/**
 * "{n} buyers · up to {offer}" beside the item name; the first time a chip ever shows, a one-time hint explains it.
 * A click opens the buyers (Esc / outside click closes; it never opens on its own): each request with the stats
 * the item meets and the ways to reach the buyer, the requests one stat away (folded), and all requests.
 */
function BuyersChip({
  matches,
  itemText,
  contactItem,
  valueOf,
  nearBody,
  realm,
  token,
  source,
  onListAt,
}: WtbBuyersChipProps) {
  const { t } = useTranslation('market');
  const { settings, updateSettings } = useOptions();
  const { openPanel } = useOverlay();
  const now = useNow();
  const [open, setOpen] = useState(false);
  const [almostOpen, setAlmostOpen] = useState(false);
  const chip = buyerChipModel(matches)!;
  const sorted = [...matches].sort(byBestOffer);
  const exactIds = new Set(sorted.map((m) => m.request.id));
  const near = useWtbOverlap(open ? nearBody : null, token);
  const almost = near ? nearMisses(near.items, valueOf, exactIds) : [];
  const hint = settings?.wtbBuyersHintSeen !== true;

  const dismissHint = () => {
    if (hint) void updateSettings({ wtbBuyersHintSeen: true });
  };
  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) return;
    dismissHint();
    trackEvent('wtb_buyers_opened', { source, count: chip.count });
    // A view counts when the buyers are looked at, not on every price check
    if (realm && itemText) countWtbViews(realm, itemText, token);
  };
  const listAt = (match: WtbItemMatch) => {
    const price = listPriceFor(match.request.offer);
    trackEvent('wtb_list_at_offer', { source });
    if (onListAt) onListAt(price);
    else if (itemText)
      openPanel('quickList', { item: encodeItemForQuickList(itemText), prefill: price }, { focus: true });
    setOpen(false);
  };
  const label = t('wtb.chip.label', { count: chip.count, offer: chip.bestOffer });

  return (
    <span className="relative inline-flex shrink-0 font-sans">
      <Popover open={open}
        onOpenChange={onOpenChange}>
        <Tip label={t('wtb.chip.tooltip', { count: chip.count })}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={label}
              className="inline-flex h-5 items-center gap-1 rounded-full border border-success/50 px-2 text-[11px] font-semibold tracking-normal text-success outline-none transition-colors duration-(--dur-fast) hover:bg-success/10 focus-visible:ring-2 focus-visible:ring-ring/60 data-[state=open]:bg-success/10"
            >
              <ShoppingCart className="size-3" />
              <span className="tabular-nums">{label}</span>
            </button>
          </PopoverTrigger>
        </Tip>
        <PopoverContent align="end"
          className="w-[25rem] space-y-2 p-3 text-xs">
          <div>
            <div className="text-sm font-semibold">{t('wtb.chip.title')}</div>
            <div className="text-[11px] text-muted-foreground">{t('wtb.chip.subtitle')}</div>
          </div>
          <ul className="space-y-2">
            {sorted.map((match) => {
              const { request } = match;
              const met = metStats(match, valueOf);
              return (
                <li key={request.id}
                  className="space-y-1 rounded-md border border-border/60 p-2">
                  <div className="flex min-w-0 items-baseline gap-1.5">
                    <span className="truncate font-semibold">{request.buyer.name}</span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {shortAgo(Date.parse(request.createdAt), now)}
                    </span>
                    <span className="ml-auto shrink-0 font-bold tabular-nums text-q-gold">
                      {formatOffer(request.offer)}
                    </span>
                  </div>
                  {met.length > 0 && (
                    <div className="flex min-w-0 items-start gap-1 text-[11px] text-success">
                      <Check className="mt-0.5 size-3 shrink-0" />
                      <span className="min-w-0">
                        {met.map((s) => (s.value !== null ? `${s.text} (${formatStat(s.value)})` : s.text)).join(' · ')}
                      </span>
                    </div>
                  )}
                  {/* The buyer is named above: List at on the left, copy · Message · Sell for {offer} right-aligned */}
                  <div className="flex items-start justify-end gap-1">
                    {(onListAt || itemText) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mr-auto h-6 px-2 text-[11px]"
                        onClick={() => listAt(match)}
                      >
                        <Tag className="size-3" />
                        {t('wtb.listAt', { offer: formatOffer(request.offer) })}
                      </Button>
                    )}
                    <WtbSellActions request={request}
                      item={contactItem}
                      layout="chip"
                      source={source} />
                  </div>
                </li>
              );
            })}
          </ul>
          {almost.length > 0 && (
            <div className="space-y-1">
              <button
                type="button"
                aria-expanded={almostOpen}
                onClick={() => setAlmostOpen((o) => !o)}
                className="inline-flex items-center gap-0.5 rounded-sm text-[11px] font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
              >
                <ChevronRight
                  className={cn('size-3 transition-transform duration-(--dur-fast)', almostOpen && 'rotate-90')}
                />
                {t('wtb.chip.almost', { count: almost.length })}
              </button>
              {almostOpen && (
                <ul className="space-y-0.5 pl-3.5">
                  {almost.map((miss) => (
                    <li key={miss.request.id}
                      className="flex min-w-0 items-baseline gap-1 text-[11px]">
                      <span className="max-w-28 shrink-0 truncate font-medium">{miss.request.buyer.name}</span>
                      <span className="shrink-0 tabular-nums text-foreground/85">{`· ${formatOffer(miss.request.offer)}`}</span>
                      <span className="min-w-0 truncate text-muted-foreground">
                        {miss.yourValue !== null
                          ? t('wtb.chip.needs', { stat: miss.needs, value: formatStat(miss.yourValue) })
                          : t('wtb.chip.needsNone', { stat: miss.needs })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              openPanel('market', { wanted: { match: sorted[0], itemText: itemText ?? undefined } }, { focus: true });
            }}
            className="inline-flex items-center gap-0.5 rounded-sm text-[11px] font-medium text-success underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            {t('wtb.chip.allRequests')}
            <ArrowRight className="size-3" />
          </button>
        </PopoverContent>
      </Popover>
      {hint && !open && (
        <span
          role="note"
          className="absolute top-full right-0 z-20 mt-1.5 w-64 space-y-1.5 rounded-md border border-success/40 bg-popover p-2 text-[11px] font-normal leading-snug tracking-normal text-popover-foreground shadow-md"
        >
          <span className="block">
            <span className="mr-1 rounded-sm bg-success/15 px-1 text-[10px] font-semibold uppercase text-success">
              {t('wtb.chip.hintNew')}
            </span>
            {t('wtb.chip.hint')}
          </span>
          <Button size="sm"
            variant="outline"
            className="h-6 px-2 text-[11px]"
            onClick={dismissHint}>
            {t('wtb.chip.hintOk')}
          </Button>
        </span>
      )}
    </span>
  );
}
