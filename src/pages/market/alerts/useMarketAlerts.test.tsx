// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { exists, readTextFile } from '@/lib/browser-fs';
import { playNotificationSound } from '@/hooks/useSocketNotifications';
import { showToast } from '@/overlay';
import type { SavedSearch } from '@/pages/market/lib/types';
import { resetMarketPrefs } from '@/pages/market/store/useMarketStore';
import { listMarketAlerts, listSavedSearches, openAlertStream, type MarketAlert } from './saved-search-api';
import type * as SavedSearchApi from './saved-search-api';
import { useMarketAlerts } from './useMarketAlerts';

const h = vi.hoisted(() => ({
  settings: {} as Record<string, unknown>,
}));

vi.mock('@/hooks/useOptions', () => ({ useOptions: () => ({ settings: h.settings, isLoading: false }) }));
vi.mock('@/hooks/useSocketNotifications', () => ({ playNotificationSound: vi.fn() }));
vi.mock('@/overlay', () => ({ showToast: vi.fn() }));
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
  vi.spyOn(console, 'warn').mockImplementation(() => {});
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

    vi.mocked(openAlertStream).mockResolvedValue(stream(HELLO));
    h.settings = { pd2Token: 'tok2' };
    rerender();
    await settle();
    await settle();
    expect(openAlertStream).toHaveBeenLastCalledWith('tok2', expect.any(AbortSignal));
  });
});
