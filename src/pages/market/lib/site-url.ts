import { DEFAULT_MAX_AGE_DAYS } from './defaults';
import { orBlockNumbers } from './stat-groups';
import type { MarketFilters, StatFilter, Tri } from './types';
import { t } from '@/i18n';

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
  else if (f.rarity.length > 1) dropped.push(t('market:siteUrl.rarity', { rarities: f.rarity.join(', ') }));
  set('corrupted', triParam(f.corrupted));
  set('ethereal', triParam(f.ethereal));
  set('is_identified', triParam(f.identified));
  set('sockets_min', f.socketsMin);
  set('sockets_max', f.socketsMax);

  const stats = f.stats.filter((s) => s.enabled && s.key.trim() !== '');
  const excluded = stats.filter((s) => s.not);
  const mods = stats.filter((s) => s.kind === 'mod' && !s.not);
  mods.filter((s) => s.or === undefined).forEach((s) => property(s.key, s));
  // The site has no any-of across rows: a block of one row is required; a larger block becomes the site's
  // `a|b` key, which matches any of the names with one shared range (exact only when the rows share theirs)
  for (const block of orBlockNumbers(mods)) {
    const rows = mods.filter((s) => s.or === block);
    const [first] = rows;
    if (rows.length === 1) property(first.key, first);
    else if (rows.every((s) => s.min === first.min && s.max === first.max && !s.key.includes('{')))
      property(rows.map((s) => s.key).join('|'), first);
    else dropped.push(t('market:siteUrl.anyOfGroup'));
  }
  if (excluded.length)
    dropped.push(
      excluded.length === 1
        ? t('market:siteUrl.excludedStat')
        : t('market:siteUrl.excludedStats', { count: excluded.length }),
    );
  const pseudo = stats.filter((s) => s.kind === 'pseudo' && !s.not).length;
  if (pseudo)
    dropped.push(pseudo === 1 ? t('market:siteUrl.pseudoStat') : t('market:siteUrl.pseudoStats', { count: pseudo }));
  const corruptions = stats.filter((s) => s.kind === 'corruption' && !s.not).length;
  if (corruptions)
    dropped.push(
      corruptions === 1
        ? t('market:siteUrl.corruptionStat')
        : t('market:siteUrl.corruptionStats', { count: corruptions }),
    );

  params.set('is_hardcore', String(f.hardcore));
  params.set('is_ladder', String(f.ladder));

  if (f.desecrated !== 'any') dropped.push(t('market:siteUrl.desecrated'));
  if (f.priceText) dropped.push(t('market:siteUrl.priceNote'));
  if (f.hrMin !== undefined || f.hrMax !== undefined) dropped.push(t('market:siteUrl.hrPrice'));
  const r = f.requirements;
  if (r.class) dropped.push(t('market:siteUrl.class'));
  if (Object.entries(r).some(([k, v]) => k !== 'class' && v !== undefined))
    dropped.push(t('market:siteUrl.requirements'));
  if (f.sellerUserId || f.sellerName) dropped.push(t('market:siteUrl.seller'));
  if (f.userOnlineSite !== 'all' || f.userOnlineGame !== 'all') dropped.push(t('market:siteUrl.online'));
  if (f.hasBuyout !== 'any') dropped.push(t('market:siteUrl.buyout'));
  if (f.maxAgeDays !== DEFAULT_MAX_AGE_DAYS[f.source]) dropped.push(t('market:siteUrl.listingAge'));
  if (f.sort.by !== 'bumped' || f.sort.dir !== 'desc') dropped.push(t('market:siteUrl.sort'));

  const path = f.source === 'archive' ? 'market/archive' : 'market';
  return { url: `https://www.projectdiablo2.com/${path}?${params.toString()}`, dropped };
}
