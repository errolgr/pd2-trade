import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { useOptions } from '@/hooks/useOptions';
import { stashPresence, type StashPresence } from './stash-presence';

export interface StashPresenceState {
  /** Each listing's presence by id; null until the stash was read. */
  presence: ReadonlyMap<string, StashPresence> | null;
  /** When the stash was read (ms epoch). */
  checkedAt: number | null;
  reading: boolean;
  /** The last read failed (signed out, no account, PD2 down): the message. */
  error: string | null;
  /** Read the stash again. */
  refresh: () => Promise<void>;
}

/**
 * Where the listed items are in the stash: one stash read (shared tabs plus every character's personal stash) once
 * the listings are in, again for another account or mode, and on `refresh`.
 */
export function useStashPresence(listings: readonly MarketListingEntry[] | null): StashPresenceState {
  const { fetchStash } = usePd2Website();
  const { settings } = useOptions();
  const [read, setRead] = useState<{ items: GameStashItem[]; at: number } | null>(null);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Read through a ref: fetchStash changes with every settings change (a sort pick), which must not read again
  const fetchRef = useRef(fetchStash);
  fetchRef.current = fetchStash;

  const refresh = useCallback(async () => {
    setReading(true);
    setError(null);
    try {
      const data = await fetchRef.current();
      setRead({ items: data.items ?? [], at: Date.now() });
    } catch (err) {
      console.warn('[MyListings] Stash read failed:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setReading(false);
    }
  }, []);

  const hasListings = (listings?.length ?? 0) > 0;
  const realm = `${settings?.account ?? ''}|${settings?.mode ?? ''}|${settings?.ladder ?? ''}`;
  useEffect(() => {
    setRead(null);
    if (hasListings) void refresh();
  }, [hasListings, realm, refresh]);

  const presence = useMemo(() => (read && listings ? stashPresence(listings, read.items) : null), [read, listings]);
  return { presence, checkedAt: read?.at ?? null, reading, error, refresh };
}
