import { useEffect, useRef, useSyncExternalStore } from 'react';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import type { MarketListingQuery } from '@/common/types/pd2-website/GetMarketListingsCommand';
import type { MarketListingEntry, MarketListingResult } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { t } from '@/i18n';
import { ONLINE_THRESHOLD_MS } from '@/lib/user-online-status';

/**
 * Where a trader was last seen, from the `user_last_ingame` / `user_last_online` the market stamps on each of
 * their listings (the website has no profile endpoint): in game within the last few minutes, online within
 * the last hour, seen earlier, or unknown (no listings, no timestamps).
 */
export type TraderPresence =
  | { kind: 'ingame'; at: number }
  | { kind: 'online'; at: number }
  | { kind: 'seen'; at: number }
  | { kind: 'unknown' };

export interface TraderProfile {
  /** idle: no website user (or signed out). error: the lookup failed; shown as an empty market. */
  status: 'idle' | 'loading' | 'ready' | 'error';
  /** Their active listings, newest bumped first (at most TRADER_LISTING_LIMIT). */
  listings: MarketListingEntry[];
  /** All their active listings, also those past the limit. */
  total: number;
  presence: TraderPresence;
}

/** Listings fetched per trader: enough for the sidebar grid and a presence reading. */
export const TRADER_LISTING_LIMIT = 24;
/** Past this the "Online … ago" line becomes "Last seen … ago". */
const RECENTLY_ONLINE_MS = 60 * 60_000;
/** Listings and presence go stale while a chat sits open; refetch after this long. */
const CACHE_TTL_MS = 5 * 60_000;

type Entry =
  | { status: 'loading' }
  | { status: 'ready'; listings: MarketListingEntry[]; total: number; at: number }
  | { status: 'error' };

/** App-lifetime cache per website user id, shared by every thread (and the conversation list's dots). */
const cache = new Map<string, Entry>();
const listeners = new Set<() => void>();
/** Bumped on every cache change: the useSyncExternalStore snapshot. */
let version = 0;

function publish(userId: string, entry: Entry) {
  cache.set(userId, entry);
  version += 1;
  listeners.forEach((listener) => listener());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const getVersion = () => version;

const timestamp = (iso: string | undefined) => {
  const at = iso ? Date.parse(iso) : NaN;
  return Number.isFinite(at) && at > 0 ? at : 0;
};

/** The newest in-game / online stamp across a trader's listings, read as a presence at `now`. */
export function traderPresence(listings: readonly MarketListingEntry[], now: number): TraderPresence {
  let ingame = 0;
  let online = 0;
  for (const listing of listings) {
    ingame = Math.max(ingame, timestamp(listing.user_last_ingame));
    online = Math.max(online, timestamp(listing.user_last_online));
  }
  if (ingame > 0 && now - ingame < ONLINE_THRESHOLD_MS) return { kind: 'ingame', at: ingame };
  const latest = Math.max(ingame, online);
  if (latest === 0) return { kind: 'unknown' };
  return now - latest < RECENTLY_ONLINE_MS ? { kind: 'online', at: latest } : { kind: 'seen', at: latest };
}

/** "just now", "12m", "3h", "3d", "2mo", "1y": how long ago `at` was. */
export function shortAgo(at: number, now: number): string {
  const minutes = Math.floor((now - at) / 60_000);
  if (minutes < 1) return t('common:time.justNow');
  if (minutes < 60) return t('common:time.minutesAgoShort', { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('common:time.hoursAgoShort', { count: hours });
  const days = Math.floor(hours / 24);
  if (days < 30) return t('common:time.daysAgoShort', { count: days });
  const months = Math.floor(days / 30);
  return months < 12
    ? t('common:time.monthsAgoShort', { count: months })
    : t('common:time.yearsAgoShort', { count: Math.floor(days / 365) });
}

/** 'In game now' / 'Online 12m ago' / 'Last seen 3d ago' / 'Unknown'. */
export function presenceLabel(presence: TraderPresence, now: number): string {
  switch (presence.kind) {
    case 'ingame':
      return t('chat:presence.inGame');
    case 'online':
      return t('chat:presence.online', { ago: shortAgo(presence.at, now) });
    case 'seen':
      return t('chat:presence.lastSeen', { ago: shortAgo(presence.at, now) });
    default:
      return t('chat:presence.unknown');
  }
}

async function load(userId: string, getListings: (query: MarketListingQuery) => Promise<MarketListingResult | null>) {
  const previous = cache.get(userId);
  // A stale profile stays on screen while it refreshes
  if (previous?.status !== 'ready') publish(userId, { status: 'loading' });
  try {
    // Their active listings, newest bumped first, with their in-game account resolved
    const result = await getListings({
      user_id: userId,
      type: 'item',
      accepted_offer_id: null,
      $resolve: { user: { in_game_account: true } },
      $sort: { bumped_at: -1 },
      $limit: TRADER_LISTING_LIMIT,
      $skip: 0,
    } as Partial<MarketListingQuery> as MarketListingQuery);
    if (!result) throw new Error('market listing lookup was not authorized');
    publish(userId, {
      status: 'ready',
      listings: result.data,
      total: result.total ?? result.data.length,
      at: Date.now(),
    });
  } catch (error) {
    console.error('[Chat] Failed to load the trader profile:', error);
    publish(userId, { status: 'error' });
  }
}

const IDLE: TraderProfile = { status: 'idle', listings: [], total: 0, presence: { kind: 'unknown' } };

function profileOf(entry: Entry | undefined, now: number): TraderProfile {
  // Not requested yet: the effect is about to
  if (!entry) return { ...IDLE, status: 'loading' };
  if (entry.status === 'ready') {
    return {
      status: 'ready',
      listings: entry.listings,
      total: entry.total,
      presence: traderPresence(entry.listings, now),
    };
  }
  return { ...IDLE, status: entry.status };
}

/**
 * The open thread's trader: their active market listings and presence. Fetched once per user and cached for
 * the app's lifetime (refetched after CACHE_TTL_MS, showing the cached profile meanwhile; a failed lookup is
 * retried the next time the thread is opened). Nothing is fetched without a user id or while signed out.
 * `now` (epoch ms) is what the presence is read against.
 */
export function useTraderProfile(userId: string | undefined, now: number): TraderProfile {
  const { authData, getMarketListings } = usePd2Website();
  // The fetcher changes identity with every settings update; the lookup only needs the latest one.
  const fetcher = useRef(getMarketListings);
  useEffect(() => {
    fetcher.current = getMarketListings;
  }, [getMarketListings]);
  const signedIn = !!authData;
  useSyncExternalStore(subscribe, getVersion);

  useEffect(() => {
    if (!userId || !signedIn) return;
    const entry = cache.get(userId);
    if (entry?.status === 'loading') return;
    if (entry?.status === 'ready' && Date.now() - entry.at < CACHE_TTL_MS) return;
    void load(userId, fetcher.current);
  }, [userId, signedIn]);

  return userId && signedIn ? profileOf(cache.get(userId), now) : IDLE;
}

/**
 * Presence of traders whose profile was already loaded (by opening their thread), for the conversation list;
 * undefined for the rest, read against `now` (epoch ms). Re-renders when a profile loads.
 */
export function useKnownPresence(now: number): (userId: string | undefined) => TraderPresence | undefined {
  useSyncExternalStore(subscribe, getVersion);
  return (userId) => {
    const entry = userId ? cache.get(userId) : undefined;
    return entry?.status === 'ready' ? traderPresence(entry.listings, now) : undefined;
  };
}
