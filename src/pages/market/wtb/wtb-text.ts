/**
 * How a buy request reads: its title (built from the filters when posting), the stat summary line and the colour
 * of its title. Titles are plain English like the game data they are made of; pure (no React).
 */
import { t } from '@/i18n';
import { STAT_RANGE_DATA } from '@/assets/stat-ranges.data';
import { qualityColor } from '@/pages/price-check/lib/qualityColor';
import {
  basesForType,
  corruptionOption,
  findBaseOption,
  findTypeOption,
  itemNameOption,
  optionCodes,
} from '../lib/catalog';
import { itemPropertyOption, pseudoIdOf, readStatValue, statLabel } from '../lib/stats';
import { computePseudo } from '../lib/pseudo';
import { baseValueLabel, pickedBases, typeValueLabel } from '../lib/type-selection';
import type { MarketFilters, StatFilter } from '../lib/types';
import type { Modifier } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { MAX_WTB_TITLE, requiredRows, wtbStatRows } from '../lib/wtb';
import { filterName, formatStat, statWithValue } from '../components/stat-text';

const clamp = (text: string) => (text.length > MAX_WTB_TITLE ? `${text.slice(0, MAX_WTB_TITLE - 1)}…` : text);

/** "Faster Cast Rate", "+20 Faster Cast Rate", "Sockets ≥ 3", "Life ≤ 50": one stat row, short. */
export function statRowText(row: StatFilter): string {
  const { min, max } = row;
  let text: string;
  if (row.kind === 'item') {
    const label = itemPropertyOption(row.key)?.label;
    text =
      label && min !== undefined && max === undefined
        ? label.replace('{X}', formatStat(min))
        : rangeText(row, min, max);
  } else if (row.kind === 'corruption' && !corruptionOption(row.key).rolled) {
    text = filterName(row);
  } else if (min !== undefined && max === undefined && statLabel(row.key) !== row.key) {
    text = statWithValue(row.key, min, { short: true });
  } else {
    text = rangeText(row, min, max);
  }
  return row.not ? t('market:filters.applied.not', { name: text }) : text;
}

function rangeText(row: StatFilter, min: number | undefined, max: number | undefined): string {
  const name = filterName(row);
  if (min !== undefined && max !== undefined)
    return min === max ? `${name} ${formatStat(min)}` : `${name} ${formatStat(min)}–${formatStat(max)}`;
  if (min !== undefined) return `${name} ≥ ${formatStat(min)}`;
  if (max !== undefined) return `${name} ≤ ${formatStat(max)}`;
  return name;
}

/** A stat row's line in a summary: corruption rows marked `c:`. */
export const summaryRowText = (row: StatFilter): string =>
  row.kind === 'corruption' ? `c: ${statRowText(row)}` : statRowText(row);

/** "+2 Sorceress Skills · +20 Faster Cast Rate · c: +1 All Skills": every stat row of a request. */
export const statSummary = (filters: Pick<MarketFilters, 'stats'>): string =>
  wtbStatRows(filters).map(summaryRowText).join(' · ');

/** The single rarity the filters pin, if any. */
const singleRarity = (f: MarketFilters) => (f.rarity.length === 1 ? f.rarity[0] : undefined);

/**
 * A request's title from its filters: the item name ("Harlequin Crest"), else the rarity and base or type ("Rare
 * Circlet", "Ethereal Polearm"), else what it wants of a stat ("Item with +20 Faster Cast Rate"). At most
 * MAX_WTB_TITLE characters.
 */
export function wtbTitle(f: MarketFilters, niceToHaveIds: readonly string[] = []): string {
  if (f.itemName) return clamp(f.itemName);
  const base = pickedBases(f) ? undefined : baseValueLabel(f);
  const kind = base ?? typeValueLabel(f);
  const ethereal = f.ethereal === 'yes' ? 'Ethereal' : undefined;
  if (kind) return clamp([ethereal, singleRarity(f), kind].filter(Boolean).join(' '));
  const [first] = requiredRows(f, niceToHaveIds);
  const what = [ethereal, singleRarity(f), 'item'].filter(Boolean).join(' ');
  const noun = what.charAt(0).toUpperCase() + what.slice(1);
  return clamp(first ? `${noun} with ${statRowText(first)}` : noun);
}

/** The title's colour: the named item's quality, else the single rarity searched. */
export function wtbTitleColor(f: Pick<MarketFilters, 'itemName' | 'rarity'>): string {
  const named = f.itemName ? itemNameOption(f.itemName) : undefined;
  if (named)
    return named.quality === 'Runeword' ? 'text-q-rune' : qualityColor(named.quality === 'Base' ? '' : named.quality);
  return qualityColor(f.rarity?.length === 1 ? f.rarity[0] : '');
}

/** What a request's icon shows: a unique/set by name, else a base by name (the listing art lookup's inputs). */
export interface WtbArt {
  name: string;
  quality: 'Unique' | 'Set' | null;
  baseName: string | null;
}

/** A single base's label: the first code of a `{"$in": [...]}` value. */
function baseLabel(baseCode: string): string | null {
  const code = optionCodes(baseCode)[0];
  const option = code ? findBaseOption(code) : null;
  return (option && basesForType(option.typeCode).find((b) => b.code === code)?.label) ?? null;
}

/**
 * The request's icon: a unique or set item's art; else its base's (the item name when it names a base, else
 * `baseCode`); else its type's first base (the first type of a group or `{"$in"}`; a member of a grouped site
 * type its own first base); null for none (runewords without a base, stat-only requests).
 */
export function wtbArt(f: Pick<MarketFilters, 'itemName' | 'baseCode' | 'typeCode'>): WtbArt | null {
  const named = f.itemName ? itemNameOption(f.itemName) : undefined;
  if (f.itemName && (named?.quality === 'Unique' || named?.quality === 'Set'))
    return { name: f.itemName, quality: named.quality, baseName: null };
  if (f.itemName && named?.quality === 'Base') return { name: f.itemName, quality: null, baseName: f.itemName };
  const base = f.baseCode ? baseLabel(f.baseCode) : null;
  if (base) return { name: base, quality: null, baseName: base };
  const type = f.typeCode ? optionCodes(f.typeCode)[0] : undefined;
  if (!type) return null;
  const own = basesForType(type);
  // A member of a grouped site type (`ring` of Jewelry) has its bases under the group's option: the first one of
  // that member type (game data: base code → type), else the group's first
  const bases = own.length ? own : basesForType(findTypeOption(type)?.code);
  const ofType = own.length
    ? undefined
    : bases.find((b) => optionCodes(b.code).some((code) => STAT_RANGE_DATA.bases[code]?.[0] === type));
  const first = (ofType ?? bases.find((b) => !b.code.startsWith('{')))?.label;
  return first ? { name: first, quality: null, baseName: first } : null;
}

/** The item's value for a stat row ("your value" beside a request's row); null when unknown or not a number. */
export function itemRowValue(item: { modifiers?: unknown[]; socket_count?: number }, row: StatFilter): number | null {
  const mods = (item.modifiers ?? []) as Modifier[];
  switch (row.kind) {
    case 'mod':
      return readStatValue(mods, row.key);
    case 'pseudo':
      return computePseudo({ modifiers: mods })[pseudoIdOf(row.key)] ?? null;
    case 'item':
      return row.key === 'sockets' ? (item.socket_count ?? 0) : null;
    case 'corruption':
      return corruptionOption(row.key).rolled ? readStatValue(mods, row.key) : null;
  }
}
