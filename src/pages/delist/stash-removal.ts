import type { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import type { ItemDetail, MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';

type FingerprintFields = Pick<
  ItemDetail,
  'base_code' | 'quality' | 'item_level' | 'socket_count' | 'is_ethereal' | 'corrupted' | 'modifiers'
> & { base?: { id?: unknown } | null };

/**
 * What an item looks like, without where it is: base, quality, item level, sockets, ethereal, corrupted and its
 * mods (name + values, order-free). PD2's `hash` is no identity: the same item gets a new one when it moves
 * (pd2-trader-server's rare listings show the same 6+ mod rare relisted under different hashes). `quantity` is
 * left out, so a stack that grows or shrinks is still the same item.
 */
export function itemFingerprint(item: FingerprintFields): string {
  const mods = (Array.isArray(item.modifiers) ? item.modifiers : [])
    .filter((mod) => mod?.name !== 'quantity')
    .map((mod) => JSON.stringify([mod?.name ?? null, mod?.values ?? null]))
    .sort();
  return JSON.stringify([
    item.base_code ?? item.base?.id ?? null,
    item.quality?.name ?? null,
    item.item_level ?? null,
    item.socket_count ?? 0,
    item.is_ethereal === true,
    item.corrupted === true,
    mods,
  ]);
}

/** The stash's items (personal and shared tabs; not inventory, cube or equipped) by fingerprint: their hashes. */
export type StashSnapshot = Map<string, Set<string>>;

const STASH_STORAGE = /stash/i;

export function snapshotStash(items: GameStashItem[]): StashSnapshot {
  const snapshot: StashSnapshot = new Map();
  for (const item of items) {
    if (!STASH_STORAGE.test(item.location?.storage ?? '')) continue;
    const fingerprint = itemFingerprint(item);
    let hashes = snapshot.get(fingerprint);
    if (!hashes) snapshot.set(fingerprint, (hashes = new Set()));
    hashes.add(item.hash);
  }
  return snapshot;
}

export function stashSize(snapshot: StashSnapshot): number {
  let size = 0;
  for (const hashes of snapshot.values()) size += hashes.size;
  return size;
}

/** Fingerprints with fewer items now than before: something that looks like them left the stash. */
export function droppedFingerprints(prev: StashSnapshot, cur: StashSnapshot): string[] {
  const dropped: string[] = [];
  for (const [fingerprint, hashes] of prev) {
    if (hashes.size > (cur.get(fingerprint)?.size ?? 0)) dropped.push(fingerprint);
  }
  return dropped;
}

export interface StashRemovals {
  /** Listings whose item has left the stash for sure. */
  removed: MarketListingEntry[];
  /** Look-alike items left the stash: `count` of `listings` may have gone, which ones is unknown. */
  ambiguous: { listings: MarketListingEntry[]; count: number }[];
}

/**
 * Listings whose item left the stash between two snapshots. A move between tabs keeps the count of look-alike
 * items (its hash changes), so only a fingerprint with fewer items now counts. In such a group a listing is
 * removed for sure when its own hash vanished and no new hash showed up (nothing moved), or when no look-alike
 * is left and every listing at risk is accounted for; otherwise the user has to pick.
 */
export function detectStashRemovals(
  prev: StashSnapshot,
  cur: StashSnapshot,
  listings: MarketListingEntry[],
): StashRemovals {
  const result: StashRemovals = { removed: [], ambiguous: [] };
  const dropped = droppedFingerprints(prev, cur);
  if (dropped.length === 0) return result;

  const byFingerprint = new Map<string, MarketListingEntry[]>();
  for (const listing of listings) {
    if (!listing.item) continue;
    const fingerprint = itemFingerprint(listing.item);
    byFingerprint.set(fingerprint, [...(byFingerprint.get(fingerprint) ?? []), listing]);
  }

  for (const fingerprint of dropped) {
    const group = byFingerprint.get(fingerprint);
    if (!group) continue;
    const before = prev.get(fingerprint)!;
    const now = cur.get(fingerprint) ?? new Set<string>();
    const atRisk = group.filter((listing) => !now.has(listing.item.hash));
    if (atRisk.length === 0) continue;

    const left = before.size - now.size;
    const appeared = [...now].some((hash) => !before.has(hash));
    const certain = appeared ? [] : atRisk.filter((listing) => before.has(listing.item.hash));
    const rest = atRisk.filter((listing) => !certain.includes(listing));
    const unexplained = left - new Set(certain.map((listing) => listing.item.hash)).size;

    result.removed.push(...certain);
    if (unexplained <= 0 || rest.length === 0) continue;
    if (now.size === 0 && rest.length <= unexplained) result.removed.push(...rest);
    else result.ambiguous.push({ listings: rest, count: Math.min(unexplained, rest.length) });
  }
  return result;
}
