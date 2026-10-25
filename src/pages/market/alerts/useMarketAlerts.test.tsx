// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { exists, readTextFile } from '@/lib/browser-fs';
import { playNotificationSound } from '@/hooks/useSocketNotifications';
import { showToast } from '@/overlay';
import type { SavedSearch } from '@/pages/market/lib/types';
import {
  getMarketPrefs,
  resetMarketPrefs,
  retrySavedSearchSync,
  SYNC_RETRY_BASE_MS,
} from '@/pages/market/store/useMarketStore';
import {
  listMarketAlerts,
  listSavedSearches,
  openAlertStream,
  SavedSearchApiError,
  type MarketAlert,
} from './saved-search-api';
import type * as SavedSearchApi from './saved-search-api';
import { useMarketAlerts } from './useMarketAlerts';

const h = vi.hoisted(() => ({
  settings: {} as Record<string, unknown>,
  openPanel: vi.fn(),
  refreshTokens: vi.fn<(refreshToken: string) => Promise<boolean>>(),
}));

vi.mock('@/hooks/useOptions', () => ({ useOptions: () => ({ settings: h.settings, isLoading: false }) }));
vi.mock('@/hooks/useOAuth', () => ({ useOAuth: () => ({ refreshTokens: h.refreshTokens }) }));
vi.mock('@/hooks/useSocketNotifications', () => ({ playNotificationSound: vi.fn() }));
vi.mock('@/overlay', () => ({ showToast: vi.fn(), useOverlay: () => ({ openPanel: h.openPanel }) }));
vi.mock('@/lib/browser-fs', () => ({
  BaseDirectory: { AppConfig: 13 },
  exists: vi.fn(async () => false),
  mkdir: vi.fn(async () => {}),
  readTextFile: vi.fn(),
  writeTextFile: vi.fn(async () => {}),
}));
vi.mock('./saved-search-api', async (importOriginal) => ({
  ...(await importOriginal<typeof SavedSearchApi>()),
  listSavedSearches: vi.fn(),
  listMarketAlerts: vi.fn(async () => ({ items: [] })),
  openAlertStream: vi.fn(),
}));

const search = (id: string, alert: boolean): SavedSearch => ({
  id,
  name: id,
  filters: { source: 'live', itemName: 'Harlequin Crest', stats: [] } as unknown as SavedSearch['filters'],
  alert,
  createdAt: '2026-10-21T00:00:00Z',
});

const alert: MarketAlert = {
  id: 'al1',
  savedSearchId: 's1',
  savedSearchName: 'Cheap Shako',
  listingId: 'l1',
  matchedAt: '2026-10-21T08:01:00Z',
  listing: {
    id: 'l1',
    isLadder: true,
    isHardcore: false,
    name: 'Harlequin Crest',
    baseName: 'Shako',
    baseCode: 'uap',
    typeCode: 'helm',
    quality: 'Unique',
    price: '2 ist',
    hrPrice: 0.5,
    bumpedAt: null,
    seller: 'Gheed',
    status: 'active',
    soldHr: null,
  },
};

/** An open stream that sends `text` and stays open. */
const stream = (text: string) =>
  new Response(
    new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(new TextEncoder().encode(text));
      },
    }),
  );
const HELLO = 'event: hello\ndata: {"serverTime":"2026-10-21T08:00:00Z"}\n\n';
const ALERT = `event: market.alert\ndata: ${JSON.stringify(alert)}\n\n`;

const settle = () => act(() => vi.advanceTimersByTimeAsync(0));

beforeEach(() => {
  vi.useFakeTimers();
  resetMarketPrefs();
  vi.mocked(exists).mockResolvedValue(false);
  vi.mocked(readTextFile).mockReset();
  vi.mocked(showToast).mockClear();
  vi.mocked(playNotificationSound).mockClear();
  vi.mocked(openAlertStream).mockReset();
  vi.mocked(listMarketAlerts).mockClear();
  vi.mocked(listSavedSearches).mockReset();
  h.settings = { pd2Token: 'tok' };
  h.openPanel.mockReset();
  h.refreshTokens.mockReset().mockResolvedValue(false);
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('useMarketAlerts', () => {
  it('syncs the saved searches and pops a toast with the alert sound for each new match', async () => {
    h.settings = { pd2Token: 'tok', marketAlertVolume: 40 };
    vi.mocked(listSavedSearches).mockResolvedValue({
      items: [search('s1', true)],
      limits: { maxSearches: 25, maxAlerting: 10 },
    });
    vi.mocked(openAlertStream).mockResolvedValue(stream(HELLO + ALERT + ALERT));
    renderHook(() => useMarketAlerts());
    await settle();
    await settle();

    expect(listSavedSearches).toHaveBeenCalledWith('tok');
    expect(openAlertStream).toHaveBeenCalledWith('tok', expect.any(AbortSignal));
    expect(showToast).toHaveBeenCalledTimes(1);
    expect(vi.mocked(showToast).mock.calls[0][0]).toMatchObject({
      description: 'Cheap Shako: Harlequin Crest — 0.5 HR',
      action: { data: { savedSearchId: 's1', focusListingId: 'l1' } },
    });
    expect(playNotificationSound).toHaveBeenCalledWith(40);
  });

  it('stays quiet when the alert sound is off', async () => {
    h.settings = { pd2Token: 'tok', marketAlertSoundEnabled: false };
    vi.mocked(listSavedSearches).mockResolvedValue({
      items: [search('s1', true)],
      limits: { maxSearches: 25, maxAlerting: 10 },
    });
    vi.mocked(openAlertStream).mockResolvedValue(stream(HELLO + ALERT));
    renderHook(() => useMarketAlerts());
    await settle();
    await settle();
    expect(showToast).toHaveBeenCalledTimes(1);
    expect(playNotificationSound).not.toHaveBeenCalled();
  });

  it('opens no stream without a watched search, with alerts off, or signed out', async () => {
    vi.mocked(listSavedSearches).mockResolvedValue({
      items: [search('s1', false)],
      limits: { maxSearches: 25, maxAlerting: 10 },
    });
    renderHook(() => useMarketAlerts());
    await settle();
    expect(openAlertStream).not.toHaveBeenCalled();
    cleanup();

    resetMarketPrefs();
    vi.mocked(exists).mockResolvedValue(true);
    vi.mocked(readTextFile).mockResolvedValue(JSON.stringify({ alertsEnabled: false }));
    vi.mocked(listSavedSearches).mockResolvedValue({
      items: [search('s1', true)],
      limits: { maxSearches: 25, maxAlerting: 10 },
    });
    renderHook(() => useMarketAlerts());
    await settle();
    expect(openAlertStream).not.toHaveBeenCalled();
    cleanup();

    resetMarketPrefs();
    h.settings = {};
    renderHook(() => useMarketAlerts());
    await settle();
    expect(listSavedSearches).toHaveBeenCalledTimes(2);
    expect(openAlertStream).not.toHaveBeenCalled();
  });

  it('stops after a 401 until the token changes', async () => {
    vi.mocked(listSavedSearches).mockResolvedValue({
      items: [search('s1', true)],
      limits: { maxSearches: 25, maxAlerting: 10 },
    });
    vi.mocked(openAlertStream).mockRejectedValue(Object.assign(new Error('expired'), { status: 401 }));
    const { rerender } = renderHook(() => useMarketAlerts());
    await settle();
    await act(() => vi.advanceTimersByTimeAsync(120_000));
    expect(openAlertStream).toHaveBeenCalledTimes(1);
    // No refresh token: straight to sign-in
    expect(h.refreshTokens).not.toHaveBeenCalled();
    expect(h.openPanel).toHaveBeenCalledExactlyOnceWith('signIn');
    expect(getMarketPrefs().syncStatus).toBe('unauthorized');

    vi.mocked(openAlertStream).mockResolvedValue(stream(HELLO));
    h.settings = { pd2Token: 'tok2' };
    rerender();
    await settle();
    await settle();
    expect(openAlertStream).toHaveBeenLastCalledWith('tok2', expect.any(AbortSignal));
  });

  const refused = () => new SavedSearchApiError('Unauthorized', 401);

  it('a 401 on the list refreshes the token once, then resumes with the new one', async () => {
    h.settings = { pd2Token: 'tok', pd2RefreshToken: 'r' };
    h.refreshTokens.mockResolvedValue(true);
    vi.mocked(listSavedSearches).mockImplementation(async (token) => {
      if (token === 'tok') throw refused();
      return { items: [search('s1', true)], limits: { maxSearches: 25, maxAlerting: 10 } };
    });
    vi.mocked(openAlertStream).mockResolvedValue(stream(HELLO));
    const { rerender } = renderHook(() => useMarketAlerts());
    await settle();
    expect(h.refreshTokens).toHaveBeenCalledExactlyOnceWith('r');
    // The refused token is not retried while the refresh lands
    await act(() => vi.advanceTimersByTimeAsync(5 * 60_000));
    expect(listSavedSearches).toHaveBeenCalledTimes(1);
    expect(openAlertStream).not.toHaveBeenCalled();

    h.settings = { pd2Token: 'tok2', pd2RefreshToken: 'r2' };
    rerender();
    await settle();
    await settle();
    expect(listSavedSearches).toHaveBeenLastCalledWith('tok2');
    expect(openAlertStream).toHaveBeenCalledWith('tok2', expect.any(AbortSignal));
    expect(getMarketPrefs().syncStatus).toBe('ready');
    expect(h.refreshTokens).toHaveBeenCalledTimes(1);
    expect(h.openPanel).not.toHaveBeenCalled();
  });

  it('a 401 with the refreshed token stops for good: sign-in prompt, no further requests', async () => {
    h.settings = { pd2Token: 'tok', pd2RefreshToken: 'r' };
    h.refreshTokens.mockResolvedValue(true);
    vi.mocked(listSavedSearches).mockRejectedValue(refused());
    const { rerender } = renderHook(() => useMarketAlerts());
    await settle();
    expect(h.refreshTokens).toHaveBeenCalledTimes(1);

    h.settings = { pd2Token: 'tok2', pd2RefreshToken: 'r2' };
    rerender();
    await settle();
    expect(listSavedSearches).toHaveBeenLastCalledWith('tok2');
    expect(h.refreshTokens).toHaveBeenCalledTimes(1);
    expect(h.openPanel).toHaveBeenCalledExactlyOnceWith('signIn');

    // Re-renders, the panel showing (WatchButton / Saved tab retry) and time send nothing more
    rerender();
    retrySavedSearchSync();
    await act(() => vi.advanceTimersByTimeAsync(30 * 60_000));
    expect(listSavedSearches).toHaveBeenCalledTimes(2);
    expect(openAlertStream).not.toHaveBeenCalled();
    expect(h.refreshTokens).toHaveBeenCalledTimes(1);
    expect(h.openPanel).toHaveBeenCalledTimes(1);
  });

  it('asks to sign in when the refresh itself fails', async () => {
    h.settings = { pd2Token: 'tok', pd2RefreshToken: 'r' };
    vi.mocked(listSavedSearches).mockRejectedValue(refused());
    renderHook(() => useMarketAlerts());
    await settle();
    await settle();
    expect(h.refreshTokens).toHaveBeenCalledExactlyOnceWith('r');
    expect(h.openPanel).toHaveBeenCalledExactlyOnceWith('signIn');
    await act(() => vi.advanceTimersByTimeAsync(30 * 60_000));
    expect(listSavedSearches).toHaveBeenCalledTimes(1);
  });

  it('a network error still backs off and retries, without refreshing or prompting', async () => {
    h.settings = { pd2Token: 'tok', pd2RefreshToken: 'r' };
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    vi.mocked(listSavedSearches)
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValue({ items: [search('s1', true)], limits: { maxSearches: 25, maxAlerting: 10 } });
    vi.mocked(openAlertStream).mockResolvedValue(stream(HELLO));
    renderHook(() => useMarketAlerts());
    await settle();
    expect(getMarketPrefs().syncStatus).toBe('error');
    await act(() => vi.advanceTimersByTimeAsync(SYNC_RETRY_BASE_MS));
    expect(listSavedSearches).toHaveBeenCalledTimes(2);
    await act(() => vi.advanceTimersByTimeAsync(SYNC_RETRY_BASE_MS * 2));
    expect(listSavedSearches).toHaveBeenCalledTimes(3);
    await settle();
    expect(openAlertStream).toHaveBeenCalledWith('tok', expect.any(AbortSignal));
    expect(h.refreshTokens).not.toHaveBeenCalled();
    expect(h.openPanel).not.toHaveBeenCalled();
  });
});
