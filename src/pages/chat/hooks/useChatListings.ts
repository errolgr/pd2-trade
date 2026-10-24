import { useEffect, useMemo, useRef, useState } from 'react';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import type { MarketListingQuery } from '@/common/types/pd2-website/GetMarketListingsCommand';
import type { MarketListingEntry, MarketListingResult } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { isNetworkError } from '@/lib/network-errors';

/**
 * `listed`: still on the market. `unlisted`: moved to the listing archive (sold or removed by the seller).
 * `missing`: in neither (bad id). Ids whose lookup failed (network, auth) have no entry at all.
 */
export type ChatListingState =
  | { status: 'loading' }
  | { status: 'listed' | 'unlisted'; listing: MarketListingEntry }
  | { status: 'missing' };

type ResolvedState = Exclude<ChatListingState, { status: 'loading' }>;
type FetchListings = (query: MarketListingQuery) => Promise<MarketListingResult | null>;

/** Listings change state (sold, re-priced) while a chat sits open; refetch after this long. */
const CACHE_TTL_MS = 5 * 60_000;
/** Ids per `_id[$in]` request, well under the API's page limit. */
const BATCH_SIZE = 25;

/** App-lifetime cache shared by every conversation, so switching chats doesn't refetch. */
const cache = new Map<string, { state: ResolvedState; at: number }>();

const byIds = (ids: string[]) =>
  ({
    _id: { $in: ids },
    $resolve: { user: { in_game_account: true } },
    $limit: ids.length,
  }) as Partial<MarketListingQuery> as MarketListingQuery;

/** One batch: live listings first, the archive for the rest. Throws when either request fails. */
async function resolveBatch(
  ids: string[],
  getListings: FetchListings,
  getArchive: FetchListings,
): Promise<Map<string, ResolvedState>> {
  const resolved = new Map<string, ResolvedState>();
  const live = await getListings(byIds(ids));
  if (!live) throw new Error('market listing lookup was not authorized');
  for (const listing of live.data) resolved.set(listing._id, { status: 'listed', listing });

  const rest = ids.filter((id) => !resolved.has(id));
  if (rest.length === 0) return resolved;
  const archived = await getArchive(byIds(rest));
  if (!archived) throw new Error('archived listing lookup was not authorized');
  for (const listing of archived.data) {
    if (!resolved.has(listing._id)) resolved.set(listing._id, { status: 'unlisted', listing });
  }
  for (const id of rest) if (!resolved.has(id)) resolved.set(id, { status: 'missing' });
  return resolved;
}

/**
 * Looks up the market listings linked in a conversation (live, else archived) so chat can show item cards.
 * Only fetches while signed in. Listings are cached per id and refetched after CACHE_TTL_MS, showing the
 * cached state meanwhile; ids whose lookup failed are left out until the next conversation open retries them.
 */
export function useChatListings(listingIds: readonly string[]): ReadonlyMap<string, ChatListingState> {
  const { authData, getMarketListings, getMarketListingsArchive } = usePd2Website();
  // The fetchers change identity with every settings update; the lookup only needs the latest ones.
  const fetchers = useRef({ getMarketListings, getMarketListingsArchive });
  useEffect(() => {
    fetchers.current = { getMarketListings, getMarketListingsArchive };
  }, [getMarketListings, getMarketListingsArchive]);
  // Bumped when a lookup settles, so the states below re-read the cache.
  const [settledCount, setSettledCount] = useState(0);
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set());

  const signedIn = !!authData;
  const idsKey = [...new Set(listingIds)].sort().join(',');

  useEffect(() => {
    if (!signedIn || !idsKey) return;
    const now = Date.now();
    const stale = idsKey.split(',').filter((id) => {
      const hit = cache.get(id);
      return !hit || now - hit.at >= CACHE_TTL_MS;
    });
    if (stale.length === 0) return;

    let cancelled = false;
    const { getMarketListings: getListings, getMarketListingsArchive: getArchive } = fetchers.current;
    const batches: string[][] = [];
    for (let i = 0; i < stale.length; i += BATCH_SIZE) batches.push(stale.slice(i, i + BATCH_SIZE));

    void Promise.allSettled(batches.map((batch) => resolveBatch(batch, getListings, getArchive))).then((results) => {
      const at = Date.now();
      for (const result of results) {
        if (result.status === 'rejected') {
          // Offline / PD2 unreachable: the cards show as failed; nothing to report
          if (isNetworkError(result.reason))
            console.warn('[Chat] Failed to load linked market listings:', result.reason);
          else console.error('[Chat] Failed to load linked market listings:', result.reason);
          continue;
        }
        for (const [id, state] of result.value) cache.set(id, { state, at });
      }
      if (cancelled) return;
      setFailed((prev) => {
        const next = new Set([...prev].filter((id) => !stale.includes(id)));
        for (const id of stale) if (cache.get(id)?.at !== at) next.add(id);
        return next;
      });
      setSettledCount((n) => n + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [idsKey, signedIn]);

  return useMemo(() => {
    const states = new Map<string, ChatListingState>();
    if (!signedIn || !idsKey) return states;
    for (const id of idsKey.split(',')) {
      const hit = cache.get(id);
      if (hit) states.set(id, hit.state);
      else if (!failed.has(id)) states.set(id, { status: 'loading' });
    }
    return states;
    // settledCount: the cache is module state; a settled lookup must recompute.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, signedIn, failed, settledCount]);
}
