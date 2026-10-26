import { DEFAULT_MAX_AGE_DAYS } from './defaults';
import type { MarketFilters, StatFilter, Tri } from './types';

/**
 * The current market search as a projectdiablo2.com Trade (or Archive) link. The site rebuilds its filters from
 * the query string, but only these fields: name, type, base, quality, corrupted, ethereal, sockets_min/max,
 * is_identified, is_ladder, is_hardcore and properties[key][min|max]. Everything else the overlay can filter on
 * is listed in `dropped`, so the button can say what the site search won't include.
 */
export interface SiteSearchLink {
  url: string;
  /** Filters the site link can't carry, as short labels; empty when the link is the exact search. */
  dropped: string[];
}

const triParam = (t: Tri): string | undefined => (t === 'yes' ? 'true' : t === 'no' ? 'false' : undefined);

export function siteSearchLink(f: MarketFilters): SiteSearchLink {
  const params = new URLSearchParams();
  const dropped: string[] = [];
  const set = (key: string, value: string | number | undefined) => {
    if (value !== undefined && value !== '') params.set(key, String(value));
  };
  const property = (key: string, s: Pick<StatFilter, 'min' | 'max'>) => {
    // The site ignores an empty or 0 bound; a row without bounds still requires the stat
    if (s.min) params.append(`properties[${key}][min]`, String(s.min));
    if (s.max) params.append(`properties[${key}][max]`, String(s.max));
    if (!s.min && !s.max) params.append(`properties[${key}][min]`, '');
  };

  set('name', f.itemName);
  set('type', f.typeCode);
  set('base', f.baseCode);
  if (f.rarity.length === 1) set('quality', f.rarity[0]);
  else if (f.rarity.length > 1) dropped.push(`rarity (the site takes one: ${f.rarity.join(', ')})`);
  set('corrupted', triParam(f.corrupted));
  set('ethereal', triParam(f.ethereal));
  set('is_identified', triParam(f.identified));
  set('sockets_min', f.socketsMin);
  set('sockets_max', f.socketsMax);

  const stats = f.stats.filter((s) => s.enabled && s.key.trim() !== '');
  const mods = stats.filter((s) => s.kind === 'mod');
  const required = mods.filter((s) => !s.or);
  // One `or` row on its own is required; the site has no any-of across rows
  const anyOf = mods.filter((s) => s.or);
  (anyOf.length === 1 ? [...required, ...anyOf] : required).forEach((s) => property(s.key, s));
  if (anyOf.length > 1) {
    // The site's `a|b` key matches any of the names with one shared range: exact when the rows share theirs
    const [first] = anyOf;
    const shared = anyOf.every((s) => s.min === first.min && s.max === first.max && !s.key.includes('{'));
    if (shared) property(anyOf.map((s) => s.key).join('|'), first);
    else dropped.push('any-of stat group');
  }
  const pseudo = stats.filter((s) => s.kind === 'pseudo').length;
  if (pseudo) dropped.push(pseudo === 1 ? 'pseudo stat' : `${pseudo} pseudo stats`);
  const corruptions = stats.filter((s) => s.kind === 'corruption').length;
  if (corruptions) dropped.push(corruptions === 1 ? 'corruption stat' : `${corruptions} corruption stats`);

  params.set('is_hardcore', String(f.hardcore));
  params.set('is_ladder', String(f.ladder));

  if (f.desecrated !== 'any') dropped.push('desecrated');
  if (f.priceText) dropped.push('price note');
  if (f.hrMin !== undefined || f.hrMax !== undefined) dropped.push('HR price');
  const r = f.requirements;
  if (r.class) dropped.push('class');
  if (Object.entries(r).some(([k, v]) => k !== 'class' && v !== undefined)) dropped.push('requirements');
  if (f.sellerUserId || f.sellerName) dropped.push('seller');
  if (f.userOnlineSite !== 'all' || f.userOnlineGame !== 'all') dropped.push('online');
  if (f.hasBuyout !== 'any') dropped.push('buyout');
  if (f.maxAgeDays !== DEFAULT_MAX_AGE_DAYS[f.source]) dropped.push('listing age');
  if (f.sort.by !== 'bumped' || f.sort.dir !== 'desc') dropped.push('sort');

  const path = f.source === 'archive' ? 'market/archive' : 'market';
  return { url: `https://www.projectdiablo2.com/${path}?${params.toString()}`, dropped };
}
