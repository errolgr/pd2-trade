import React, { useEffect, useMemo, useState } from 'react';
import { Copy, Eye, EyeOff, Shield, Store } from 'lucide-react';
import { cn } from '@pd2-trader/ui';
import { useOptions, type ISettings } from '@/hooks/useOptions';
import { writeText } from '@/lib/browser-clipboard';
import type { BuildsFilters } from '@/lib/builds-api';
import { showToast } from '@/overlay';
import { ItemIcon } from '@/pages/builds/components/parts';
import {
  type ListingMarketPrice,
  type MarketPriceItem,
  useMarketPrices,
} from '@/pages/chat/hooks/useListingMarketPrices';
import { namePriceCode } from '@/pages/chat/lib/price-codes';
import { qualityColor } from '@/pages/price-check/lib/qualityColor';
import { toggleWatch, watchState } from '@/pages/market/alerts/WatchButton';
import { formatHrPrice } from '@/pages/market/components/ResultsList';
import { useItemNameSuggestions } from '@/pages/market/hooks/useItemNameSuggestions';
import { useSearchDefaults } from '@/pages/market/hooks/useSearchDefaults';
import { itemNameOption, type ItemNameOption } from '@/pages/market/lib/catalog';
import { defaultFilters, mergeFilters, type SearchDefaults, upgradeFilters } from '@/pages/market/lib/defaults';
import { suggestionKey, type ItemNameSuggestion } from '@/pages/market/lib/name-suggestions';
import type { MarketFilters } from '@/pages/market/lib/types';
import { type MarketStore, useMarketStore } from '@/pages/market/store/useMarketStore';
import { t } from '@/i18n';
import { matchTier } from '../lib/match';
import {
  PALETTE_DEBOUNCE_MS,
  PALETTE_REMOTE_MIN_CHARS,
  type PaletteAction,
  type PaletteItem,
  type PaletteRef,
  type PaletteSource,
} from '../lib/types';

const ICON = 'h-4 w-4';
const QUALITIES: readonly ItemNameOption['quality'][] = ['Unique', 'Set', 'Runeword', 'Base'];

/** What picking this name in the market's item-name box sets (MarketBrowserPage: `{ ...filters, itemName }`). */
export const itemMarketFilters = (name: string): Partial<MarketFilters> => ({ itemName: name });

/**
 * The builds Meta tab's worn-item key for a name (`unique:harlequin_crest`, `rw:call_to_arms`: the server's
 * normalized name); null for bases, runes and misc items, which the item filter doesn't list.
 */
export function buildsItemKey(name: string, quality: ItemNameOption['quality']): string | null {
  const prefix = quality === 'Unique' ? 'unique' : quality === 'Set' ? 'set' : quality === 'Runeword' ? 'rw' : null;
  return prefix ? `${prefix}:${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}` : null;
}

/** A recent / pinned item for its ref, or null when the ref isn't one this source wrote. */
export function refOption(ref: PaletteRef): ItemNameOption | null {
  const name = ref.data?.name;
  const quality = ref.data?.quality;
  if (typeof name !== 'string' || !name || !QUALITIES.includes(quality as ItemNameOption['quality'])) return null;
  const known = itemNameOption(name);
  if (known && known.quality === quality) return known;
  return { name, quality: quality as ItemNameOption['quality'] };
}

export function itemRef(option: ItemNameOption): PaletteRef {
  return {
    id: `items:${suggestionKey(option)}`,
    group: 'items',
    title: option.name,
    data: { name: option.name, quality: option.quality, baseCode: namePriceCode(option.name, option.quality) },
  };
}

/** Right side: "4.2 HR" and this week's change; a placeholder while it loads; nothing when unpriced. */
function ItemPrice({ price }: { price: ListingMarketPrice | null | undefined }) {
  if (price === undefined) return <span className="inline-block h-2 w-12 animate-pulse rounded-full bg-muted" />;
  const hr = price && formatHrPrice(price.hr);
  if (!hr) return null;
  const change = price.changePercent === undefined ? 0 : Math.round(price.changePercent);
  return (
    <span className="flex items-baseline gap-1.5 tabular-nums">
      <span className="font-semibold text-foreground">{hr}</span>
      {change !== 0 && (
        <span className={cn('text-2xs', change > 0 ? 'text-success' : 'text-destructive')}>
          {`${change > 0 ? '+' : '−'}${Math.abs(change)}%`}
        </span>
      )}
    </span>
  );
}

interface ItemContext {
  query: string;
  settings: ISettings;
  searchDefaults: SearchDefaults;
  store: MarketStore;
  prices: ReadonlyMap<string, ListingMarketPrice | null>;
}

function toItem(
  option: ItemNameSuggestion,
  { query, settings, searchDefaults, store, prices }: ItemContext,
): PaletteItem {
  const { name, quality } = option;
  const ref = itemRef(option);
  const priced = ref.data?.baseCode != null;
  const filters = itemMarketFilters(name);
  const actions: PaletteAction[] = [];

  // The market's own full filters for this search (what opening it would show), so Watch matches its saved searches
  const watchFilters = upgradeFilters(
    mergeFilters(
      defaultFilters(
        { hardcore: settings.mode === 'hardcore', ladder: settings.ladder !== 'non-ladder' },
        searchDefaults,
      ),
      filters,
    ),
  );
  const watch = watchState(store, watchFilters);
  if (!watch.disabled) {
    actions.push({
      id: 'watch',
      label: watch.watching ? t('market:palette.stopWatching') : t('market:palette.watchPrice'),
      icon: watch.watching ? <EyeOff className={ICON} /> : <Eye className={ICON} />,
      run: () => toggleWatch(store, watchFilters),
    });
  }

  const buildsKey = buildsItemKey(name, quality);
  if (buildsKey) {
    const buildsFilters: Partial<BuildsFilters> = {
      mode: settings.mode === 'hardcore' ? 'hardcore' : 'softcore',
      items: [buildsKey],
    };
    actions.push({
      id: 'builds',
      label: t('market:palette.buildsUsing'),
      icon: <Shield className={ICON} />,
      run: (ctx) => ctx.openPanel('builds', { tab: 'meta', filters: buildsFilters }),
    });
  }

  actions.push({
    id: 'copy',
    label: t('market:palette.copyName'),
    icon: <Copy className={ICON} />,
    run: async () => {
      try {
        await writeText(name);
        showToast({ title: t('market:palette.nameCopied'), description: name });
      } catch {
        showToast({
          title: t('market:palette.nameNotCopied'),
          description: t('market:actions.clipboardFailed'),
          variant: 'error',
        });
      }
    },
  });

  return {
    ref,
    titleClassName: quality === 'Runeword' ? 'text-q-rune' : qualityColor(quality),
    subtitle: [quality, option.slot].filter(Boolean).join(' · '),
    badge: option.alias ? query : undefined,
    // Typo and space-insensitive server matches ("theme" → The Meat Scraper) are guesses
    weak: !!query && !option.alias && matchTier(name, query) === 0,
    icon: (
      <ItemIcon
        item={{
          name,
          quality: quality === 'Base' ? 'Normal' : quality,
          runeword: quality === 'Runeword',
          base: quality === 'Base' ? name : undefined,
        }}
        size={20}
      />
    ),
    trailing: priced ? <ItemPrice price={prices.get(ref.id)} /> : undefined,
    primary: {
      id: 'market',
      label: t('market:palette.openInMarket'),
      icon: <Store className={ICON} />,
      run: (ctx) => ctx.openPanel('market', { filters }),
    },
    actions,
  };
}

/**
 * Items by name, as the market's item-name box finds them (local list at once, then the server's typo- and
 * nickname-tolerant search), each with its market price in the user's realm. Enter searches the market for it.
 */
export const useItemsSource: PaletteSource = ({ query, limit, refs }) => {
  const { settings } = useOptions();
  const searchDefaults = useSearchDefaults();
  const store = useMarketStore();
  const { suggestions, loading } = useItemNameSuggestions(limit > 0 ? query : '', limit, {
    debounceMs: PALETTE_DEBOUNCE_MS,
    minChars: PALETTE_REMOTE_MIN_CHARS,
  });

  const options = useMemo<ItemNameSuggestion[]>(() => {
    if (limit <= 0) return [];
    if (query) return suggestions;
    return refs.flatMap((ref) => {
      const option = refOption(ref);
      return option ? [option] : [];
    });
  }, [limit, query, suggestions, refs]);

  // Priced in the user's realm, as the price check does; once typing pauses (each keystroke would ask for
  // another batch), recents and pins right away
  const isLadder = settings.ladder === 'ladder';
  const isHardcore = settings.mode === 'hardcore';
  const priceItems = useMemo(
    () =>
      options.flatMap((o): MarketPriceItem[] => {
        const code = namePriceCode(o.name, o.quality);
        return code ? [{ id: itemRef(o).id, code, isLadder, isHardcore }] : [];
      }),
    [options, isLadder, isHardcore],
  );
  const priceKey = JSON.stringify(priceItems);
  const [typedPriceKey, setTypedPriceKey] = useState(priceKey);
  useEffect(() => {
    if (!query) return;
    const id = window.setTimeout(() => setTypedPriceKey(priceKey), PALETTE_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [priceKey, query]);
  const pricedItems = useMemo(
    () => (query ? (JSON.parse(typedPriceKey) as MarketPriceItem[]) : priceItems),
    [query, typedPriceKey, priceItems],
  );
  const prices = useMarketPrices(pricedItems);

  return useMemo(
    () => ({
      items: options.map((o) => toItem(o, { query, settings, searchDefaults, store, prices })),
      loading: limit > 0 && !!query && loading,
    }),
    [options, query, settings, searchDefaults, store, prices, limit, loading],
  );
};
