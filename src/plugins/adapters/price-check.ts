import type { CorePrice, GameMode, PluginItem, PluginItemStat } from '@pd2-trader/plugin-sdk';
import type { Item, Stat } from '@/pages/price-check/lib/interfaces';
import { StatId } from '@/pages/price-check/lib/stat-mappings';
import { statText } from '@/pages/price-check/lib/tooltip-lines';
import type { AveragePriceResponse } from '@/pages/currency/lib/price-api';
import type { ISettings } from '@/hooks/useOptions';

/** Plain JSON views of a price-checked item for `priceCheck.*` slots and the `item.priceChecked` event. */

function statLine(stat: Stat, item: Item): string {
  const text = statText(stat, item);
  if (text) return text;
  return stat.value !== undefined ? `${stat.name}: ${stat.value}` : stat.name;
}

export function toPluginItem(item: Item): PluginItem {
  const quality = item.quality.toLowerCase();
  // Injected rows (the "Corrupted" filter row of an uncorrupted item) are filters, not stats.
  const stats = item.stats.filter((s) => !s._injected);
  const name = item.isRuneword
    ? item.runeword || item.name || item.type
    : quality === 'unique' || quality === 'set'
      ? item.name || item.type
      : item.type || item.name || '';
  return {
    name: name ?? '',
    base: item.type ?? '',
    quality,
    isRuneword: !!item.isRuneword,
    ethereal: !!item.isEthereal || stats.some((s) => s.stat_id === StatId.Ethereal),
    corrupted: stats.some((s) => s.stat_id === StatId.Corrupted || s.corrupted),
    sockets: item.sockets ?? 0,
    itemLevel: item.iLevel,
    stats: stats.map(
      (s): PluginItemStat => ({
        id: s.stat_id,
        text: statLine(s, item),
        ...(s.value !== undefined && Number.isFinite(s.value) && { value: s.value }),
        ...(s.corrupted && { corrupted: true }),
      }),
    ),
  };
}

export function toCorePrice(price: AveragePriceResponse | null): CorePrice | null {
  if (!price) return null;
  const finite = (n: number | undefined) => (n !== undefined && Number.isFinite(n) ? n : null);
  return {
    medianHr: finite(price.medianPrice),
    lowHr: finite(price.minPrice),
    highHr: finite(price.maxPrice),
    sampleCount: price.sampleCount ?? 0,
    change7dPercent: finite(price.priceChange7Days?.changePercent),
  };
}

export function toGameMode(settings: Pick<ISettings, 'ladder' | 'mode'>): GameMode {
  return { ladder: settings.ladder !== 'non-ladder', hardcore: settings.mode === 'hardcore' };
}
