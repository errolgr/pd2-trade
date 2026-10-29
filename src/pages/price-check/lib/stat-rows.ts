/**
 * Clipboard item → the price check's stat rows: one row per line the game draws (min/max ED, the four equal
 * resists / attributes and every min/max damage pair merged like the tooltip), plus Sockets / Ethereal /
 * Corrupted pseudo-rows, each with the range PD2's tooltip shows. The price check UI, the PD2 market query
 * and the trade URL all read these rows, so a row key means the same stat everywhere.
 */
import type { Item, Stat } from './interfaces';
import {
  DAMAGE_PAIRS,
  damagePairValues,
  PRIORITY_STATS,
  StatId,
  statRemap,
  statRemapByName,
  STRIP_STATS,
} from './stat-mappings';
import { bhStatRange, statRowRange } from './stat-ranges';
import { getStatKey, getTypeFromBaseType } from './utils';

/**
 * List of base type labels that cannot be corrupted (special cases)
 */
const NON_CORRUPTABLE_TYPE_LABELS = new Set(['Rune', 'Gem', 'Charm', 'Map Orb']);

/**
 * Whitelist of type codes that CAN be corrupted. Matched against every code of a grouped type
 * (Jewelry `{"$in": ["amul", "ring", "amus"]}`, belts, claws).
 */
const CORRUPTABLE_TYPE_CODES = new Set([
  '2hcs',
  'abow',
  'ajav',
  'aspe',
  'tors',
  'axe',
  'phlm',
  'bels',
  'belt',
  'boot',
  'bow',
  'bowq',
  'circ',
  'club',
  'xbow',
  'xboq',
  'knif',
  'pelt',
  'h2h',
  'h2h2',
  'glov',
  'hamm',
  'helm',
  'jave',
  'mace',
  't1m',
  't2m',
  't3m',
  't4m',
  't5m',
  'ashd',
  'pole',
  'scep',
  'sc9',
  'shie',
  'head',
  'orb',
  'spea',
  'staf',
  'swor',
  'taxe',
  'tkni',
  'wand',
  'ring',
  'amul',
  'amus',
]);

/**
 * Checks if an item is corruptable based on its base type
 * An item is corruptable if its type code IS in the corruptable list
 */
export function isItemCorruptable(item: Pick<Item, 'type'>): boolean {
  if (!item.type) return false;

  // Check special type labels first (exact match)
  if (NON_CORRUPTABLE_TYPE_LABELS.has(item.type)) {
    return false;
  }

  // Check if the item type ends with any of the non-corruptable labels (for cases like "Grand Charm")
  const itemTypeLower = item.type.toLowerCase();
  for (const label of NON_CORRUPTABLE_TYPE_LABELS) {
    const labelLower = label.toLowerCase();
    // Check if the type ends with the label (e.g., "Grand Charm" ends with "Charm")
    if (itemTypeLower === labelLower || itemTypeLower.endsWith(' ' + labelLower)) {
      return false;
    }
  }

  // Type code(s) of the base; grouped types (`{"$in": [...]}`) list several
  const typeInfo = getTypeFromBaseType(item.type, true);
  if (!typeInfo) return false; // If we can't determine the type, assume it's NOT corruptable (safer default)

  const { type } = typeInfo;
  const codes: unknown[] = typeof type === 'string' ? [type] : '$in' in type && Array.isArray(type.$in) ? type.$in : [];
  return codes.some((code) => typeof code === 'string' && CORRUPTABLE_TYPE_CODES.has(code));
}

/** Replace `sources` with `row` where the first of them was, so merged rows keep the tooltip's line order. */
function mergeAt(stats: Stat[], sources: Stat[], row: Stat): Stat[] {
  const at = Math.min(...sources.map((s) => stats.indexOf(s)).filter((i) => i >= 0));
  const rest = stats.filter((s) => !sources.includes(s));
  const index = Number.isFinite(at) ? stats.slice(0, at).filter((s) => !sources.includes(s)).length : rest.length;
  return [...rest.slice(0, index), row, ...rest.slice(index)];
}

/**
 * One row per stat line: the clipboard can list a stat twice (e.g. a natural roll and the corruption that added
 * to it), which the game draws as one summed line, starred when a corruption added to it. Rows are keyed by
 * stat (getStatKey), so two rows with one key would also break selection and leave stale rows on screen.
 */
function mergeDuplicateStats(stats: Stat[]): Stat[] {
  let out = stats;
  const seen = new Map<string, Stat[]>();
  for (const stat of stats) {
    const key = getStatKey(stat);
    seen.set(key, [...(seen.get(key) ?? []), stat]);
  }
  for (const parts of seen.values()) {
    if (parts.length < 2) continue;
    const values = parts.map((s) => s.value).filter((v): v is number => typeof v === 'number');
    const row: Stat = {
      ...parts[0],
      ...(values.length > 0 && { value: values.reduce((a, b) => a + b, 0) }),
      ...(parts.some((s) => s.corrupted) && { corrupted: true }),
    };
    out = mergeAt(out, parts, row);
  }
  return out;
}

/**
 * Combines enhanced minimum damage (stat_id 18) and enhanced maximum damage (stat_id 17)
 * into a single "Enhanced Damage" stat (stat_id 998)
 */
function combineEnhancedDamageStats(stats: Stat[]): Stat[] {
  const minDamageStat = stats.find((s) => s.stat_id === 18); // item_mindamage_percent
  const maxDamageStat = stats.find((s) => s.stat_id === 17); // item_maxdamage_percent
  const source = maxDamageStat ?? minDamageStat;
  if (!source) return stats;

  // Drop any existing 998 too, to avoid duplicates
  const sources = stats.filter((s) => s.stat_id === 17 || s.stat_id === 18 || s.stat_id === 998);
  const isCorrupted = minDamageStat?.corrupted || maxDamageStat?.corrupted;
  return mergeAt(stats, sources, {
    stat_id: 998,
    name: '% Enhanced Damage',
    value: source.value ?? minDamageStat?.value,
    ...(isCorrupted && { corrupted: true }),
  });
}

/**
 * Combines the four stats into one row (stat_id `combinedId`) when they all have the same value,
 * as the game shows "All Resistances +x%" / "+x to All Attributes".
 */
function combineQuadStats(stats: Stat[], ids: number[], combinedId: number, name: string): Stat[] {
  const parts = ids.map((id) => stats.find((s) => s.stat_id === id));
  const withoutCombined = stats.filter((s) => s.stat_id !== combinedId);
  if (parts.some((s) => !s) || new Set(parts.map((s) => s!.value)).size !== 1) return withoutCombined;

  return mergeAt(withoutCombined, parts as Stat[], {
    stat_id: combinedId,
    name,
    value: parts[0]!.value,
    ...(parts.some((s) => s!.corrupted) && { corrupted: true }),
  });
}

/**
 * Min + max damage stats → one "Adds X-Y <element> damage" row (value = min, maxValue = max), like the game's
 * line. Poison shows the in-game totals (the clipboard stores per-frame damage and a length).
 */
function combineDamagePairs(stats: Stat[], item: Item): Stat[] {
  let out = stats;
  for (const pair of DAMAGE_PAIRS) {
    const v = damagePairValues(out, pair);
    if (!v) continue;
    // Rows keep the min and max apart: the min's range and the max's ("to") range, as the tooltip draws them.
    const line = bhStatRange(item, pair.rangeStat);
    const minRange = pair.id === StatId.Damage ? null : line && { min: line.min, max: line.max };
    const maxRange = pair.id === StatId.Damage ? line && { min: line.min, max: line.max } : (line?.to ?? null);
    out = mergeAt(out, v.sources, {
      stat_id: pair.id,
      name: pair.label,
      value: v.lo,
      maxValue: v.hi,
      ...(minRange && minRange.min < minRange.max && { range: minRange }),
      ...(maxRange && maxRange.min < maxRange.max && { maxRange }),
      ...(v.seconds !== undefined && { seconds: v.seconds }),
      ...(v.sources.some((s) => s.corrupted) && { corrupted: true }),
    });
  }
  return out;
}

/** The price check's stat rows for an item (see the module comment). */
export function buildStatRows(item: Item): Stat[] {
  const baseStats: Stat[] = [];

  // Inject sockets as a pseudo-stat row
  if (item.sockets != null) {
    baseStats.push({
      stat_id: StatId.Socket,
      name: 'Sockets',
      value: item.sockets,
      range: { min: item.sockets, max: item.sockets },
    });
  }

  if (item.isEthereal) {
    baseStats.push({ stat_id: StatId.Ethereal, name: 'Ethereal' });
  }

  // Name remap for stats that come without a stat_id (e.g. "to Strength" -> 0), before combining attributes.
  // A stat with an id keeps it (Enigma's per-level "to Strength" is stat 220, not Strength).
  let combinedStats = (item.stats || []).map((stat: Stat) =>
    stat.stat_id === undefined && stat.name in statRemapByName ? { ...stat, ...statRemapByName[stat.name] } : stat,
  );

  // Inject corrupted stat for corruptable items if it doesn't already exist
  const hasCorruptedStat = combinedStats.some((s) => s.stat_id === StatId.Corrupted);
  if (isItemCorruptable(item) && !hasCorruptedStat) {
    // Marked as injected so the row is styled as a filter rather than a stat
    baseStats.push({ stat_id: StatId.Corrupted, name: 'Corrupted', _injected: true } as Stat);
  }

  combinedStats = mergeDuplicateStats(combinedStats);
  combinedStats = combineEnhancedDamageStats(combinedStats);
  combinedStats = combineQuadStats(combinedStats, [0, 1, 2, 3], StatId.AllAttributes, 'All Attributes');
  combinedStats = combineQuadStats(combinedStats, [39, 41, 43, 45], StatId.AllResistances, 'All Resistances');
  combinedStats = combineDamagePairs(combinedStats, item);

  return [...combinedStats, ...baseStats]
    .sort((a: Stat, b: Stat) => {
      const pa = PRIORITY_STATS.includes(a.stat_id) ? 0 : 1;
      const pb = PRIORITY_STATS.includes(b.stat_id) ? 0 : 1;
      return pa - pb; // priority first, others after
    })
    .map((stat: Stat) => {
      if (stat.stat_id in statRemap) {
        // Keep the row's own fields (e.g. _injected), but the remapped name strips colour codes
        return { ...stat, ...statRemap[stat.stat_id], name: statRemap[stat.stat_id].name };
      }
      if ('skill' in stat && stat.skill) {
        return { ...stat, name: stat.skill }; // use skill name as display name
      }
      return stat;
    })
    .filter((stat) => {
      if (STRIP_STATS.includes(stat.stat_id)) return false;
      if (stat.name && stat.name.toLowerCase().includes('an evil force')) return false;
      return true;
    })
    .map((stat: Stat) => {
      // The range PD2's tooltip shows for this line, replacing any clipboard range, so rows, filters and the
      // copied image agree with the game. Socket counts and damage pairs already carry theirs.
      if (stat.stat_id === StatId.Socket || stat.maxValue !== undefined) return stat;
      const range = statRowRange(item, stat);
      const { range: _clipboardRange, ...rest } = stat;
      return range ? { ...rest, range } : rest;
    });
}
