/**
 * The item-name box's suggestion list: the local autocomplete (instant, substring matches) merged with the
 * server's typo- and nickname-tolerant catalog search once it answers. Every suggestion is an entry of the
 * site's own name list, so picking one sets exactly the filter the local list would.
 */
import type { CatalogItem, CatalogSearchHit } from '@/lib/catalog-search-api';
import { type BaseGroup, itemNameOption, type ItemNameOption } from './catalog';

export interface ItemNameSuggestion extends ItemNameOption {
  /** Where the typed text sits in the name (a plain substring match): the part to highlight. */
  highlight?: { start: number; end: number };
  /** Found despite a typo (a fuzzy match). */
  closeMatch?: boolean;
  /** Found by one of its nicknames (the server's aliases, e.g. "shako" for Harlequin Crest). */
  alias?: boolean;
  /** Not a name: a family of bases ("Any Pandemonium Key") picked as the Type and Base filters. */
  group?: BaseGroup;
}

export const suggestionKey = (o: ItemNameOption) => `${o.quality}:${o.name}`;

/** Catalog variants the site lists under one name ("Hellfire Torch (Amazon)" → Hellfire Torch). */
const VARIANT_SUFFIX = /\s*\([^)]*\)$/;

/**
 * The site's name-list entry for a catalog hit (its name, or its name without a variant suffix). A unique or set
 * the bundled list predates is kept under its own name (that is its `item.name`); anything else outside the
 * list (quest items, the catalog's display-only names) has no name filter to set and is dropped.
 */
export function hitOption(item: CatalogItem): ItemNameOption | null {
  const known = itemNameOption(item.name) ?? itemNameOption(item.name.replace(VARIANT_SUFFIX, ''));
  if (known) return known;
  if ((item.quality === 'Unique' || item.quality === 'Set') && !VARIANT_SUFFIX.test(item.name))
    return { name: item.name, quality: item.quality };
  return null;
}

/** An option with what explains the match: the typed text's place in the name, else a nickname or typo match. */
function describe(query: string, option: ItemNameOption, hit?: CatalogSearchHit): ItemNameSuggestion {
  const q = query.trim().toLowerCase();
  const at = q ? option.name.toLowerCase().indexOf(q) : -1;
  if (at >= 0) return { ...option, highlight: { start: at, end: at + q.length } };
  if (hit?.matchedOn === 'alias') return { ...option, alias: true };
  return hit?.matchedOn === 'fuzzy' ? { ...option, closeMatch: true } : option;
}

/** Typo matches this far (a tenth of the fuzzy similarity range) below the closest one are look-alikes, not shown. */
const FUZZY_MARGIN = 30;

/**
 * The suggestions for `query`: the local list until the server's `hits` are in, then the server's name and
 * nickname matches in its ranking followed by the local ones it didn't return. Typo (fuzzy) matches only show
 * when nothing matches as typed, and only the closest of them, so a search isn't padded with look-alikes.
 */
export function itemNameSuggestions(
  query: string,
  local: ItemNameOption[],
  hits: CatalogSearchHit[] | null,
  limit: number,
): ItemNameSuggestion[] {
  if (!hits) return local.map((o) => describe(query, o));
  const seen = new Set<string>();
  const out: ItemNameSuggestion[] = [];
  const add = (option: ItemNameOption | null, hit?: CatalogSearchHit) => {
    if (!option || seen.has(suggestionKey(option))) return;
    seen.add(suggestionKey(option));
    out.push(describe(query, option, hit));
  };
  for (const hit of hits) if (hit.matchedOn !== 'fuzzy') add(hitOption(hit.item), hit);
  for (const option of local) add(option);
  if (out.length === 0) {
    const fuzzy = hits.flatMap((hit) => {
      const option = hit.matchedOn === 'fuzzy' ? hitOption(hit.item) : null;
      return option ? [{ hit, option }] : [];
    });
    const best = Math.max(...fuzzy.map((f) => f.hit.score));
    for (const { hit, option } of fuzzy) if (hit.score >= best - FUZZY_MARGIN) add(option, hit);
  }
  return out.slice(0, limit);
}
