/**
 * The price check's current search (item, selected stat rows with their min/max, type/base/quality, sockets,
 * ethereal, corruption) as `Partial<MarketFilters>`: what the price check sends the market service, and what
 * "Open in market" opens the market browser with (`openPanel('market', { filters })`).
 *
 * The price check's own PD2 query (`buildGetMarketListingQuery`) already resolves the item to type/base codes,
 * name and modifier names (skills included), so it is built first and read back into filters: both search the
 * same thing. Modifier shapes the service's stat-key grammar can't express yet are reported as gaps
 * (`MarketFilterGap`); the price check sends those searches to PD2 instead.
 */
import { modifierByName } from '@/assets/modifiers';
import type { ItemType as PD2Item } from '@/assets/itemFuzzySearch';
import { buildGetMarketListingQuery, type QualitySearch } from '@/pages/price-check/lib/tradeUrlBuilder';
import type { Item, Stat, StatFilterInput } from '@/pages/price-check/lib/interfaces';
import { StatId } from '@/pages/price-check/lib/stat-mappings';
import { PSEUDO_KEY_PREFIX } from '@/pages/price-check/lib/utils';
import { findBaseOption, findTypeOption } from '@/pages/market/lib/catalog';
import type { MarketFilters, MarketListingStatus, Rarity, StatFilter } from '@/pages/market/lib/types';

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
  /** The header's quality: one, or several for "Any". */
  qualityOverride?: QualitySearch;
}

/**
 * A price-check row the market service can't filter like the PD2 query does:
 * - `label`: a skill without a known id, matched by the modifier's label (the service doesn't index labels);
 * - `slot-value`: a pinned value or slot range that isn't a non-negative integer (the key grammar's slots).
 */
export type MarketFilterGap = 'label' | 'slot-value';

/**
 * Show Expired: PD2's listingArchive holds every ended listing (sold through an offer, removed by the seller,
 * expired), and players mostly trade in game and then remove the listing, so all three are the archive.
 */
export const ARCHIVE_STATUSES: MarketListingStatus[] = ['sold', 'removed', 'expired'];

const RARITIES: readonly Rarity[] = ['Normal', 'Superior', 'Magic', 'Rare', 'Crafted', 'Set', 'Unique', 'Runeword'];

/** Charm base codes → item type codes (the price check queries charms by `$in` of all four charm types). */
const CHARM_TYPE_BY_BASE: Record<string, string> = { cm1: 'scha', cm2: 'mcha', cm3: 'lcha' };

/** Combined price-check rows that are no PD2 modifier: each expands to the modifiers it stands for. */
const COMBINED_MODIFIERS: Record<string, string[]> = {
  all_resist: ['fireresist', 'lightresist', 'coldresist', 'poisonresist'],
  all_attributes: ['strength', 'energy', 'dexterity', 'vitality'],
};

type ElemMatch = Record<string, unknown> & { name: string | { $in: string[] } };

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

/** A value the key grammar can pin: a non-negative integer of at most 6 digits. */
const isSlotNumber = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < 1e6;

/** How many leading `values` a price-check `$elemMatch` constrains (skill, level, chance / charges). */
const QUERY_SLOTS = 3;

/**
 * One `$elemMatch` → stat rows, in the service's key grammar (`MarketFilters` stat keys, see market/lib/stats.ts):
 * `values.N` pinned to an id (`N`, `{ $in }` → `N|M`) or bounded become `{…}` slots, the last bounded value is the
 * roll (`[i]` when it isn't the grammar's default). E.g. a skill `item_singleskill{54}`, chance to cast
 * `item_skillongethit{*,44}[0]`, an aura by any of its ids `item_aura{98|123}`, splash `item_splashonhit[2]`, an
 * elemental damage line `firedam|firemindam{4..}` (min ≥ 4, max rolled). A skill matched by its label is a gap: its
 * row keeps the rest, which is broader than the PD2 query.
 */
function statRows(match: ElemMatch, gaps: Set<MarketFilterGap>): Omit<StatFilter, 'id'>[] {
  if (typeof match.name !== 'string') {
    const alternatives = match.name.$in;
    const physical = PHYSICAL_DAMAGE_KEYS.find((k) => alternatives.every((n) => k.split('|').includes(n)));
    if (physical) return [{ kind: 'mod', key: physical, ...readRange(match['values.0']), enabled: true }];
  } else if (COMBINED_MODIFIERS[match.name]) {
    const range = readRange(match['values.0']);
    return COMBINED_MODIFIERS[match.name].map((key) => ({ kind: 'mod', key, ...range, enabled: true }));
  }
  if ('label' in match) gaps.add('label');
  const names = typeof match.name === 'string' ? [modifierName(match.name)] : match.name.$in;

  const values = Array.from({ length: QUERY_SLOTS }, (_, i) => match[`values.${i}`]);
  const bounded = values.flatMap((v, i) => (Object.keys(readRange(v)).length > 0 ? [i] : []));
  const rollIndex = bounded.length > 0 ? bounded[bounded.length - 1] : null;
  const slots = values.map((v, i): string => {
    if (v === undefined || i === rollIndex) return '*';
    const anyOf = prop(v, '$in');
    if (isSlotNumber(v)) return String(v);
    if (Array.isArray(anyOf) && anyOf.length > 0 && anyOf.every(isSlotNumber)) return anyOf.join('|');
    const { min, max } = readRange(v);
    const ends = [min, max].filter((end) => end !== undefined);
    if (ends.length > 0 && ends.every(isSlotNumber)) return min === max ? String(min) : `${min ?? ''}..${max ?? ''}`;
    gaps.add('slot-value');
    return '*';
  });
  while (slots.length > 0 && slots[slots.length - 1] === '*') slots.pop();
  // The grammar rolls the value after the slots; without slots values.0, except item_elemskill_* (values.1, as on
  // the site), which keeps that default for the PD2 query's values.0 bound
  const index = rollIndex !== null && rollIndex !== slots.length ? `[${rollIndex}]` : '';
  const key = `${names.join('|')}${slots.length > 0 ? `{${slots.join(',')}}` : ''}${index}`;
  return [{ kind: 'mod', key, ...(rollIndex === null ? {} : readRange(values[rollIndex])), enabled: true }];
}

/** Market filters read from a price-check PD2 market query, and the parts of it they can't express. */
export interface MarketQueryFilters {
  filters: Partial<MarketFilters>;
  gaps: MarketFilterGap[];
}

/** Reads a price-check PD2 market query back into market filters. */
export function marketQueryToFilters(query: Record<string, unknown>, archive: boolean): MarketQueryFilters {
  const gaps = new Set<MarketFilterGap>();
  const out: Partial<MarketFilters> = {
    source: archive ? 'archive' : 'live',
    // The price check's windows: 14 days of sales, 3 days of live listings
    maxAgeDays: archive ? 14 : 3,
  };
  if (typeof query.is_hardcore === 'boolean') out.hardcore = query.is_hardcore;
  if (typeof query.is_ladder === 'boolean') out.ladder = query.is_ladder;

  const quality = query['item.quality.name'];
  const qualities = typeof quality === 'string' ? [quality] : prop(quality, '$in');
  if (Array.isArray(qualities)) {
    const rarity = qualities.filter(
      (q: unknown): q is Rarity => typeof q === 'string' && (RARITIES as readonly string[]).includes(q),
    );
    if (rarity.length > 0) out.rarity = rarity;
  }

  const name = query['item.name'];
  const nameText = typeof name === 'string' ? name : prop(name, '$regex');
  if (typeof nameText === 'string' && nameText) out.itemName = nameText;

  const baseCode = query['item.base_code'];
  const baseGroup = prop(baseCode, '$in');
  if (typeof baseCode === 'string' && baseCode) out.baseCode = baseCode;
  // Grouped bases (`{ $in: ['glw', 'glws'] }`) → their catalog option, else the group the service also accepts
  else if (Array.isArray(baseGroup) && baseGroup.length > 0 && baseGroup.every((c) => typeof c === 'string')) {
    out.baseCode = findBaseOption(baseGroup[0])?.baseCode ?? JSON.stringify({ $in: baseGroup });
  }
  const typeCode = query['item.base.type_code'];
  const typeGroup = prop(typeCode, '$in');
  if (typeof typeCode === 'string' && typeCode) out.typeCode = typeCode;
  else if (typeof baseCode === 'string' && CHARM_TYPE_BY_BASE[baseCode]) out.typeCode = CHARM_TYPE_BY_BASE[baseCode];
  // Grouped types (`{ $in: ['h2h', 'h2h2'] }`) → their catalog option ("Fist Weapon")
  else if (Array.isArray(typeGroup) && typeof typeGroup[0] === 'string') {
    const option = findTypeOption(typeGroup[0]);
    if (option) out.typeCode = option.code;
  }

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
  out.stats = [...matches.flatMap((match) => statRows(match, gaps)), ...corruptionRows].map((row) => ({
    ...row,
    id: crypto.randomUUID(),
  }));
  return { filters: out, gaps: [...gaps] };
}

/**
 * The price check's current search as market filters (no `status`: Show Expired searches `ARCHIVE_STATUSES` in
 * the price check, the market browser's sold archive when opened there), and the gaps PD2 would fill.
 */
export function priceCheckMarketSearch(search: PriceCheckSearch): MarketQueryFilters {
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
  const { filters, gaps } = marketQueryToFilters(query, search.archive);
  filters.ethereal = search.item.isEthereal && search.selected.has(`id:${StatId.Ethereal}`) ? 'yes' : 'any';
  // Runewords keep their base's quality on PD2; the service selects them by Runeword (`item.is_runeword`), and
  // would leave them out of a Normal/Superior search
  if (search.item.isRuneword) filters.rarity = ['Runeword'];
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
  return { filters, gaps };
}

/** The price check's current search as market filters ("Open in market"). */
export function priceCheckToMarketFilters(search: PriceCheckSearch): Partial<MarketFilters> {
  return priceCheckMarketSearch(search).filters;
}
