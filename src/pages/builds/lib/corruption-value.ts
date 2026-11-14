/**
 * Corruption-aware values for worn items. The builds API prices a unique or set item by its name alone (plus its
 * sockets), so a valuable corruption (Blackhand Key with +1 to All Skills) shows the plain item's price. Here a
 * corrupted unique/set item is priced from recent listings with the same corruption (pd2trader price check:
 * one price per listing); with too few of them it keeps the builds API price.
 */
import { useEffect, useMemo, useState } from 'react';
import { modifierByName } from '@/assets/modifiers';
import { fetch } from '@/lib/browser-http';
import type { BuildsMode, CharacterDetail, CharmItem, EquippedItem, Merc, PricedEquippedItem } from '@/lib/builds-api';
import { BACKEND_URL } from '@/lib/pkce';
import { getCurrentSeason } from '@/lib/seasons';
import { fetchMultipleItemPrices } from '@/pages/currency/lib/price-api';
import { corruptionNamesForLines } from '@/pages/price-check/lib/corruptions';

/** Listing windows tried in order (7 days, then 30): the first with enough listings prices the corruption. */
export const CORRUPTION_WINDOWS_HOURS = [168, 720] as const;
/** Fewest listings with the corruption that price it. */
export const MIN_CORRUPTION_LISTINGS = 3;
/** Sales a plain item price needs before the builds API counts it (the server's net worth MIN_SAMPLES). */
const MIN_PLAIN_PRICE_SAMPLES = 10;
const CACHE_TTL_MS = 10 * 60_000;

/** The fields of a `POST /api/price-check` comparable read here. */
export interface PriceCheckComparable {
  priceHr: number;
  /** 1 = matches every filter. */
  similarity: number;
  /** Labels of the listing's corruption names (one per name). */
  corruptions: string[];
  sockets: number;
}

/** What prices one corrupted item. */
export interface CorruptionQuery {
  /** Item name (the price check looks it up). */
  item: string;
  /** The corruption outcome, as market corruption names (`corruptionNamesForLines`). */
  corruption: string[];
  /** Socket count for a socket corruption, else null. */
  sockets: number | null;
  hardcore: boolean;
}

/** An item as priced here: `corruptionPriced` when `priceHr` comes from its corruption. */
export type CorruptionValued<T> = T & { corruptionPriced?: boolean };

export type CorruptionValuedCharacter = Omit<CharacterDetail, 'equipped' | 'merc' | 'charms'> & {
  equipped: CorruptionValued<PricedEquippedItem>[];
  merc: Merc<CorruptionValued<PricedEquippedItem>> | null;
  charms?: CorruptionValued<CharmItem>[];
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** The corruption query of a worn item: corrupted uniques and sets whose corruption is known, else null. */
export function corruptionQueryOf(item: EquippedItem, mode: BuildsMode): CorruptionQuery | null {
  if (!item.corrupted || !(item.key.startsWith('unique:') || item.key.startsWith('set:'))) return null;
  const corruption = corruptionNamesForLines(item.corruptedMods ?? []);
  if (!corruption) return null;
  return {
    item: item.name,
    corruption,
    sockets: corruption.includes('item_numsockets') ? item.sockets : null,
    hardcore: mode === 'hardcore',
  };
}

/**
 * Mean price of the comparables with exactly the queried corruption: every filter matched (the price check
 * matches listings whose corruption includes the asked names) and as many corruption names as the outcome.
 * Null with fewer than MIN_CORRUPTION_LISTINGS.
 */
export function corruptionListingsValue(comparables: PriceCheckComparable[], query: CorruptionQuery): number | null {
  const prices = comparables
    .filter(
      (c) =>
        c.similarity === 1 &&
        c.corruptions.length === query.corruption.length &&
        (query.sockets === null || c.sockets === query.sockets),
    )
    .map((c) => c.priceHr);
  if (prices.length < MIN_CORRUPTION_LISTINGS) return null;
  return round2(prices.reduce((sum, p) => sum + p, 0) / prices.length);
}

async function priceCheckComparables(query: CorruptionQuery, hours: number): Promise<PriceCheckComparable[]> {
  const response = await fetch(`${BACKEND_URL}/api/price-check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      item: query.item,
      corrupted: true,
      // The price check knows modifier names only, not markers like `dmg%` / `all_resist`
      corruption: query.corruption.filter((name) => modifierByName[name]).join(','),
      ...(query.sockets !== null && { sockets: query.sockets }),
      isLadder: true,
      isHardcore: query.hardcore,
      hours,
    }),
  });
  if (!response.ok) throw new Error(`Price check answered ${response.status}`);
  const body = await response.json();
  // A filter it couldn't apply makes its "exact" matches inexact
  if (!Array.isArray(body?.comparables) || body.ignoredFilters?.length) return [];
  return body.comparables;
}

const valueCache = new Map<string, { at: number; value: Promise<number | null> }>();

/** Tests: forget cached corruption values. */
export function clearCorruptionValueCache() {
  valueCache.clear();
}

/** The corruption's listing value (cached; failures are not), null when no window has enough listings. */
export function corruptionValue(query: CorruptionQuery): Promise<number | null> {
  const key = JSON.stringify([query.item, query.corruption, query.sockets, query.hardcore]);
  const hit = valueCache.get(key);
  if (hit && Date.now() - hit.at <= CACHE_TTL_MS) return hit.value;
  const value = (async () => {
    for (const hours of CORRUPTION_WINDOWS_HOURS) {
      const found = corruptionListingsValue(await priceCheckComparables(query, hours), query);
      if (found !== null) return found;
    }
    return null;
  })();
  const entry = { at: Date.now(), value };
  valueCache.set(key, entry);
  value.catch(() => {
    if (valueCache.get(key) === entry) valueCache.delete(key);
  });
  return value;
}

/**
 * The plain item prices the builds API counted for these codes (`unique:<code>` / `set:<code>`), 0 for those it
 * left out: its price set is the 7-day moving average (else median) over the season, counted with enough sales.
 * Null when the request failed.
 */
async function plainItemPrices(
  codes: string[],
  hardcore: boolean,
  seasonStart: string,
): Promise<Map<string, number> | null> {
  const found = await fetchMultipleItemPrices(
    codes.map((baseCode) => ({ baseCode })),
    { isLadder: true, isHardcore: hardcore, startDate: seasonStart, hours: 168 },
  );
  if (!found) return null;
  return new Map(
    codes.map((code) => {
      const entry = found.get(code);
      const price = entry ? (entry.movingAverage7Days ?? entry.medianPrice) : 0;
      return [code, entry && entry.sampleCount >= MIN_PLAIN_PRICE_SAMPLES && price > 0 ? price : 0];
    }),
  );
}

/**
 * An item's price with its corruption valued at `value`: what the builds API added for its sockets is kept,
 * the plain item price it counted (`plainPrice`) is replaced. Null when the item has socketed items and the plain
 * price is unknown (the socket part can't be told apart).
 */
export function corruptionPricedHr(
  item: Pick<PricedEquippedItem, 'priceHr' | 'socketed'>,
  value: number,
  plainPrice: number | undefined,
): number | null {
  if (!item.socketed.length) return round2(value);
  if (plainPrice === undefined) return null;
  return round2(value + Math.max(0, (item.priceHr ?? 0) - plainPrice));
}

/** The character with `prices` (by item) applied; the gear value (worn + merc items) moves by the same amounts. */
export function applyCorruptionPrices(
  detail: CharacterDetail,
  prices: ReadonlyMap<EquippedItem, number>,
): CorruptionValuedCharacter {
  let delta = 0;
  const priced = <T extends PricedEquippedItem>(items: T[], inGearValue: boolean): CorruptionValued<T>[] =>
    items.map((item) => {
      const priceHr = prices.get(item);
      if (priceHr === undefined) return item;
      if (inGearValue) delta += priceHr - (item.priceHr ?? 0);
      return { ...item, priceHr, corruptionPriced: true };
    });
  const equipped = priced(detail.equipped, true);
  const merc = detail.merc ? { ...detail.merc, equipped: priced(detail.merc.equipped, true) } : null;
  const charms = detail.charms && priced(detail.charms, false);
  return {
    ...detail,
    equipped,
    merc,
    ...(charms && { charms }),
    gearValueHr: detail.gearValueHr === null && delta === 0 ? null : round2((detail.gearValueHr ?? 0) + delta),
  };
}

/**
 * A current-season character with its corrupted uniques and sets priced by their corruption (see the module doc).
 * Shows the builds API prices until those values arrive; other seasons keep them.
 */
export function useCorruptionPrices(detail: CharacterDetail | null): CorruptionValuedCharacter | null {
  const [found, setFound] = useState<{ detail: CharacterDetail; prices: Map<EquippedItem, number> } | null>(null);

  useEffect(() => {
    const season = getCurrentSeason();
    if (!detail || !season || detail.season !== season.id) return;
    const queries = [...detail.equipped, ...(detail.merc?.equipped ?? []), ...(detail.charms ?? [])].flatMap((item) => {
      const query = corruptionQueryOf(item, detail.mode);
      // `unique:<code>` / `set:<code>`: the code the builds API priced the plain item by
      return query ? [{ item, query, code: item.key.slice(item.key.indexOf(':') + 1) }] : [];
    });
    if (!queries.length) return;
    let cancelled = false;
    const socketedCodes = [...new Set(queries.filter(({ item }) => item.socketed.length).map(({ code }) => code))];
    void Promise.all([
      socketedCodes.length ? plainItemPrices(socketedCodes, detail.mode === 'hardcore', season.startDate) : null,
      Promise.all(queries.map(({ query }) => corruptionValue(query).catch(() => null))),
    ]).then(([plain, values]) => {
      if (cancelled) return;
      const prices = new Map<EquippedItem, number>();
      queries.forEach(({ item, code }, i) => {
        const value = values[i];
        const priceHr = value === null ? null : corruptionPricedHr(item, value, plain?.get(code));
        if (priceHr !== null) prices.set(item, priceHr);
      });
      setFound({ detail, prices });
    });
    return () => {
      cancelled = true;
    };
  }, [detail]);

  return useMemo(
    () =>
      detail && found?.detail === detail && found.prices.size ? applyCorruptionPrices(detail, found.prices) : detail,
    [detail, found],
  );
}
