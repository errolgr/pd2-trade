/**
 * The item-name box's suggestion list: the local autocomplete (instant, substring matches) merged with the
 * server's typo- and nickname-tolerant catalog search once it answers. Every suggestion is an entry of the
 * site's own name list, so picking one sets exactly the filter the local list would.
 */
import type { CatalogItem, CatalogSearchHit } from '@/lib/catalog-search-api';
import { itemNameOption, type ItemNameOption } from './catalog';

export interface ItemNameSuggestion extends ItemNameOption {
  /** Where the typed text sits in the name (a plain substring match): the part to highlight. */
  highlight?: { start: number; end: number };
  /** The nickname that explains a match the name doesn't ("shako" for Harlequin Crest). */
  alias?: string;
  /** Found despite a typo (a fuzzy match). */
  closeMatch?: boolean;
}

export const suggestionKey = (o: ItemNameOption) => `${o.quality}:${o.name}`;

/** The server catalog's text normalization: lowercase, no diacritics or apostrophes, other runs → one space. */
function normalize(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/['’‘`´]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Edit distance with adjacent transpositions (optimal string alignment), as the server's fuzzy match. */
function editDistance(a: string, b: string): number {
  let prev2: number[] = [];
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      let v = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      curr.push(v);
    }
    prev2 = prev;
    prev = curr;
  }
  return prev[b.length];
}

/** Closest a (normalized) term comes to the query: as a whole or by one of its words. */
function termDistance(query: string, term: string): number {
  const compact = query.replace(/ /g, '');
  return Math.min(
    editDistance(compact, term.replace(/ /g, '')),
    ...term.split(' ').map((w) => editDistance(compact, w)),
  );
}

/** The alias a lexical alias hit matched on: exact, then prefix, then word prefixes, then substring; shortest first. */
function matchedAlias(query: string, aliases: string[]): string | undefined {
  const q = normalize(query);
  const qCompact = q.replace(/ /g, '');
  const qWords = q.split(' ');
  let best: { alias: string; tier: number } | undefined;
  for (const alias of aliases) {
    const text = normalize(alias);
    const compact = text.replace(/ /g, '');
    const words = text.split(' ');
    const tier =
      text === q || compact === qCompact
        ? 0
        : compact.startsWith(qCompact)
          ? 1
          : qWords.every((w) => words.some((t) => t.startsWith(w)))
            ? 2
            : qCompact.length >= 3 && compact.includes(qCompact)
              ? 3
              : -1;
    if (tier < 0) continue;
    if (!best || tier < best.tier || (tier === best.tier && alias.length < best.alias.length)) best = { alias, tier };
  }
  return best?.alias;
}

/** For a typo match: the alias the query is closest to, when one is closer than the name itself ("shko" → shako). */
function closestAlias(query: string, item: CatalogItem): string | undefined {
  const q = normalize(query);
  let best = termDistance(q, normalize(item.name));
  let alias: string | undefined;
  for (const a of item.aliases) {
    const d = termDistance(q, normalize(a));
    if (d < best) {
      best = d;
      alias = a;
    }
  }
  return alias;
}

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

/** An option with what explains the match: the typed text's place in the name, else the alias / typo. */
function describe(query: string, option: ItemNameOption, hit?: CatalogSearchHit): ItemNameSuggestion {
  const q = query.trim().toLowerCase();
  const at = q ? option.name.toLowerCase().indexOf(q) : -1;
  if (at >= 0) return { ...option, highlight: { start: at, end: at + q.length } };
  if (hit?.matchedOn === 'alias') {
    const alias = matchedAlias(query, hit.item.aliases);
    return alias ? { ...option, alias } : option;
  }
  if (hit?.matchedOn === 'fuzzy') {
    const alias = closestAlias(query, hit.item);
    return alias ? { ...option, alias, closeMatch: true } : { ...option, closeMatch: true };
  }
  return option;
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
