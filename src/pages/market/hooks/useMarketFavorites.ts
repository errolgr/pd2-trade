import { useCallback, useEffect, useState } from 'react';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { lookupListing } from '../alerts/listing-lookup';
import { getMarketPrefs, loadMarketPrefs, marketStoreActions, useMarketStore } from '../store/useMarketStore';
import type { MarketApi, SavedFavorite } from '../lib/types';
import { t } from '@/i18n';

/** Listings asked of PD2 per `_id[$in]` read. */
const REFRESH_CHUNK = 50;

export type FavoritesStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface MarketFavorites {
  /** Newest first, as kept in market-prefs.json. */
  favorites: SavedFavorite[];
  /** The last refresh's state; 'idle' without an api. */
  status: FavoritesStatus;
  error: string | null;
  /** Refreshes again (the tab's Refresh). */
  reload: () => void;
  /** Favorites or unfavorites a listing (saved on this PC right away). */
  toggle: (listing: MarketListingEntry) => void;
}

type FavoriteUpdates = Map<string, Pick<SavedFavorite, 'listing'> | Pick<SavedFavorite, 'ended'>>;

/**
 * PD2's current copy of each live favorite and, for the ones PD2 no longer lists, how they ended (pd2trader.com's
 * archive; not known there yet: asked again next time). An error when PD2 refused the read (401: the auth flow takes
 * over) or failed.
 */
async function refreshFavorites(api: MarketApi): Promise<{ updates: FavoriteUpdates } | { error: string }> {
  try {
    await loadMarketPrefs();
    const live = getMarketPrefs()
      .favorites.filter((f) => !f.ended)
      .map((f) => f.listingId);
    const updates: FavoriteUpdates = new Map();
    const notLive: string[] = [];
    for (let from = 0; from < live.length; from += REFRESH_CHUNK) {
      const chunk = live.slice(from, from + REFRESH_CHUNK);
      const page = await api.getMarketListings({
        _id: { $in: chunk },
        $limit: chunk.length,
        $resolve: { user: { in_game_account: true } },
      });
      if (!page) return { error: t('market:favorites.loadFailed') };
      const found = new Map(page.data.map((listing) => [listing._id, listing]));
      for (const listingId of chunk) {
        const listing = found.get(listingId);
        if (listing) updates.set(listingId, { listing });
        else notLive.push(listingId);
      }
    }
    const ended = await Promise.all(
      notLive.map((listingId) =>
        lookupListing(listingId).then(
          (detail) => [listingId, detail?.status] as const,
          () => [listingId, undefined] as const,
        ),
      ),
    );
    for (const [listingId, endedAs] of ended) {
      if (endedAs && endedAs !== 'active') updates.set(listingId, { ended: endedAs });
    }
    return { updates };
  } catch (e) {
    return { error: e instanceof Error ? e.message.split('\n')[0] : t('market:favorites.loadFailed') };
  }
}

/**
 * The favorites kept on this PC (market-prefs.json; PD2's favorites API refuses PD2 Trader's token), refreshed on
 * mount, on a new `api` and on `reload`. A failed refresh keeps the saved copies. `api` null: no refresh (signed
 * out).
 */
export function useMarketFavorites(api: MarketApi | null): MarketFavorites {
  const { favorites } = useMarketStore();
  /** Bumped by `reload`: a new refresh. */
  const [generation, setGeneration] = useState(0);
  /** The last refresh that finished, for the api and generation it ran with. */
  const [settled, setSettled] = useState<{
    api: MarketApi;
    generation: number;
    error: string | null;
  } | null>(null);

  // A new api (account, sign-in) or reload refreshes; a refresh still in flight is dropped
  useEffect(() => {
    if (!api) return;
    let cancelled = false;
    void refreshFavorites(api).then((result) => {
      if (cancelled) return;
      if ('updates' in result) marketStoreActions.updateFavorites(result.updates);
      setSettled({ api, generation, error: 'error' in result ? result.error : null });
    });
    return () => {
      cancelled = true;
    };
  }, [api, generation]);

  const reload = useCallback(() => setGeneration((g) => g + 1), []);
  const current = !!api && settled?.api === api && settled.generation === generation ? settled : null;
  return {
    favorites,
    status: !api ? 'idle' : !current ? 'loading' : current.error ? 'error' : 'ready',
    error: current?.error ?? null,
    reload,
    toggle: marketStoreActions.toggleFavorite,
  };
}
