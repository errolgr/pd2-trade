// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { exists, readTextFile, writeTextFile } from '@/lib/browser-fs';
import { playNotificationSound } from '@/hooks/useSocketNotifications';
import { showToast } from '@/overlay';
import type { MarketFilters, SavedSearch } from '@/pages/market/lib/types';
import {
  getMarketPrefs,
  MARKET_PREFS_FILENAME,
  marketStoreActions as actions,
  resetMarketPrefs,
} from '@/pages/market/store/useMarketStore';
import {
  fetchNewestListings,
  listServerSavedSearches,
  type MarketListingSummary,
  openLiveSearchStream,
  watchQuery,
} from './market-api';
import { listWtbResponses } from './wtb-api';
import { notify } from '@/overlay';
import type { WtbResponse } from '@/pages/market/lib/wtb';
import type * as MarketApi from './market-api';
import { useMarketAlerts } from './useMarketAlerts';

const h = vi.hoisted(() => ({ settings: {} as Record<string, unknown>, updateSettings: vi.fn(async () => {}) }));

vi.mock('@/hooks/useOptions', () => ({
  useOptions: () => ({ settings: h.settings, isLoading: false, updateSettings: h.updateSettings }),
}));
vi.mock('./wtb-api', () => ({ listWtbResponses: vi.fn() }));
vi.mock('@/hooks/useSocketNotifications', () => ({ playNotificationSound: vi.fn() }));
// notify() logs and toasts when asked: the toast half goes through the showToast mock
vi.mock('@/overlay', () => {
  const showToast = vi.fn();
  return {
    showToast,
    notify: vi.fn((_kind: string, payload: unknown, { toast }: { toast: boolean }) => {
      if (toast) showToast(payload);
    }),
  };
});
vi.mock('@/lib/browser-fs', () => ({
  BaseDirectory: { AppConfig: 13 },
  exists: vi.fn(async () => false),
  mkdir: vi.fn(async () => {}),
  readTextFile: vi.fn(),
  writeTextFile: vi.fn(async () => {}),
}));
vi.mock('./market-api', async (importOriginal) => ({
  ...(await importOriginal<typeof MarketApi>()),
  openLiveSearchStream: vi.fn(),
  fetchNewestListings: vi.fn(async () => []),
  listServerSavedSearches: vi.fn(async () => []),
}));

const filters = (itemName: string, over: Partial<MarketFilters> = {}) =>
  ({ source: 'live', hardcore: false, ladder: true, itemName, stats: [], ...over }) as unknown as MarketFilters;
const search = (id: string, watching: boolean, over: Partial<SavedSearch> = {}): SavedSearch => ({
  id,
  name: id === 's1' ? 'Cheap Shako' : id,
  filters: filters(id === 's1' ? 'Harlequin Crest' : id),
  watching,
  createdAt: '2026-10-21T00:00:00Z',
  updatedAt: '2026-10-21T00:00:00Z',
  ...over,
});
const q = (s: SavedSearch) => watchQuery(s.filters);

const listing = (id: string, bumpedAt: string): MarketListingSummary => ({
  id,
  isLadder: true,
  isHardcore: false,
  name: 'Harlequin Crest',
  baseName: 'Shako',
  baseCode: 'uap',
  typeCode: 'helm',
  quality: 'Unique',
  price: '2 ist',
  hrPrice: 0.5,
  bumpedAt,
  seller: 'Gheed',
  status: 'active',
  soldHr: null,
});

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
const match = (forSearch: SavedSearch, id: string, bumpedAt: string) =>
  `event: market.match\ndata: ${JSON.stringify({ ...listing(id, bumpedAt), matchedAt: bumpedAt, q: q(forSearch) })}\n\n`;

const settle = () => act(() => vi.advanceTimersByTimeAsync(0));
const written = () =>
  vi
    .mocked(writeTextFile)
    .mock.calls.filter(([path]) => path === MARKET_PREFS_FILENAME)
    .map(([, text]) => JSON.parse(String(text)));

/** market-prefs.json holds `file`. */
function savedFile(file: Record<string, unknown>) {
  vi.mocked(exists).mockResolvedValue(true);
  vi.mocked(readTextFile).mockResolvedValue(JSON.stringify({ savedSearchesImported: true, ...file }));
}

beforeEach(() => {
  vi.useFakeTimers();
  resetMarketPrefs();
  vi.mocked(exists).mockResolvedValue(false);
  vi.mocked(readTextFile).mockReset();
  vi.mocked(writeTextFile).mockClear();
  vi.mocked(showToast).mockClear();
  vi.mocked(playNotificationSound).mockClear();
  vi.mocked(openLiveSearchStream).mockReset().mockResolvedValue(stream(HELLO));
  vi.mocked(fetchNewestListings).mockReset().mockResolvedValue([]);
  vi.mocked(listServerSavedSearches).mockReset().mockResolvedValue([]);
  vi.mocked(listWtbResponses).mockReset().mockResolvedValue({ items: [], nextCursor: null });
  vi.mocked(notify).mockClear();
  h.updateSettings.mockClear();
  h.settings = {};
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('useMarketAlerts', () => {
  it('streams every watched search over one connection, signed out, and toasts each new match with the sound', async () => {
    h.settings = { marketAlertVolume: 40 };
    const shako = search('s1', true);
    const spirit = search('s2', true);
    savedFile({
      savedSearches: [
        shako,
        spirit,
        search('s3', false),
        search('s4', true, { filters: filters('x', { source: 'archive' }) }),
      ],
    });
    vi.mocked(openLiveSearchStream).mockResolvedValue(
      stream(HELLO + match(shako, 'l1', '2026-10-21T08:01:00Z') + match(shako, 'l1', '2026-10-21T08:01:00Z')),
    );
    renderHook(() => useMarketAlerts());
    await settle();
    await settle();

    expect(openLiveSearchStream).toHaveBeenCalledExactlyOnceWith(
      [q(shako), q(spirit)].sort(),
      expect.any(AbortSignal),
      undefined,
    );
    expect(listServerSavedSearches).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledTimes(1);
    expect(vi.mocked(showToast).mock.calls[0][0]).toMatchObject({
      description: 'Cheap Shako: Harlequin Crest — 0.5 HR',
      action: { data: { savedSearchId: 's1', focusListingId: 'l1' } },
      listing: { listingId: 'l1', savedSearchId: 's1' },
    });
    expect(playNotificationSound).toHaveBeenCalledWith(40);
    expect(getMarketPrefs().savedSearches[0].lastSeenBumpedAt).toBe('2026-10-21T08:01:00Z');
  });

  it('stays quiet when the alert sound is off', async () => {
    h.settings = { marketAlertSoundEnabled: false };
    const shako = search('s1', true);
    savedFile({ savedSearches: [shako] });
    vi.mocked(openLiveSearchStream).mockResolvedValue(stream(HELLO + match(shako, 'l1', '2026-10-21T08:01:00Z')));
    renderHook(() => useMarketAlerts());
    await settle();
    await settle();
    expect(showToast).toHaveBeenCalledTimes(1);
    expect(playNotificationSound).not.toHaveBeenCalled();
  });

  it('opens no stream without a watched search or with alerts off', async () => {
    savedFile({ savedSearches: [search('s1', false)] });
    renderHook(() => useMarketAlerts());
    await settle();
    expect(openLiveSearchStream).not.toHaveBeenCalled();
    cleanup();

    resetMarketPrefs();
    savedFile({ savedSearches: [search('s1', true)], alertsEnabled: false });
    renderHook(() => useMarketAlerts());
    await settle();
    expect(openLiveSearchStream).not.toHaveBeenCalled();
  });

  it('reopens the stream when the watched set changes, not on renames or seen bumps', async () => {
    const shako = search('s1', true);
    savedFile({ savedSearches: [shako] });
    renderHook(() => useMarketAlerts());
    await settle();
    expect(openLiveSearchStream).toHaveBeenCalledTimes(1);
    const firstSignal = vi.mocked(openLiveSearchStream).mock.calls[0][1];

    act(() => {
      actions.renameSearch('s1', 'Renamed');
      actions.markSearchSeen('s1', '2026-10-21T09:00:00Z');
    });
    await settle();
    expect(openLiveSearchStream).toHaveBeenCalledTimes(1);

    let spirit: SavedSearch | null = null;
    act(() => {
      spirit = actions.saveSearch('Spirit', filters('Spirit'), true);
    });
    await settle();
    expect(firstSignal.aborted).toBe(true);
    expect(openLiveSearchStream).toHaveBeenCalledTimes(2);
    expect(vi.mocked(openLiveSearchStream).mock.calls[1][0]).toEqual([q(shako), q(spirit!)].sort());

    act(() => {
      actions.setSearchWatching('s1', false);
      actions.setSearchWatching(spirit!.id, false);
    });
    await settle();
    expect(vi.mocked(openLiveSearchStream).mock.calls[1][1].aborted).toBe(true);
    expect(openLiveSearchStream).toHaveBeenCalledTimes(2);
  });

  it('catches up on (re)connect: only listings bumped after the last one seen, which it then remembers', async () => {
    const shako = search('s1', true, { lastSeenBumpedAt: '2026-10-21T08:00:00Z' });
    savedFile({ savedSearches: [shako] });
    vi.mocked(fetchNewestListings).mockResolvedValue([
      listing('new', '2026-10-21T08:10:00Z'),
      listing('seen', '2026-10-21T08:00:00Z'),
      listing('old', '2026-10-21T07:50:00Z'),
    ]);
    renderHook(() => useMarketAlerts());
    await settle();
    await settle();

    expect(fetchNewestListings).toHaveBeenCalledWith(q(shako));
    expect(showToast).toHaveBeenCalledTimes(1);
    expect(vi.mocked(showToast).mock.calls[0][0]).toMatchObject({ listing: { listingId: 'new', savedSearchId: 's1' } });
    expect(getMarketPrefs().savedSearches[0].lastSeenBumpedAt).toBe('2026-10-21T08:10:00Z');
    expect(written().at(-1).savedSearches[0].lastSeenBumpedAt).toBe('2026-10-21T08:10:00Z');
  });

  it('a first catch-up only records the newest listing', async () => {
    savedFile({ savedSearches: [search('s1', true)] });
    vi.mocked(fetchNewestListings).mockResolvedValue([listing('a', '2026-10-21T08:10:00Z')]);
    renderHook(() => useMarketAlerts());
    await settle();
    await settle();
    expect(showToast).not.toHaveBeenCalled();
    expect(getMarketPrefs().savedSearches[0].lastSeenBumpedAt).toBe('2026-10-21T08:10:00Z');
  });

  it('imports the saved searches kept on pd2trader.com once when signed in', async () => {
    h.settings = { pd2Token: 'tok' };
    vi.mocked(listServerSavedSearches).mockResolvedValue([
      {
        id: 'srv1',
        name: 'Server Shako',
        filters: filters('Harlequin Crest'),
        alert: true,
        createdAt: '2026-10-20T00:00:00Z',
      },
      { id: 'srv2', name: 'Bookmark', filters: filters('Spirit'), alert: false, createdAt: '2026-10-19T00:00:00Z' },
    ]);
    const { rerender } = renderHook(() => useMarketAlerts());
    await settle();
    await settle();
    expect(listServerSavedSearches).toHaveBeenCalledExactlyOnceWith('tok');
    expect(getMarketPrefs()).toMatchObject({
      savedSearchesImported: true,
      savedSearches: [
        { id: 'srv1', name: 'Server Shako', watching: true },
        { id: 'srv2', name: 'Bookmark', watching: false },
      ],
    });
    expect(written().at(-1)).toMatchObject({ savedSearchesImported: true });
    // The imported watch streams right away
    expect(openLiveSearchStream).toHaveBeenCalledWith(
      [watchQuery(filters('Harlequin Crest'))],
      expect.any(AbortSignal),
      'tok',
    );

    h.settings = { pd2Token: 'tok2' };
    rerender();
    await settle();
    expect(listServerSavedSearches).toHaveBeenCalledTimes(1);
  });

  it('a failed import keeps the local list and retries on the next sign-in', async () => {
    h.settings = { pd2Token: 'tok' };
    savedFile({ savedSearchesImported: false, savedSearches: [search('local', false)] });
    vi.mocked(listServerSavedSearches).mockRejectedValueOnce(new Error('offline'));
    const { rerender } = renderHook(() => useMarketAlerts());
    await settle();
    await settle();
    expect(getMarketPrefs()).toMatchObject({ savedSearchesImported: false, savedSearches: [{ id: 'local' }] });

    vi.mocked(listServerSavedSearches).mockResolvedValue([
      { id: 'srv1', name: 'srv1', filters: filters('srv1'), alert: false, createdAt: '2026-10-22T00:00:00Z' },
    ]);
    h.settings = { pd2Token: 'tok2' };
    rerender();
    await settle();
    await settle();
    expect(listServerSavedSearches).toHaveBeenLastCalledWith('tok2');
    expect(getMarketPrefs().savedSearches.map((s) => s.id)).toEqual(['srv1', 'local']);
    expect(getMarketPrefs().savedSearchesImported).toBe(true);
  });
});

describe('buy request responses on the stream', () => {
  const response = (id: string, createdAt: string): WtbResponse => ({
    id,
    requestId: 'req1',
    request: {
      id: 'req1',
      title: 'Rare Circlet',
      offer: { amount: 2, currency: 'HR', hr: 2 },
      status: 'open',
      buyer: { userId: 'me', name: 'me' },
      whisperTo: 'MeAcc',
    },
    seller: { userId: 'hammer', name: 'HammerTime', account: 'HammerAcc' },
    item: { name: 'Grim Visage', quality: 'Rare', baseCode: 'ci0' },
    met: [],
    channel: 'whisper',
    createdAt,
    dismissed: false,
  });
  const event = (r: ReturnType<typeof response>) => `event: wtb.response\ndata: ${JSON.stringify(r)}\n\n`;

  it('signed in, the stream runs without a watched search: each response toasts once, with the sound', async () => {
    h.settings = { pd2Token: 'tok', wtbResponsesSeenAt: '2026-10-21T07:00:00Z' };
    savedFile({ savedSearches: [] });
    const r = response('r1', '2026-10-21T08:05:00Z');
    vi.mocked(openLiveSearchStream).mockResolvedValue(stream(HELLO + event(r) + event(r)));
    renderHook(() => useMarketAlerts());
    await settle();
    await settle();
    expect(openLiveSearchStream).toHaveBeenCalledWith([], expect.any(AbortSignal), 'tok');
    const toasted = vi.mocked(notify).mock.calls.filter((call) => call[2].toast);
    expect(toasted).toHaveLength(1);
    expect(toasted[0][1]).toMatchObject({
      title: '🛒 A seller can fill your buy request',
      action: { data: { requestId: 'req1' } },
    });
    expect(toasted[0][2]).toEqual({ toast: true, groupKey: 'wtb:req1' });
    expect(playNotificationSound).toHaveBeenCalled();
    expect(h.updateSettings).toHaveBeenCalledWith({ wtbResponsesSeenAt: '2026-10-21T08:05:00Z' });
  });

  it('on (re)connect, responses that came while away go to the log as missed, never toasted', async () => {
    h.settings = { pd2Token: 'tok', wtbResponsesSeenAt: '2026-10-21T07:00:00Z' };
    savedFile({ savedSearches: [] });
    vi.mocked(listWtbResponses).mockResolvedValue({
      items: [response('new', '2026-10-21T07:30:00Z'), response('old', '2026-10-21T06:00:00Z')],
      nextCursor: null,
    });
    vi.mocked(openLiveSearchStream).mockResolvedValue(stream(HELLO));
    renderHook(() => useMarketAlerts());
    await settle();
    await settle();
    expect(listWtbResponses).toHaveBeenCalledWith('tok', { direction: 'received', limit: 20 });
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith('market', expect.anything(), { toast: false, groupKey: 'wtb:req1' });
    expect(showToast).not.toHaveBeenCalled();
  });
});
