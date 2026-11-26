/**
 * Where each listed item is in the stash now, from one stash read (shared tabs plus every character's personal
 * stash). Pure: no React.
 */
import type { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { inStash, itemFingerprint } from '@/pages/delist/stash-removal';

export type StashPresence =
  /** Where it was listed from (same hash: it hasn't moved). */
  | { state: 'here'; places: GameStashItem[] }
  /** Moved since it was listed (a new hash): an identical item's place, or the places of several. */
  | { state: 'moved'; places: GameStashItem[] }
  /** Identical listings outnumber identical stash items: some of them left, nobody can tell which. */
  | { state: 'unsure'; places: GameStashItem[]; listed: number }
  /** Nothing like it in the stash. */
  | { state: 'missing' };

/** Not in the stash, or maybe not: the "Not in stash" filter. */
export const isMissing = (presence: StashPresence | undefined): boolean =>
  presence?.state === 'missing' || presence?.state === 'unsure';

/**
 * Each listing's presence by listing id. A stash item with the listing's hash is that item, unmoved. The rest are
 * matched by look (PD2 gives a moved item a new hash): the identical stash items no unmoved listing claimed.
 */
export function stashPresence(
  listings: readonly MarketListingEntry[],
  stashItems: readonly GameStashItem[],
): Map<string, StashPresence> {
  const stashed = stashItems.filter(inStash);
  const byHash = new Map(stashed.map((item) => [item.hash, item]));
  const presence = new Map<string, StashPresence>();
  const claimed = new Set<GameStashItem>();
  const rest = new Map<string, MarketListingEntry[]>();

  for (const listing of listings) {
    const same = byHash.get(listing.item?.hash);
    if (same) {
      claimed.add(same);
      presence.set(listing._id, { state: 'here', places: [same] });
      continue;
    }
    const fingerprint = itemFingerprint(listing.item);
    rest.set(fingerprint, [...(rest.get(fingerprint) ?? []), listing]);
  }
  if (rest.size === 0) return presence;

  const free = new Map<string, GameStashItem[]>();
  for (const item of stashed) {
    if (claimed.has(item)) continue;
    const fingerprint = itemFingerprint(item);
    free.set(fingerprint, [...(free.get(fingerprint) ?? []), item]);
  }
  for (const [fingerprint, group] of rest) {
    const places = free.get(fingerprint) ?? [];
    const found: StashPresence =
      places.length === 0
        ? { state: 'missing' }
        : places.length >= group.length
          ? { state: 'moved', places }
          : { state: 'unsure', places, listed: group.length };
    for (const listing of group) presence.set(listing._id, found);
  }
  return presence;
}
