import { useEffect, useMemo, useRef, useState } from 'react';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { useOptions } from '@/hooks/useOptions';
import type { WhisperTrade } from '@/lib/whisper-history';
import { isNetworkError } from '@/lib/network-errors';
import { matchTradeListings, TRADE_LISTINGS_LIMIT } from '@/pages/delist/trade-match';
import { buildGetAllUserMarketListingsQuery } from '@/pages/price-check/lib/tradeUrlBuilder';

/**
 * Trade id → the one listing of yours it was matched to. Kept for the app's lifetime: the listing leaves your
 * active listings once sold, and the whisper must stay linked to it.
 */
const matched = new Map<string, string>();
/** Trades looked up already, matched or not: each costs one lookup of your listings. */
const tried = new Set<string>();

/**
 * The listings of yours that in-game trade whispers to you are about ("Hi, I'm interested in your Silkweave
 * listed for 10 wss" names no listing): your active listings in the current realm, matched by whispered name and
 * price as the delist does. Only a trade matching exactly one listing gets one. Keyed by trade id.
 */
export function useTradeListings(trades: readonly WhisperTrade[]): ReadonlyMap<string, string> {
  const { authData, getMarketListings } = usePd2Website();
  const { settings } = useOptions();
  const userId = authData?.user?._id;
  const hardcore = settings?.mode === 'hardcore';
  const ladder = settings?.ladder === 'ladder';
  // The fetcher changes identity with every settings update; the lookup only needs the latest one.
  const fetchListings = useRef(getMarketListings);
  useEffect(() => {
    fetchListings.current = getMarketListings;
  }, [getMarketListings]);
  // Bumped when a lookup settles, so the matches below are read again.
  const [settledCount, setSettledCount] = useState(0);

  const incoming = trades.filter((trade) => trade.isIncoming);
  // The trades as of this render, for the lookup below (an effect: it runs before that one)
  const latest = useRef(incoming);
  useEffect(() => {
    latest.current = incoming;
  });
  const pendingKey = incoming
    .filter((trade) => !tried.has(trade.id))
    .map((trade) => trade.id)
    .join(',');
  const tradesKey = incoming.map((trade) => trade.id).join(',');

  useEffect(() => {
    if (!userId || !pendingKey) return;
    let cancelled = false;
    const pending = latest.current.filter((trade) => !tried.has(trade.id));
    fetchListings.current(buildGetAllUserMarketListingsQuery(userId, hardcore, ladder, TRADE_LISTINGS_LIMIT, 0)).then(
      (result) => {
        // Not authorized: left untried, for the next lookup
        if (!result) return;
        for (const trade of pending) {
          tried.add(trade.id);
          const listings = matchTradeListings(result.data, trade);
          if (listings.length === 1) matched.set(trade.id, listings[0]._id);
        }
        if (!cancelled) setSettledCount((n) => n + 1);
      },
      (error) => {
        // Offline / PD2 unreachable: the whispers stay plain text; nothing to report
        if (isNetworkError(error)) console.warn('[Chat] Failed to load your listings for trade whispers:', error);
        else console.error('[Chat] Failed to load your listings for trade whispers:', error);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [userId, pendingKey, hardcore, ladder]);

  return useMemo(() => {
    const links = new Map<string, string>();
    for (const id of tradesKey ? tradesKey.split(',') : []) {
      const listingId = matched.get(id);
      if (listingId) links.set(id, listingId);
    }
    return links;
    // settledCount: the matches are module state; a settled lookup must recompute.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tradesKey, settledCount]);
}
