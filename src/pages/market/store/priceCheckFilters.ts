/**
 * Price check → market browser: the price check's current search (item, selected stat rows with their
 * min/max, type/base/quality, sockets, ethereal, corruption) as `Partial<MarketFilters>` for
 * `openPanel('market', { filters })`.
 *
 * The price check's own PD2 query (`buildGetMarketListingQuery`) already resolves the item to type/base codes,
 * name and modifier names (skills included), so it is built first and read back into filters: both views
 * search the same thing.
 */
import { modifierByName } from '@/assets/modifiers';
import type { ItemType as PD2Item } from '@/assets/itemFuzzySearch';
import { buildGetMarketListingQuery } from '@/pages/price-check/lib/tradeUrlBuilder';
import type { Item, Stat, StatFilterInput } from '@/pages/price-check/lib/interfaces';
import { DAMAGE_PAIRS, StatId, statIdToProperty } from '@/pages/price-check/lib/stat-mappings';
import { PSEUDO_KEY_PREFIX } from '@/pages/price-check/lib/utils';
import type { MarketFilters, Rarity, StatFilter } from '@/pages/market/lib/types';

export interface PriceCheckSearch {
  item: Item;
  pd2Item: PD2Item;
  /** useStatSelection: selected stat keys and their min/max inputs. */
  selected: Set<string>;
  filters: Record<string, StatFilterInput>;
  /** Settings mode/ladder. */
  settings: { mode?: string; ladder?: string };
  statMapper?: (statId: number, stat: Stat) => string | undefined;
  archive: boolean;
  /** 0 = base, 1 = item type (base qualities only). */
  searchMode: number;
  matchedItemType?: { typeLabel: string; typeValue: string; bases: Array<{ label: string; value: string }> } | null;
  /** 0 = any, 1 = corrupted, 2 = not corrupted. */
  corruptedState: number;
  corruptionNames: string[];
  qualityOverride?: string;
}

const RARITIES: readonly Rarity[] = ['Normal', 'Superior', 'Magic', 'Rare', 'Crafted', 'Set', 'Unique', 'Runeword'];

/** Charm base codes → item type codes (the price check queries charms by `$in` of all four charm types). */
const CHARM_TYPE_BY_BASE: Record<string, string> = { cm1: 'scha', cm2: 'mcha', cm3: 'lcha' };

/** Combined price-check rows that are no PD2 modifier: each expands to the modifiers it stands for. */
const COMBINED_MODIFIERS: Record<string, string[]> = {
  all_resist: ['fireresist', 'lightresist', 'coldresist', 'poisonresist'],
  all_attributes: ['strength', 'energy', 'dexterity', 'vitality'],
};

type ElemMatch = Record<string, unknown> & { name: string | { $in: string[] } };

/**
 * Damage pair rows query one market modifier under several names (`{ $in: ['firedam', …] }`, min in values.0,
 * max in values.1) or, for physical damage, two; the market browser filters the site's min/max damage keys.
 */
function damagePairRows(match: ElemMatch): Omit<StatFilter, 'id'>[] | null {
  if (typeof match.name === 'string') return null;
  const names = match.name.$in;
  const pair = DAMAGE_PAIRS.find((p) => p.market?.some((n) => names.includes(n)));
  if (pair) {
    return [
      { kind: 'mod', key: statIdToProperty[pair.min], ...readRange(match['values.0']), enabled: true },
      { kind: 'mod', key: statIdToProperty[pair.max], ...readRange(match['values.1']), enabled: true },
    ];
  }
  const key = PHYSICAL_DAMAGE_KEYS.find((k) => names.every((n) => k.split('|').includes(n)));
  return key ? [{ kind: 'mod', key, ...readRange(match['values.0']), enabled: true }] : null;
}

/** Market browser keys of the physical min/max damage modifiers (stat-options `a|b` alternatives). */
const PHYSICAL_DAMAGE_KEYS = [
  'min_damage|mindamage|secondary_mindamage|item_throw_mindamage',
  'max_damage|maxdamage|secondary_maxdamage|item_throw_maxdamage',
];

/** `value[key]` when value is an object (query fragments are loosely typed). */
function prop(value: unknown, key: string): unknown {
  return value && typeof value === 'object' && key in value ? (value as Record<string, unknown>)[key] : undefined;
}

/** The real PD2 modifier name (the price check's table drops the `item_` prefix of a few, e.g. maxdamage_percent). */
function modifierName(name: string): string {
  if (modifierByName[name]) return name;
  return modifierByName[`item_${name}`] ? `item_${name}` : name;
}

function readRange(value: unknown): { min?: number; max?: number } {
  const gte = prop(value, '$gte');
  const lte = prop(value, '$lte');
  return {
    ...(typeof gte === 'number' && Number.isFinite(gte) ? { min: gte } : {}),
    ...(typeof lte === 'number' && Number.isFinite(lte) ? { max: lte } : {}),
  };
}

/**
 * One `$elemMatch` → stat rows. A numeric `values.0` is a parameter (skill/class/tab id): the key takes the
 * site's `name{param}` form and the roll is `values.1`.
 */
function statRows(match: ElemMatch): Omit<StatFilter, 'id'>[] {
  const damage = damagePairRows(match);
  if (damage) return damage;
  if (typeof match.name !== 'string') return [];
  const param = match['values.0'];
  if (typeof param === 'number') {
    return [{ kind: 'mod', key: `${match.name}{${param}}`, ...readRange(match['values.1']), enabled: true }];
  }
  const range = readRange(param);
  const names = COMBINED_MODIFIERS[match.name] ?? [modifierName(match.name)];
  return names.map((key) => ({ kind: 'mod', key, ...range, enabled: true }));
}

/** Reads a price-check PD2 market query back into market filters. */
export function marketQueryToFilters(query: Record<string, unknown>, archive: boolean): Partial<MarketFilters> {
  const out: Partial<MarketFilters> = {
    source: archive ? 'archive' : 'live',
    // The price check's windows: 14 days of sales, 3 days of live listings
    maxAgeDays: archive ? 14 : 3,
  };
  if (typeof query.is_hardcore === 'boolean') out.hardcore = query.is_hardcore;
  if (typeof query.is_ladder === 'boolean') out.ladder = query.is_ladder;

  const quality = query['item.quality.name'];
  if (typeof quality === 'string' && (RARITIES as readonly string[]).includes(quality)) {
    out.rarity = [quality as Rarity];
  }

  const name = query['item.name'];
  const nameText = typeof name === 'string' ? name : prop(name, '$regex');
  if (typeof nameText === 'string' && nameText) out.itemName = nameText;

  const baseCode = query['item.base_code'];
  if (typeof baseCode === 'string' && baseCode) out.baseCode = baseCode;
  const typeCode = query['item.base.type_code'];
  if (typeof typeCode === 'string' && typeCode) out.typeCode = typeCode;
  else if (typeof baseCode === 'string' && CHARM_TYPE_BY_BASE[baseCode]) out.typeCode = CHARM_TYPE_BY_BASE[baseCode];

  if (query['item.corrupted'] === true) out.corrupted = 'yes';
  else if (query['item.corrupted'] === false) out.corrupted = 'no';

  if (query['item.is_ethereal'] === true) out.ethereal = 'yes';
  const sockets = readRange(query['item.socket_count']);
  if (sockets.min !== undefined) out.socketsMin = sockets.min;
  if (sockets.max !== undefined) out.socketsMax = sockets.max;

  const all = prop(query['item.modifiers'], '$all');
  const matches = Array.isArray(all)
    ? all.flatMap((m) => {
        const match = prop(m, '$elemMatch');
        const name = prop(match, 'name');
        const names = prop(name, '$in');
        return typeof name === 'string' || Array.isArray(names) ? [match as ElemMatch] : [];
      })
    : [];
  const corruptions = prop(query['item.corruptions'], '$all');
  const corruptionRows: Omit<StatFilter, 'id'>[] = Array.isArray(corruptions)
    ? corruptions.flatMap((key) => (typeof key === 'string' ? [{ kind: 'corruption', key, enabled: true }] : []))
    : [];
  out.stats = [...matches.flatMap(statRows), ...corruptionRows].map((row) => ({ ...row, id: crypto.randomUUID() }));
  return out;
}

/** The price check's current search as market filters. */
export function priceCheckToMarketFilters(search: PriceCheckSearch): Partial<MarketFilters> {
  const query = buildGetMarketListingQuery(
    search.item,
    search.pd2Item,
    search.selected,
    search.filters,
    search.settings,
    search.statMapper,
    search.archive,
    search.searchMode,
    search.matchedItemType,
    search.corruptedState,
    1,
    0,
    search.corruptionNames.length > 0 ? search.corruptionNames : undefined,
    search.qualityOverride,
  ) as unknown as Record<string, unknown>;
  const filters = marketQueryToFilters(query, search.archive);
  filters.ethereal = search.item.isEthereal && search.selected.has(`id:${StatId.Ethereal}`) ? 'yes' : 'any';
  // Pseudo rows (`pseudo:<id>` keys) aren't in the PD2 query: added from the selection
  for (const key of search.selected) {
    if (!key.startsWith(PSEUDO_KEY_PREFIX)) continue;
    const { min, max } = search.filters[key] ?? {};
    filters.stats!.push({
      id: crypto.randomUUID(),
      kind: 'pseudo',
      key: key.slice(PSEUDO_KEY_PREFIX.length),
      ...(min?.trim() ? { min: Number(min) } : {}),
      ...(max?.trim() ? { max: Number(max) } : {}),
      enabled: true,
    });
  }
  return filters;
}
