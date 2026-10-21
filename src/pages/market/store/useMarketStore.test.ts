import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { exists, readTextFile, writeTextFile } from '@/lib/browser-fs';
import { showToast } from '@/overlay';
import type { MarketFilters, SavedSearch } from '@/pages/market/lib/types';
import {
  createSavedSearch,
  deleteSavedSearch,
  listSavedSearches,
  SavedSearchApiError,
  updateSavedSearch,
} from '@/pages/market/alerts/saved-search-api';
import type * as SavedSearchApi from '@/pages/market/alerts/saved-search-api';
import {
  EMPTY_LOCAL_PREFS,
  getMarketPrefs,
  isPendingSearch,
  loadMarketPrefs,
  MARKET_PREFS_FILENAME,
  marketStoreActions as actions,
  parseMarketPrefs,
  resetMarketPrefs,
  syncSavedSearches,
  uploadLegacySearches,
} from './useMarketStore';

vi.mock('@/lib/browser-fs', () => ({
  BaseDirectory: { AppConfig: 13 },
  exists: vi.fn(async () => false),
  mkdir: vi.fn(async () => {}),
  readTextFile: vi.fn(),
  writeTextFile: vi.fn(async () => {}),
}));
vi.mock('@/overlay', () => ({ showToast: vi.fn() }));
vi.mock('@/pages/market/alerts/saved-search-api', async (importOriginal) => ({
  ...(await importOriginal<typeof SavedSearchApi>()),
  listSavedSearches: vi.fn(),
  createSavedSearch: vi.fn(),
  updateSavedSearch: vi.fn(),
  deleteSavedSearch: vi.fn(),
}));

const flush = () => vi.advanceTimersByTimeAsync(0);
const written = () =>
  vi
    .mocked(writeTextFile)
    .mock.calls.filter(([path]) => path === MARKET_PREFS_FILENAME)
    .map(([, text]) => JSON.parse(String(text)));

const filters = (itemName: string) => ({ source: 'live', itemName, stats: [] }) as unknown as MarketFilters;
const server = (id: string, over: Partial<SavedSearch> = {}): SavedSearch => ({
  id,
  name: id.toUpperCase(),
  filters: filters(id),
  alert: false,
  createdAt: '2026-10-21T00:00:00Z',
  ...over,
});
const LIMITS = { maxSearches: 25, maxAlerting: 10 };
const api409 = () => new SavedSearchApiError('Alert limit reached (10)', 409);

async function loadFrom(file: unknown) {
  vi.mocked(exists).mockResolvedValue(true);
  vi.mocked(readTextFile).mockResolvedValue(JSON.stringify(file));
  await loadMarketPrefs();
  await flush();
}

async function signIn(items: SavedSearch[] = []) {
  vi.mocked(listSavedSearches).mockResolvedValue({ items, limits: LIMITS });
  syncSavedSearches('tok');
  await flush();
}

beforeEach(() => {
  vi.useFakeTimers();
  resetMarketPrefs();
  vi.mocked(writeTextFile).mockClear();
  vi.mocked(readTextFile).mockReset();
  vi.mocked(exists).mockResolvedValue(false);
  vi.mocked(showToast).mockClear();
  vi.mocked(listSavedSearches).mockReset();
  vi.mocked(createSavedSearch).mockReset();
  vi.mocked(updateSavedSearch).mockReset();
  vi.mocked(deleteSavedSearch).mockReset();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('local preferences (market-prefs.json)', () => {
  it('falls back to the empty state on a broken file', () => {
    expect(parseMarketPrefs('{oops')).toEqual(EMPTY_LOCAL_PREFS);
    expect(parseMarketPrefs('null')).toEqual(EMPTY_LOCAL_PREFS);
  });

  it('reads presets, last search, switches and the legacy saved searches (stat weights of old files are dropped)', () => {
    const prefs = parseMarketPrefs(
      JSON.stringify({
        savedSearches: [
          { id: 's1', name: 'Shako', filters: filters('Harlequin Crest'), alert: true, createdAt: 'x' },
          { id: 's2', name: 'broken' },
        ],
        userPresets: [{ id: 'p1', name: 'Mine', builtIn: true, stats: [{ kind: 'mod', key: 'item_fastercastrate' }] }],
        lastFilters: filters('Spirit'),
        statWeights: { item_fastercastrate: 2 },
        alertsEnabled: false,
        viewMode: 'cards',
      }),
    );
    expect(prefs.legacySavedSearches.map((s) => s.id)).toEqual(['s1']);
    expect(prefs.userPresets).toMatchObject([{ id: 'p1', builtIn: false }]);
    expect(prefs).toMatchObject({ lastFilters: { itemName: 'Spirit' }, alertsEnabled: false, viewMode: 'cards' });
    expect(prefs).not.toHaveProperty('statWeights');
  });

  it('replays changes made before the file was read over it', async () => {
    vi.mocked(exists).mockResolvedValue(true);
    vi.mocked(readTextFile).mockResolvedValue(JSON.stringify({ viewMode: 'cards' }));
    void loadMarketPrefs();
    actions.setAlertsEnabled(false);
    await flush();
    expect(getMarketPrefs()).toMatchObject({ alertsEnabled: false, viewMode: 'cards' });
    expect(written().at(-1)).toMatchObject({ alertsEnabled: false, viewMode: 'cards' });
  });

  it('keeps user presets and the last search', async () => {
    await loadFrom({});
    const preset = actions.addPreset({
      name: 'Caster',
      stats: [{ kind: 'mod', key: 'item_fastercastrate', enabled: true }],
    });
    actions.setLastFilters(filters('Spirit'));
    await flush();
    expect(written().at(-1)).toMatchObject({
      userPresets: [{ id: preset.id, name: 'Caster' }],
      lastFilters: { itemName: 'Spirit' },
      savedSearches: [],
    });
  });
});

describe('server saved searches', () => {
  it('lists them on sign-in and clears them on sign-out', async () => {
    await loadFrom({});
    expect(getMarketPrefs().syncStatus).toBe('signedOut');
    await signIn([server('a'), server('b')]);
    expect(getMarketPrefs()).toMatchObject({ syncStatus: 'ready', limits: LIMITS });
    expect(getMarketPrefs().savedSearches.map((s) => s.id)).toEqual(['a', 'b']);

    syncSavedSearches(null);
    expect(getMarketPrefs()).toMatchObject({ syncStatus: 'signedOut', savedSearches: [] });
  });

  it('marks a failed list as error and retries it on the next sync', async () => {
    await loadFrom({});
    vi.mocked(listSavedSearches).mockRejectedValueOnce(new Error('offline'));
    syncSavedSearches('tok');
    await flush();
    expect(getMarketPrefs().syncStatus).toBe('error');
    await signIn([server('a')]);
    expect(getMarketPrefs().syncStatus).toBe('ready');
  });

  it('shows a new search right away and swaps in the server copy', async () => {
    await loadFrom({});
    await signIn([server('a')]);
    let resolve!: (s: SavedSearch) => void;
    vi.mocked(createSavedSearch).mockReturnValue(new Promise((r) => (resolve = r)));
    const pending = actions.saveSearch(undefined, filters('x'), true)!;
    expect(isPendingSearch(pending)).toBe(true);
    expect(createSavedSearch).toHaveBeenCalledWith('tok', { name: undefined, filters: filters('x'), alert: true });
    expect(getMarketPrefs().savedSearches.map((s) => s.id)).toEqual([pending.id, 'a']);

    resolve(server('x', { alert: true, name: 'Harlequin Crest · SC Ladder' }));
    await flush();
    expect(getMarketPrefs().savedSearches.map((s) => s.id)).toEqual(['x', 'a']);
  });

  it('rolls back a refused create and toasts why', async () => {
    await loadFrom({});
    await signIn();
    vi.mocked(createSavedSearch).mockRejectedValue(api409());
    actions.saveSearch('Mine', filters('x'), true);
    await flush();
    expect(getMarketPrefs().savedSearches).toEqual([]);
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Limit reached', description: 'Alert limit reached (10)', variant: 'error' }),
    );
  });

  it('refuses locally over the caps and when signed out', async () => {
    await loadFrom({});
    expect(actions.saveSearch('x', filters('x'))).toBeNull();
    expect(createSavedSearch).not.toHaveBeenCalled();

    await signIn(Array.from({ length: 10 }, (_, i) => server(`s${i}`, { alert: true })));
    expect(actions.saveSearch('x', filters('x'), true)).toBeNull();
    vi.mocked(updateSavedSearch).mockResolvedValue(server('s0'));
    expect(actions.setSearchAlert('s0', false)).toBe(true);
    expect(actions.setSearchAlert('s0', true)).toBe(true);
  });

  it('toggles the alert optimistically and restores it when the server refuses', async () => {
    await loadFrom({});
    await signIn([server('a')]);
    vi.mocked(updateSavedSearch).mockRejectedValue(api409());
    expect(actions.setSearchAlert('a', true)).toBe(true);
    expect(getMarketPrefs().savedSearches[0].alert).toBe(true);
    await flush();
    expect(updateSavedSearch).toHaveBeenCalledWith('tok', 'a', { alert: true });
    expect(getMarketPrefs().savedSearches[0].alert).toBe(false);
    expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'error' }));
  });

  it('renames, deletes and restores (Undo saves it again)', async () => {
    await loadFrom({});
    await signIn([server('a'), server('b')]);
    vi.mocked(updateSavedSearch).mockResolvedValue(server('a', { name: 'B' }));
    actions.renameSearch('a', '  B ');
    actions.renameSearch('a', '   ');
    expect(updateSavedSearch).toHaveBeenCalledTimes(1);
    await flush();
    expect(getMarketPrefs().savedSearches[0].name).toBe('B');

    vi.mocked(deleteSavedSearch).mockResolvedValue({ deleted: true, id: 'a' });
    const removed = actions.removeSearch('a')!;
    expect(getMarketPrefs().savedSearches.map((s) => s.id)).toEqual(['b']);
    vi.mocked(createSavedSearch).mockResolvedValue(server('a2', { name: 'B' }));
    actions.restoreSearch(removed);
    await flush();
    expect(createSavedSearch).toHaveBeenLastCalledWith('tok', { name: 'B', filters: removed.filters, alert: false });
    expect(getMarketPrefs().savedSearches.map((s) => s.id)).toEqual(['a2', 'b']);
  });

  it('puts a search back when its delete fails', async () => {
    await loadFrom({});
    await signIn([server('a'), server('b')]);
    vi.mocked(deleteSavedSearch).mockRejectedValue(new Error('offline'));
    actions.removeSearch('b');
    await flush();
    expect(getMarketPrefs().savedSearches.map((s) => s.id)).toEqual(['a', 'b']);
  });

  it('ignores answers meant for an earlier sign-in', async () => {
    await loadFrom({});
    await signIn([server('a')]);
    let resolve!: (s: SavedSearch) => void;
    vi.mocked(createSavedSearch).mockReturnValue(new Promise((r) => (resolve = r)));
    actions.saveSearch('x', filters('x'));
    syncSavedSearches(null);
    resolve(server('x'));
    await flush();
    expect(getMarketPrefs().savedSearches).toEqual([]);
  });
});

describe('migration of local saved searches', () => {
  const legacy = (id: string, createdAt: string, alert = false): SavedSearch => ({
    id,
    name: id,
    filters: filters(id),
    alert,
    createdAt,
  });

  it('uploads them oldest first on sign-in, then drops them from the file', async () => {
    await loadFrom({
      savedSearches: [legacy('new', '2026-10-21T02:00:00Z', true), legacy('old', '2026-10-21T01:00:00Z')],
      viewMode: 'cards',
    });
    vi.mocked(createSavedSearch).mockImplementation(async (_t, body) => server(body.name!));
    await signIn([server('old'), server('new')]);

    expect(vi.mocked(createSavedSearch).mock.calls.map(([, body]) => [body.name, body.alert])).toEqual([
      ['old', false],
      ['new', true],
    ]);
    expect(getMarketPrefs().legacySavedSearches).toEqual([]);
    expect(written().at(-1)).toMatchObject({ savedSearches: [], viewMode: 'cards' });
    expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'success' }));

    // Uploaded once: the next sign-in does not upload again
    vi.mocked(createSavedSearch).mockClear();
    syncSavedSearches(null);
    await signIn();
    expect(createSavedSearch).not.toHaveBeenCalled();
  });

  it('keeps an alert over the cap as a plain search, drops invalid ones and the rest past the search cap', async () => {
    const create = vi
      .fn()
      .mockRejectedValueOnce(api409()) // a: alert over the cap
      .mockResolvedValueOnce({}) // a again, without the alert
      .mockRejectedValueOnce(new SavedSearchApiError('filters.stats[0].key is invalid', 400)) // b
      .mockRejectedValueOnce(new SavedSearchApiError('Saved-search limit reached (25)', 409)); // c
    const result = await uploadLegacySearches(
      [
        legacy('a', '2026-10-21T01:00:00Z', true),
        legacy('b', '2026-10-21T02:00:00Z'),
        legacy('c', '2026-10-21T03:00:00Z'),
        legacy('d', '2026-10-21T04:00:00Z'),
      ],
      { create },
    );
    expect(create.mock.calls[1][0]).toMatchObject({ name: 'a', alert: false });
    expect(result).toEqual({ remaining: [], uploaded: 1, dropped: 3 });
  });

  it('keeps the rest for next time when the server is unreachable', async () => {
    const create = vi.fn().mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('offline'));
    const b = legacy('b', '2026-10-21T02:00:00Z');
    const result = await uploadLegacySearches([legacy('a', '2026-10-21T01:00:00Z'), b], { create });
    expect(result).toEqual({ remaining: [b], uploaded: 1, dropped: 0 });
  });
});
