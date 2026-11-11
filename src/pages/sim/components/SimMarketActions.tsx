import React, { useMemo } from 'react';
import { Bell, Eye, Loader2, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tip } from '@/components/ui/tooltip';
import { useOptions } from '@/hooks/useOptions';
import type { SimItemRef } from '@/lib/sim-jobs-api';
import { useOverlay } from '@/overlay';
import { type MarketPriceItem, useMarketPrices } from '@/pages/chat/hooks/useListingMarketPrices';
import { namePriceCode } from '@/pages/chat/lib/price-codes';
import { findWatch } from '@/pages/market/alerts/alert-logic';
import { watchState } from '@/pages/market/alerts/WatchButton';
import { formatHrPrice } from '@/pages/market/components/ResultsList';
import { useSearchDefaults } from '@/pages/market/hooks/useSearchDefaults';
import { defaultFilters, mergeFilters, upgradeFilters } from '@/pages/market/lib/defaults';
import type { MarketFilters } from '@/pages/market/lib/types';
import { isPendingSearch, type MarketStore, useMarketStore } from '@/pages/market/store/useMarketStore';

/**
 * The market search for a card item the website links to the market (`marketQuery`: its unique / set item page):
 * the item by name, as the market's item-name box and the palette's item search set it. null when not marketable.
 */
export function simMarketFilters(item: SimItemRef): Partial<MarketFilters> | null {
  return item.marketQuery ? { itemName: item.name } : null;
}

/** The name a sim card's Watch saves its search under. */
export const simWatchName = (item: SimItemRef) => `${item.name} (sim upgrade)`;

/**
 * Watch from a sim card: turns alerts on for the user's saved search with these filters, or saves one named
 * `<item> (sim upgrade)` with alerts on. Never saves a second search for the same filters.
 */
export function watchSimItem(store: MarketStore, item: SimItemRef, filters: MarketFilters): void {
  const { watching, saved } = findWatch(store.savedSearches, filters);
  if (watching) return;
  if (!store.alertsEnabled) store.setAlertsEnabled(true);
  if (saved && !isPendingSearch(saved)) store.setSearchAlert(saved.id, true);
  else if (!saved) store.saveSearch(simWatchName(item), filters, true);
}

const priceQuality = (quality: string | null): 'Unique' | 'Set' | null => {
  const q = quality?.toLowerCase();
  return q === 'unique' ? 'Unique' : q === 'set' ? 'Set' : null;
};

/**
 * '~4.2 HR' price hints for marketable unique and set items, by name, from the crawler prices the palette and chat
 * use (cached, one batch per realm); absent while loading or unpriced.
 */
export function useSimPriceHints(items: readonly SimItemRef[]): ReadonlyMap<string, string> {
  const { settings } = useOptions();
  const isLadder = settings.ladder === 'ladder';
  const isHardcore = settings.mode === 'hardcore';
  const priceItems = useMemo(
    () =>
      items.flatMap((item): MarketPriceItem[] => {
        const quality = priceQuality(item.quality);
        const code = item.marketQuery && quality ? namePriceCode(item.name, quality) : null;
        return code ? [{ id: item.name, code, isLadder, isHardcore }] : [];
      }),
    [items, isLadder, isHardcore],
  );
  const prices = useMarketPrices(priceItems);
  return useMemo(() => {
    const hints = new Map<string, string>();
    for (const [name, price] of prices) {
      const hr = price && formatHrPrice(price.hr);
      if (hr) hints.set(name, `~${hr}`);
    }
    return hints;
  }, [prices]);
}

/** Market (the overlay's market browser on this item) and Watch (alerts for new listings of it). */
export function SimMarketActions({ item, priceHint }: { item: SimItemRef; priceHint?: string }) {
  const { settings } = useOptions();
  const { openPanel } = useOverlay();
  const searchDefaults = useSearchDefaults();
  const store = useMarketStore();
  const hardcore = settings.mode === 'hardcore';
  const ladder = settings.ladder !== 'non-ladder';
  // The market's own full filters for this search (what Market would show), so Watch matches its saved searches
  const filters = useMemo(() => {
    const query = simMarketFilters(item);
    return query ? upgradeFilters(mergeFilters(defaultFilters({ hardcore, ladder }, searchDefaults), query)) : null;
  }, [item, hardcore, ladder, searchDefaults]);
  const query = simMarketFilters(item);
  if (!query || !filters) return null;
  const { watching, busy, disabled, signedOut } = watchState(store, filters);

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      {priceHint && <span className="text-[11px] text-muted-foreground tabular-nums">{priceHint}</span>}
      <Tip label={`Search the market for ${item.name}`}>
        <Button
          size="sm"
          variant="outline"
          className="h-6 px-2 text-[11px]"
          onClick={() => openPanel('market', { filters: query })}
        >
          <Store className="size-3" />
          Market
        </Button>
      </Tip>
      {/* The span carries the hint while the button is disabled (signed out, already watching) */}
      <Tip
        label={
          signedOut
            ? 'Sign in to watch the market'
            : watching
              ? `Watching: ${watching.name}`
              : `Get an alert for every new ${item.name} listing`
        }
      >
        <span tabIndex={disabled || watching ? 0 : undefined}
          className="inline-flex">
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-[11px] aria-pressed:border-primary/50 aria-pressed:bg-primary/10 aria-pressed:text-primary"
            aria-pressed={!!watching}
            disabled={disabled || !!watching}
            onClick={() => watchSimItem(store, item, filters)}
          >
            {busy ? (
              <Loader2 className="size-3 animate-spin" />
            ) : watching ? (
              <Bell className="size-3" />
            ) : (
              <Eye className="size-3" />
            )}
            {watching ? 'Watching' : 'Watch'}
          </Button>
        </span>
      </Tip>
    </div>
  );
}
