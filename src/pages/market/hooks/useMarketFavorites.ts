import { useCallback, useEffect, useRef, useState } from 'react';
import { showToast } from '@/overlay';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import type { MarketApi, MarketFavorite } from '../lib/types';

/** The site pages favorites; the overlay reads up to this many (plenty for a personal watch list). */
const FAVORITES_PAGE = 50;
const FAVORITES_MAX = 500;

export type FavoritesStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface MarketFavorites {
  favorites: MarketFavorite[];
  status: FavoritesStatus;
  error: string | null;
  reload: () => Promise<void>;
  /** Optimistic add/remove of a site favorite. */
  toggle: (listing: MarketListingEntry) => Promise<void>;
}

/**
 * The signed-in user's site favorites (synced with projectdiablo2.com) and an optimistic toggle: the heart
 * flips at once and flips back with a toast when the API refuses.
 */
export function useMarketFavorites(api: MarketApi | null, signedIn: boolean): MarketFavorites {
  const [favorites, setFavorites] = useState<MarketFavorite[]>([]);
  const [status, setStatus] = useState<FavoritesStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  /** Listing ids with a toggle in flight (a second click waits). */
  const pending = useRef(new Set<string>());

  const load = useCallback(async () => {
    if (!api || !signedIn) {
      setFavorites([]);
      setStatus('idle');
      return;
    }
    setStatus('loading');
    setError(null);
    try {
      const all: MarketFavorite[] = [];
      for (let skip = 0; skip < FAVORITES_MAX; skip += FAVORITES_PAGE) {
        const page = await api.getFavorites({ limit: FAVORITES_PAGE, skip });
        if (!page) break; // 401: the auth flow takes over
        all.push(...page.data);
        if (page.data.length < FAVORITES_PAGE || all.length >= page.total) break;
      }
      setFavorites(all);
      setStatus('ready');
    } catch (e) {
      setError(e instanceof Error ? e.message.split('\n')[0] : 'Could not load favorites');
      setStatus('error');
    }
  }, [api, signedIn]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = useCallback(
    async (listing: MarketListingEntry) => {
      if (!api || !signedIn || pending.current.has(listing._id)) return;
      pending.current.add(listing._id);
      const existing = favorites.find((f) => f.listing_id === listing._id);
      try {
        if (existing) {
          setFavorites((list) => list.filter((f) => f._id !== existing._id));
          try {
            await api.removeFavorite(existing._id);
          } catch (e) {
            setFavorites((list) => [existing, ...list]);
            throw e;
          }
        } else {
          const optimistic: MarketFavorite = {
            _id: `pending:${listing._id}`,
            listing_id: listing._id,
            seller_id: listing.user_id,
            user_id: '',
            created_at: new Date().toISOString(),
            listing,
          };
          setFavorites((list) => [optimistic, ...list]);
          try {
            const created = await api.addFavorite(listing._id, listing.user_id);
            setFavorites((list) =>
              list.map((f) => (f._id === optimistic._id ? { ...optimistic, ...(created ?? {}), listing } : f)),
            );
          } catch (e) {
            setFavorites((list) => list.filter((f) => f._id !== optimistic._id));
            throw e;
          }
        }
      } catch {
        showToast({
          title: existing ? 'Favorite not removed' : 'Favorite not saved',
          description: 'projectdiablo2.com refused the change. Try again in a moment.',
          variant: 'error',
        });
      } finally {
        pending.current.delete(listing._id);
      }
    },
    [api, signedIn, favorites],
  );

  return { favorites, status, error, reload: load, toggle };
}
