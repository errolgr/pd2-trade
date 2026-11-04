import { useCallback, useEffect, useState } from 'react';
import { useOptions } from '@/hooks/useOptions';
import type { PluginView } from '../../host/manager';
import {
  marketplaceApi,
  type ListQuery,
  type Listing,
  type ListingDetail,
  type Review,
  type ReviewPage,
  type ReviewSort,
} from '../../marketplace/api';

/** Marketplace data hooks of the Plugins panel. Results are keyed by request: a stale answer reads as loading. */

export type Loaded<T> =
  | { status: 'loading'; data: null; retry: () => void; reload: () => void }
  | { status: 'error'; data: null; retry: () => void; reload: () => void }
  | { status: 'ok'; data: T; retry: () => void; reload: () => void };

/**
 * Loads `load()` whenever `key` changes; `retry` re-runs it showing the loading state, `reload` re-runs it keeping
 * the current data on screen (after a write).
 */
export function useLoaded<T>(key: string | null, load: () => Promise<T>): Loaded<T> {
  const [attempt, setAttempt] = useState(0);
  const [silent, setSilent] = useState(0);
  const requestKey = key === null ? null : `${attempt}|${key}`;
  const [state, setState] = useState<{ key: string | null; data: T | null; failed: boolean }>({
    key: null,
    data: null,
    failed: false,
  });

  useEffect(() => {
    if (requestKey === null) return;
    let live = true;
    load().then(
      (data) => live && setState({ key: requestKey, data, failed: false }),
      () =>
        live && setState((s) => (s.key === requestKey && s.data ? s : { key: requestKey, data: null, failed: true })),
    );
    return () => {
      live = false;
    };
    // load is a fresh closure every render; the key names the request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey, silent]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  const reload = useCallback(() => setSilent((s) => s + 1), []);
  if (state.key !== requestKey || requestKey === null) return { status: 'loading', data: null, retry, reload };
  if (state.failed || state.data === null) return { status: 'error', data: null, retry, reload };
  return { status: 'ok', data: state.data, retry, reload };
}

export const useDiscover = () => useLoaded('discover', () => marketplaceApi.discover());

export const useListingDetail = (id: string) => useLoaded<ListingDetail>(id, () => marketplaceApi.get(id));

/** PD2 bearer token, or null when signed out (reviews and reports need it). */
export function usePd2Token(): string | null {
  const { settings } = useOptions();
  return settings?.pd2Token || null;
}

/**
 * Latest listing detail of every installed marketplace plugin, for the Installed tab's update badges and update
 * sheet (one request per plugin when the tab opens).
 */
export function useInstalledDetails(plugins: readonly PluginView[]): Loaded<Record<string, ListingDetail>> {
  const ids = plugins
    .filter((p) => p.installed.source.kind === 'marketplace')
    .map((p) => p.installed.id)
    .sort();
  return useLoaded(ids.join('|'), async () => {
    const entries = await Promise.all(
      ids.map((id) =>
        marketplaceApi.get(id).then(
          (detail) => [id, detail] as const,
          () => null,
        ),
      ),
    );
    return Object.fromEntries(entries.filter((e): e is readonly [string, ListingDetail] => e !== null));
  });
}

interface PagedState<T> {
  key: string;
  items: T[];
  nextCursor: string | null;
  status: 'loading' | 'ok' | 'error';
  more: 'idle' | 'loading' | 'error';
}

export interface Paged<T> extends PagedState<T> {
  retry: () => void;
  loadMore: () => void;
}

/** Cursor-paged list: first page on `key` change, `loadMore` appends (only onto the query it was asked for). */
function usePaged<T, P extends { items: T[]; nextCursor: string | null }>(
  key: string,
  load: (cursor: string | null) => Promise<P>,
  onPage?: (page: P) => void,
): Paged<T> {
  const [attempt, setAttempt] = useState(0);
  const fullKey = `${attempt}|${key}`;
  const [state, setState] = useState<PagedState<T>>({
    key: '',
    items: [],
    nextCursor: null,
    status: 'loading',
    more: 'idle',
  });

  useEffect(() => {
    let live = true;
    load(null).then(
      (page) => {
        if (!live) return;
        onPage?.(page);
        setState({ key: fullKey, items: page.items, nextCursor: page.nextCursor, status: 'ok', more: 'idle' });
      },
      () => live && setState({ key: fullKey, items: [], nextCursor: null, status: 'error', more: 'idle' }),
    );
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullKey]);

  const current: PagedState<T> =
    state.key === fullKey ? state : { key: fullKey, items: [], nextCursor: null, status: 'loading', more: 'idle' };
  const loadMore = () => {
    const cursor = current.nextCursor;
    if (!cursor || current.more === 'loading') return;
    const update = (fn: (s: PagedState<T>) => PagedState<T>) => setState((s) => (s.key === fullKey ? fn(s) : s));
    update((s) => ({ ...s, more: 'loading' }));
    load(cursor).then(
      (page) =>
        update((s) => ({ ...s, items: [...s.items, ...page.items], nextCursor: page.nextCursor, more: 'idle' })),
      () => update((s) => ({ ...s, more: 'error' })),
    );
  };
  return { ...current, retry: () => setAttempt((a) => a + 1), loadMore };
}

export function useListings(query: Omit<ListQuery, 'cursor'>): Paged<Listing> {
  const key = JSON.stringify([query.q ?? '', query.category ?? '', query.tag ?? '', query.sort ?? '']);
  return usePaged<Listing, { items: Listing[]; nextCursor: string | null }>(key, (cursor) =>
    marketplaceApi.list({ ...query, cursor }),
  );
}

export function useReviews(
  id: string,
  sort: ReviewSort,
  version: number,
): Paged<Review> & { summary: ReviewPage['summary'] | null } {
  const [summary, setSummary] = useState<{ key: string; value: ReviewPage['summary'] } | null>(null);
  const key = `${id}|${sort}|${version}`;
  const paged = usePaged<Review, ReviewPage>(
    key,
    (cursor) => marketplaceApi.reviews(id, { sort, cursor }),
    (page) => setSummary({ key, value: page.summary }),
  );
  return { ...paged, summary: summary?.key === key ? summary.value : null };
}

export const useMyReview = (id: string, token: string | null, version: number) =>
  useLoaded<{ review: Review | null }>(token ? `${id}|${token}|${version}` : null, async () => ({
    review: await marketplaceApi.myReview(id, token as string),
  }));
