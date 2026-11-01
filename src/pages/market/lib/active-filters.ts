import { defaultAgeDays, type SearchDefaults } from './defaults';
import type { CharClass, MarketFilters, OnlineFilter, Rarity, StatFilter, Tri } from './types';

/*
 * The filters a search narrows by, one entry per thing the user could take back: the applied-filter chips list
 * them, and an empty search offers to drop each one. Realm (mode/ladder), source and sort are the search's scope
 * and order, not filters, and never appear.
 */

/** Sidebar sections by their stored id (the English title, see FilterSidebar). */
export type FilterSectionId = 'Stats' | 'Item' | 'Properties' | 'Listing' | 'Price' | 'Seller' | 'Requirements';

export type TriField = 'corrupted' | 'ethereal' | 'desecrated' | 'identified' | 'hasBuyout';
export type RangeField = 'sockets' | 'hr' | 'level' | 'strength' | 'dexterity';

/** What an applied filter is, for its label; `clear` takes it back. */
export type ActiveFilterSpec =
  | { kind: 'itemName'; value: string }
  | { kind: 'type'; code: string }
  | { kind: 'base'; typeCode: string | undefined; code: string }
  | { kind: 'rarity'; value: Rarity[] }
  | { kind: 'class'; value: CharClass }
  | { kind: 'tri'; field: TriField; value: Tri }
  | { kind: 'range'; field: RangeField; min?: number; max?: number }
  | { kind: 'age'; days: number }
  | { kind: 'priceText'; value: string }
  | { kind: 'seller'; name?: string }
  | { kind: 'online'; field: 'site' | 'game'; value: OnlineFilter }
  | { kind: 'stat'; row: StatFilter };

export interface ActiveFilter {
  /** Stable per filter (stat rows by their row id). */
  id: string;
  section: FilterSectionId;
  spec: ActiveFilterSpec;
  /** The filters without this one (back to the user's default where the field always has a value). */
  clear: (f: MarketFilters) => MarketFilters;
}

const TRI_SECTIONS: Record<TriField, FilterSectionId> = {
  corrupted: 'Properties',
  ethereal: 'Properties',
  desecrated: 'Properties',
  identified: 'Properties',
  hasBuyout: 'Price',
};

const REQUIREMENT_RANGES = [
  ['level', 'levelMin', 'levelMax'],
  ['strength', 'strMin', 'strMax'],
  ['dexterity', 'dexMin', 'dexMax'],
] as const;

/** Every filter `f` applies beyond the user's fresh search, in sidebar order. */
export function activeFilters(f: MarketFilters, defaults: SearchDefaults): ActiveFilter[] {
  const out: ActiveFilter[] = [];
  const add = (id: string, section: FilterSectionId, spec: ActiveFilterSpec, clear: ActiveFilter['clear']) =>
    out.push({ id, section, spec, clear });

  if (f.itemName)
    add('itemName', 'Item', { kind: 'itemName', value: f.itemName }, (g) => ({ ...g, itemName: undefined }));

  for (const row of f.stats) {
    if (!row.enabled || !row.key.trim()) continue;
    add(`stat:${row.id}`, 'Stats', { kind: 'stat', row }, (g) => ({
      ...g,
      stats: g.stats.filter((s) => s.id !== row.id),
    }));
  }

  // The base belongs to its type: dropping the type drops the base too
  if (f.typeCode)
    add('type', 'Item', { kind: 'type', code: f.typeCode }, (g) => ({
      ...g,
      typeCode: undefined,
      baseCode: undefined,
    }));
  if (f.baseCode)
    add('base', 'Item', { kind: 'base', typeCode: f.typeCode, code: f.baseCode }, (g) => ({
      ...g,
      baseCode: undefined,
    }));
  if (f.rarity.length) add('rarity', 'Item', { kind: 'rarity', value: f.rarity }, (g) => ({ ...g, rarity: [] }));
  const charClass = f.requirements.class;
  if (charClass)
    add('class', 'Item', { kind: 'class', value: charClass }, (g) => ({
      ...g,
      requirements: { ...g.requirements, class: undefined },
    }));

  const tri = (field: TriField, fallback: Tri) => {
    if (f[field] === fallback) return;
    add(field, TRI_SECTIONS[field], { kind: 'tri', field, value: f[field] }, (g) => ({ ...g, [field]: fallback }));
  };
  tri('corrupted', 'any');
  if (f.socketsMin !== undefined || f.socketsMax !== undefined)
    add('sockets', 'Properties', { kind: 'range', field: 'sockets', min: f.socketsMin, max: f.socketsMax }, (g) => ({
      ...g,
      socketsMin: undefined,
      socketsMax: undefined,
    }));
  tri('ethereal', 'any');
  tri('desecrated', 'any');
  tri('identified', 'any');

  const age = defaultAgeDays(f.source, defaults);
  if (f.maxAgeDays !== age)
    add('age', 'Listing', { kind: 'age', days: f.maxAgeDays }, (g) => ({
      ...g,
      maxAgeDays: defaultAgeDays(g.source, defaults),
    }));

  if (f.priceText)
    add('priceText', 'Price', { kind: 'priceText', value: f.priceText }, (g) => ({ ...g, priceText: undefined }));
  if (f.hrMin !== undefined || f.hrMax !== undefined)
    add('hr', 'Price', { kind: 'range', field: 'hr', min: f.hrMin, max: f.hrMax }, (g) => ({
      ...g,
      hrMin: undefined,
      hrMax: undefined,
    }));
  tri('hasBuyout', defaults.hasBuyout);

  if (f.sellerUserId || f.sellerName)
    add('seller', 'Seller', { kind: 'seller', name: f.sellerName }, (g) => ({
      ...g,
      sellerUserId: undefined,
      sellerName: undefined,
    }));
  if (f.userOnlineSite !== defaults.userOnlineSite)
    add('onlineSite', 'Seller', { kind: 'online', field: 'site', value: f.userOnlineSite }, (g) => ({
      ...g,
      userOnlineSite: defaults.userOnlineSite,
    }));
  if (f.userOnlineGame !== defaults.userOnlineGame)
    add('onlineGame', 'Seller', { kind: 'online', field: 'game', value: f.userOnlineGame }, (g) => ({
      ...g,
      userOnlineGame: defaults.userOnlineGame,
    }));

  for (const [field, minKey, maxKey] of REQUIREMENT_RANGES) {
    const min = f.requirements[minKey];
    const max = f.requirements[maxKey];
    if (min === undefined && max === undefined) continue;
    add(field, 'Requirements', { kind: 'range', field, min, max }, (g) => ({
      ...g,
      requirements: { ...g.requirements, [minKey]: undefined, [maxKey]: undefined },
    }));
  }
  return out;
}
