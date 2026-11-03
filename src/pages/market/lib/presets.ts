import { newStatFilter } from './defaults';
import { upgradeRowGroup } from './stat-groups';
import type { MarketFilters, StatPreset } from './types';

/**
 * Starting points for the most traded kinds of search (every row is a bound, pseudo bounds too, on the market
 * service). Users can delete them; "Restore default presets" brings them back.
 */
export const BUILT_IN_PRESETS: StatPreset[] = [
  {
    id: 'builtin-caster-amulet',
    name: 'Caster amulet',
    builtIn: true,
    itemName: 'Amulet',
    rarity: ['Rare', 'Crafted'],
    stats: [
      { kind: 'pseudo', key: 'pseudo_all_skills', min: 2, enabled: true },
      { kind: 'mod', key: 'item_fastercastrate', min: 10, enabled: true },
    ],
  },
  {
    id: 'builtin-skiller-gc',
    name: 'Skiller grand charm',
    builtIn: true,
    itemName: 'Grand Charm',
    rarity: ['Magic'],
    stats: [{ kind: 'pseudo', key: 'pseudo_skill_tab', min: 1, enabled: true }],
  },
  {
    id: 'builtin-mf-gear',
    name: 'Magic find',
    builtIn: true,
    stats: [{ kind: 'pseudo', key: 'pseudo_mf', min: 20, enabled: true }],
  },
];

/**
 * Filters with the preset applied: its stat rows replace the current ones, and its rarity, item name and (single)
 * type replace those filters when it sets them (a new type clears the base); everything else is kept. Weights
 * of user presets saved before weights were removed are dropped; an old `or: true` row joins any-of block 1.
 */
export function applyPreset(f: MarketFilters, preset: StatPreset): MarketFilters {
  const next: MarketFilters = {
    ...f,
    stats: preset.stats.map(({ weight: _weight, ...row }) => newStatFilter(upgradeRowGroup(row))),
  };
  if (preset.rarity) next.rarity = [...preset.rarity];
  if (preset.itemName) next.itemName = preset.itemName;
  if (preset.typeCodes?.length === 1 && preset.typeCodes[0] !== f.typeCode) {
    next.typeCode = preset.typeCodes[0];
    next.baseCode = undefined;
  }
  return next;
}
