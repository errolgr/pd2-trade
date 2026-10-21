// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MarketListingEntry, MarketListingResult } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { exists, readTextFile } from '@/lib/browser-fs';
import { showToast } from '@/overlay';
import { defaultFilters } from '@/pages/market/lib/defaults';
import { resetMarketPrefs } from '@/pages/market/store/useMarketStore';
import { ALERT_POLL_MS } from './alert-logic';
import { useMarketAlerts } from './useMarketAlerts';

const h = vi.hoisted(() => ({
  settings: { pd2Token: 'tok', mode: 'softcore', ladder: 'ladder' } as Record<string, unknown>,
  /** The backend sign-in (`/api/auth/oauth/me`); null when it failed or is still pending. */
  authData: null as unknown,
  getMarketListings: vi.fn(),
}));

vi.mock('@/hooks/useOptions', () => ({ useOptions: () => ({ settings: h.settings, isLoading: false }) }));
vi.mock('@/hooks/pd2website/usePD2Website', () => ({
  usePd2Website: () => ({ authData: h.authData, marketApi: { getMarketListings: h.getMarketListings } }),
}));
vi.mock('@/overlay', () => ({ showToast: vi.fn() }));
vi.mock('@/lib/browser-fs', () => ({
  BaseDirectory: { AppConfig: 13 },
  exists: vi.fn(async () => true),
  mkdir: vi.fn(async () => {}),
  readTextFile: vi.fn(),
  writeTextFile: vi.fn(async () => {}),
}));

const listing = (id: string) =>
  ({
    _id: id,
    hr_price: 1,
    price: '',
    item: { name: 'Spirit', base: { name: 'Monarch' }, modifiers: [] },
  }) as unknown as MarketListingEntry;
const page = (...ids: string[]): MarketListingResult => ({
  total: ids.length,
  limit: 50,
  skip: 0,
  data: ids.map(listing),
});

function savePrefs(alertsEnabled = true) {
  const filters = { ...defaultFilters({ hardcore: false, ladder: true }), itemName: 'Spirit' };
  vi.mocked(readTextFile).mockResolvedValue(
    JSON.stringify({
      savedSearches: [{ id: 's1', name: 'Spirit', filters, alert: true, createdAt: '2026-10-21T00:00:00Z' }],
      alertsEnabled,
    }),
  );
}

const advance = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

beforeEach(() => {
  vi.useFakeTimers();
  resetMarketPrefs();
  vi.mocked(exists).mockResolvedValue(true);
  vi.mocked(showToast).mockClear();
  h.getMarketListings.mockReset();
  h.settings = { pd2Token: 'tok', mode: 'softcore', ladder: 'ladder' };
  h.authData = null;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('useMarketAlerts', () => {
  it('polls with just a PD2 token (the backend sign-in may never succeed), seeding silently, then toasts new matches', async () => {
    savePrefs();
    h.getMarketListings.mockResolvedValueOnce(page('a', 'b')).mockResolvedValue(page('c', 'a', 'b'));
    renderHook(() => useMarketAlerts());
    await advance(0);
    await advance(0);

    expect(h.getMarketListings).toHaveBeenCalledTimes(1);
    expect(h.getMarketListings.mock.calls[0][0]).toMatchObject({ 'item.name': 'Spirit', $limit: 50 });
    expect(showToast).not.toHaveBeenCalled();

    await advance(ALERT_POLL_MS);
    expect(h.getMarketListings).toHaveBeenCalledTimes(2);
    expect(showToast).toHaveBeenCalledTimes(1);
    expect(vi.mocked(showToast).mock.calls[0][0]).toMatchObject({
      action: { data: { savedSearchId: 's1', focusListingId: 'c' } },
    });

    await advance(ALERT_POLL_MS);
    expect(showToast).toHaveBeenCalledTimes(1);
  });

  it('does not poll when signed out or with alerts off', async () => {
    savePrefs(false);
    h.getMarketListings.mockResolvedValue(page('a'));
    renderHook(() => useMarketAlerts());
    await advance(ALERT_POLL_MS * 2);
    expect(h.getMarketListings).not.toHaveBeenCalled();

    cleanup();
    resetMarketPrefs();
    savePrefs(true);
    h.settings = { ...h.settings, pd2Token: undefined };
    renderHook(() => useMarketAlerts());
    await advance(ALERT_POLL_MS * 2);
    expect(h.getMarketListings).not.toHaveBeenCalled();
  });

  it('stops after a 401 until the token changes', async () => {
    savePrefs();
    h.getMarketListings.mockResolvedValue(null);
    const { rerender } = renderHook(() => useMarketAlerts());
    await advance(0);
    await advance(ALERT_POLL_MS * 3);
    expect(h.getMarketListings).toHaveBeenCalledTimes(1);

    h.getMarketListings.mockResolvedValue(page('a'));
    h.settings = { ...h.settings, pd2Token: 'tok2' };
    rerender();
    await advance(0);
    expect(h.getMarketListings).toHaveBeenCalledTimes(2);
  });
});
