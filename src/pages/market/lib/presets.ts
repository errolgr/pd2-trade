import { TYPE_CODES } from './catalog';
import { newStatFilter } from './defaults';
import type { MarketFilters, StatPreset } from './types';

/**
 * Starting points for common searches. Bounds filter (pseudo bounds too, on the market service); weights
 * rank (see scoreListing — points per point of stat, so 1 skill ≈ 10 FCR here).
 */
export const BUILT_IN_PRESETS: StatPreset[] = [
  {
    id: 'builtin-caster-amulet',
    name: 'Caster amulet',
    builtIn: true,
    itemName: 'Amulet',
    rarity: ['Rare', 'Crafted'],
    stats: [
      { kind: 'pseudo', key: 'pseudo_all_skills', min: 2, weight: 20, enabled: true },
      { kind: 'mod', key: 'item_fastercastrate', min: 10, weight: 2, enabled: true },
      { kind: 'pseudo', key: 'pseudo_life', weight: 0.5, enabled: true },
      { kind: 'pseudo', key: 'pseudo_total_res', weight: 0.5, enabled: true },
    ],
  },
  {
    id: 'builtin-2-20-circlet',
    name: '2/20 circlet',
    builtIn: true,
    typeCodes: [TYPE_CODES.circlet],
    rarity: ['Magic', 'Rare', 'Crafted'],
    stats: [
      { kind: 'pseudo', key: 'pseudo_all_skills', min: 2, weight: 20, enabled: true },
      { kind: 'mod', key: 'item_fastercastrate', min: 20, weight: 2, enabled: true },
      { kind: 'pseudo', key: 'pseudo_total_attributes', weight: 0.5, enabled: true },
      { kind: 'pseudo', key: 'pseudo_total_res', weight: 0.5, enabled: true },
    ],
  },
  {
    id: 'builtin-tri-res-ring',
    name: 'Tri-res ring',
    builtIn: true,
    itemName: 'Ring',
    rarity: ['Rare', 'Crafted'],
    stats: [
      { kind: 'pseudo', key: 'pseudo_fire_res', min: 10, enabled: true },
      { kind: 'pseudo', key: 'pseudo_cold_res', min: 10, enabled: true },
      { kind: 'pseudo', key: 'pseudo_light_res', min: 10, enabled: true },
      { kind: 'pseudo', key: 'pseudo_total_res', weight: 1, enabled: true },
      { kind: 'mod', key: 'item_fastercastrate', weight: 2, enabled: true },
    ],
  },
  {
    id: 'builtin-life-res-small-charm',
    name: 'Life/res small charm',
    builtIn: true,
    itemName: 'Small Charm',
    rarity: ['Magic'],
    stats: [
      { kind: 'mod', key: 'maxhp', min: 15, weight: 1, enabled: true },
      { kind: 'pseudo', key: 'pseudo_total_res', min: 5, weight: 1, enabled: true },
    ],
  },
  {
    id: 'builtin-skiller-gc',
    name: 'Skiller grand charm',
    builtIn: true,
    itemName: 'Grand Charm',
    rarity: ['Magic'],
    stats: [
      { kind: 'pseudo', key: 'pseudo_skill_tab', min: 1, enabled: true },
      { kind: 'mod', key: 'maxhp', weight: 1, enabled: true },
      { kind: 'pseudo', key: 'pseudo_total_res', weight: 1, enabled: true },
      { kind: 'mod', key: 'item_fastergethitrate', weight: 2, enabled: true },
    ],
  },
  {
    id: 'builtin-caster-jewel',
    name: 'Caster jewel',
    builtIn: true,
    typeCodes: [TYPE_CODES.jewel],
    rarity: ['Magic', 'Rare'],
    stats: [
      { kind: 'pseudo', key: 'pseudo_skill_damage', weight: 2, enabled: true },
      { kind: 'pseudo', key: 'pseudo_enemy_res', weight: 2, enabled: true },
      { kind: 'mod', key: 'item_fastercastrate', weight: 2, enabled: true },
      { kind: 'mod', key: 'item_fastergethitrate', weight: 1, enabled: true },
    ],
  },
  {
    id: 'builtin-ias-ed-jewel',
    name: 'IAS/ED jewel',
    builtIn: true,
    typeCodes: [TYPE_CODES.jewel],
    rarity: ['Magic', 'Rare'],
    stats: [
      { kind: 'mod', key: 'item_fasterattackrate', min: 15, weight: 2, enabled: true },
      { kind: 'mod', key: 'maxdamage_percent', min: 30, weight: 1, enabled: true },
    ],
  },
  {
    id: 'builtin-fhr-boots',
    name: 'FHR boots',
    builtIn: true,
    typeCodes: [TYPE_CODES.boots],
    rarity: ['Rare', 'Crafted'],
    stats: [
      { kind: 'mod', key: 'item_fastergethitrate', min: 10, weight: 3, enabled: true },
      { kind: 'mod', key: 'item_fastermovevelocity', min: 20, weight: 1, enabled: true },
      { kind: 'pseudo', key: 'pseudo_total_res', weight: 1, enabled: true },
    ],
  },
  {
    id: 'builtin-mf-gear',
    name: 'Magic find',
    builtIn: true,
    stats: [
      { kind: 'pseudo', key: 'pseudo_mf', min: 20, weight: 1, enabled: true },
      { kind: 'pseudo', key: 'pseudo_total_res', weight: 0.5, enabled: true },
    ],
  },
];

/**
 * Filters with the preset applied: its stat rows replace the current ones, and its rarity, item name and (single)
 * type replace those filters when it sets them (a new type clears the base). Presets with weights switch the sort
 * to score, best first; everything else is kept.
 */
export function applyPreset(f: MarketFilters, preset: StatPreset): MarketFilters {
  const next: MarketFilters = { ...f, stats: preset.stats.map((row) => newStatFilter(row)) };
  if (preset.rarity) next.rarity = [...preset.rarity];
  if (preset.itemName) next.itemName = preset.itemName;
  if (preset.typeCodes?.length === 1 && preset.typeCodes[0] !== f.typeCode) {
    next.typeCode = preset.typeCodes[0];
    next.baseCode = undefined;
  }
  if (preset.stats.some((s) => s.enabled && s.weight)) next.sort = { by: 'score', dir: 'desc' };
  return next;
}
