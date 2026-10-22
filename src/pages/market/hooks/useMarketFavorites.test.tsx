// @vitest-environment happy-dom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MarketApi, MarketFavorite } from '../lib/types';
import { useMarketFavorites } from './useMarketFavorites';

vi.mock('@/overlay', () => ({ showToast: vi.fn() }));

const fav = (id: string): MarketFavorite => ({
  _id: `f-${id}`,
  listing_id: id,
  seller_id: 's',
  user_id: 'u',
  created_at: '2026-10-21T00:00:00Z',
});

/** getFavorites resolves only when the test says so, per call. */
function deferredApi() {
  const calls: { resolve: (v: { total: number; data: MarketFavorite[] }) => void; reject: (e: Error) => void }[] = [];
  const getFavorites = vi.fn(
    () =>
      new Promise<{ total: number; data: MarketFavorite[] }>((resolve, reject) => {
        calls.push({ resolve, reject });
      }),
  );
  return { api: { getFavorites } as unknown as MarketApi, calls };
}

afterEach(() => {
  cleanup();
});

describe('useMarketFavorites', () => {
  it('drops a slow load for the previous account when a newer one lands first', async () => {
    const oldAccount = deferredApi();
    const newAccount = deferredApi();
    const { result, rerender } = renderHook(({ api }) => useMarketFavorites(api, true), {
      initialProps: { api: oldAccount.api },
    });
    await waitFor(() => expect(oldAccount.calls).toHaveLength(1));

    rerender({ api: newAccount.api });
    await waitFor(() => expect(newAccount.calls).toHaveLength(1));
    await act(async () => newAccount.calls[0].resolve({ total: 1, data: [fav('new')] }));
    expect(result.current.favorites.map((f) => f.listing_id)).toEqual(['new']);

    await act(async () => oldAccount.calls[0].resolve({ total: 1, data: [fav('old')] }));
    expect(result.current.favorites.map((f) => f.listing_id)).toEqual(['new']);
    expect(result.current.status).toBe('ready');
  });

  it('a load still in flight at sign-out neither fills the list nor reports its error', async () => {
    const { api, calls } = deferredApi();
    const { result, rerender } = renderHook(({ signedIn }) => useMarketFavorites(api, signedIn), {
      initialProps: { signedIn: true },
    });
    await waitFor(() => expect(calls).toHaveLength(1));
    rerender({ signedIn: false });
    expect(result.current).toMatchObject({ favorites: [], status: 'idle' });

    await act(async () => calls[0].resolve({ total: 1, data: [fav('stale')] }));
    expect(result.current).toMatchObject({ favorites: [], status: 'idle', error: null });

    rerender({ signedIn: true });
    await waitFor(() => expect(calls).toHaveLength(2));
    rerender({ signedIn: false });
    await act(async () => calls[1].reject(new Error('API Error: 500')));
    expect(result.current).toMatchObject({ status: 'idle', error: null });
  });
});
