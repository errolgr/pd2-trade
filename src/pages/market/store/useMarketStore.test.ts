import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { exists, readTextFile, writeTextFile } from '@/lib/browser-fs';
import { showToast } from '@/overlay';
import type { MarketFilters, SavedSearch } from '@/pages/market/lib/types';
import { listServerSavedSearches, type ServerSavedSearch } from '@/pages/market/alerts/market-api';
import type * as MarketApi from '@/pages/market/alerts/market-api';
import {
  defaultSearchName,
  EMPTY_MARKET_PREFS,
  getMarketPrefs,
  importServerSavedSearches,
  loadMarketPrefs,
  MARKET_PREFS_FILENAME,
  marketStoreActions as actions,
  MAX_SAVED_SEARCHES,
  MAX_WATCHED_SEARCHES,
  mergeServerSavedSearches,
  parseMarketPrefs,
  resetMarketPrefs,
} from './useMarketStore';

vi.mock('@/lib/browser-fs', () => ({
  BaseDirectory: { AppConfig: 13 },
  exists: vi.fn(async () => false),
  mkdir: vi.fn(async () => {}),
  readTextFile: vi.fn(),
  writeTextFile: vi.fn(async () => {}),
}));
vi.mock('@/overlay', () => ({ showToast: vi.fn() }));
vi.mock('@/pages/market/alerts/market-api', async (importOriginal) => ({
  ...(await importOriginal<typeof MarketApi>()),
  listServerSavedSearches: vi.fn(),
}));

const flush = () => vi.advanceTimersByTimeAsync(0);
const written = () =>
  vi
    .mocked(writeTextFile)
    .mock.calls.filter(([path]) => path === MARKET_PREFS_FILENAME)
    .map(([, text]) => JSON.parse(String(text)));

const filters = (itemName: string) => ({ source: 'live', itemName, stats: [] }) as unknown as MarketFilters;
const saved = (id: string, over: Partial<SavedSearch> = {}): SavedSearch => ({
  id,
  name: id.toUpperCase(),
  filters: filters(id),
  watching: false,
  createdAt: '2026-10-21T00:00:00Z',
  updatedAt: '2026-10-21T00:00:00Z',
  ...over,
});
const server = (id: string, over: Partial<ServerSavedSearch> = {}): ServerSavedSearch => ({
  id,
  name: id.toUpperCase(),
  filters: filters(id),
  alert: false,
  createdAt: '2026-10-21T00:00:00Z',
  ...over,
});

async function loadFrom(file: unknown) {
  vi.mocked(exists).mockResolvedValue(true);
  vi.mocked(readTextFile).mockResolvedValue(JSON.stringify(file));
  await loadMarketPrefs();
  await flush();
}

beforeEach(() => {
  vi.useFakeTimers();
  resetMarketPrefs();
  vi.mocked(writeTextFile).mockClear();
  vi.mocked(readTextFile).mockReset();
  vi.mocked(exists).mockResolvedValue(false);
  vi.mocked(showToast).mockClear();
  vi.mocked(listServerSavedSearches).mockReset();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('local preferences (market-prefs.json)', () => {
  it('falls back to the empty state on a broken file', () => {
    expect(parseMarketPrefs('{oops')).toEqual(EMPTY_MARKET_PREFS);
    expect(parseMarketPrefs('null')).toEqual(EMPTY_MARKET_PREFS);
  });

  it('shows cards unless the user picked rows', () => {
    expect(EMPTY_MARKET_PREFS.viewMode).toBe('cards');
    expect(parseMarketPrefs('{}').viewMode).toBe('cards');
    expect(parseMarketPrefs(JSON.stringify({ viewMode: 'bogus' })).viewMode).toBe('cards');
    expect(parseMarketPrefs(JSON.stringify({ viewMode: 'rows' })).viewMode).toBe('rows');
  });

  it('reads presets, last search, switches and saved searches (stat weights of old files are dropped)', () => {
    const prefs = parseMarketPrefs(
      JSON.stringify({
        savedSearches: [
          { id: 's1', name: 'Shako', filters: filters('Harlequin Crest'), alert: true, createdAt: 'x' },
          { id: 's2', name: 'broken' },
          {
            id: 's3',
            name: 'Spirit',
            filters: filters('Spirit'),
            watching: false,
            createdAt: 'a',
            updatedAt: 'b',
            lastSeenBumpedAt: '2026-10-21T08:00:00Z',
          },
        ],
        savedSearchesImported: true,
        userPresets: [{ id: 'p1', name: 'Mine', builtIn: true, stats: [{ kind: 'mod', key: 'item_fastercastrate' }] }],
        lastFilters: filters('Spirit'),
        statWeights: { item_fastercastrate: 2 },
        alertsEnabled: false,
        viewMode: 'cards',
      }),
    );
    // Files from before Watch was local say `alert`
    expect(prefs.savedSearches).toEqual([
      { id: 's1', name: 'Shako', filters: filters('Harlequin Crest'), watching: true, createdAt: 'x', updatedAt: 'x' },
      {
        id: 's3',
        name: 'Spirit',
        filters: filters('Spirit'),
        watching: false,
        createdAt: 'a',
        updatedAt: 'b',
        lastSeenBumpedAt: '2026-10-21T08:00:00Z',
      },
    ]);
    expect(prefs.savedSearchesImported).toBe(true);
    expect(prefs.userPresets).toMatchObject([{ id: 'p1', builtIn: false }]);
    expect(prefs).toMatchObject({ lastFilters: { itemName: 'Spirit' }, alertsEnabled: false, viewMode: 'cards' });
    expect(prefs).not.toHaveProperty('statWeights');
  });

  it('reads searches saved before corruption rows as corruption rows', () => {
    const legacy = { ...filters('c'), corruptions: ['item_numsockets'] };
    const [search] = parseMarketPrefs(
      JSON.stringify({ savedSearches: [{ id: 'c', name: 'c', filters: legacy, watching: false, createdAt: 'x' }] }),
    ).savedSearches;
    expect(search.filters).not.toHaveProperty('corruptions');
    expect(search.filters.stats).toMatchObject([{ kind: 'corruption', key: 'item_numsockets', enabled: true }]);
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

  it('remembers deleted built-in presets until they are restored, and the sections the user toggled', async () => {
    await loadFrom({ hiddenPresets: ['builtin-old'], sectionsOpen: { Price: true } });
    actions.hideBuiltInPreset('builtin-mf-gear');
    actions.hideBuiltInPreset('builtin-mf-gear');
    actions.setSectionOpen('Stats', false);
    await flush();
    expect(written().at(-1)).toMatchObject({
      hiddenPresets: ['builtin-old', 'builtin-mf-gear'],
      sectionsOpen: { Price: true, Stats: false },
    });
    actions.restoreBuiltInPresets();
    await flush();
    expect(getMarketPrefs().hiddenPresets).toEqual([]);
    // Malformed values fall back to the defaults
    expect(parseMarketPrefs(JSON.stringify({ hiddenPresets: 'x', sectionsOpen: { Price: 'yes' } }))).toMatchObject({
      hiddenPresets: [],
      sectionsOpen: {},
    });
  });
});

describe('saved searches (local)', () => {
  it('saves, renames, watches and deletes, writing each change to the file', async () => {
    await loadFrom({});
    const shako = actions.saveSearch(undefined, { ...filters('Harlequin Crest'), hardcore: false, ladder: true });
    expect(shako).toMatchObject({ name: 'Harlequin Crest · SC L', watching: false });
    const spirit = actions.saveSearch('  Spirit  ', filters('Spirit'), true)!;
    await flush();
    expect(written().at(-1).savedSearches).toMatchObject([
      { id: spirit.id, name: 'Spirit', watching: true },
      { id: shako!.id, watching: false },
    ]);

    actions.renameSearch(shako!.id, ' Cheap Shako ');
    expect(actions.setSearchWatching(shako!.id, true)).toBe(true);
    await flush();
    expect(written().at(-1).savedSearches[1]).toMatchObject({ name: 'Cheap Shako', watching: true });

    expect(actions.removeSearch(spirit.id)).toEqual(spirit);
    await flush();
    expect(written().at(-1).savedSearches.map((s: SavedSearch) => s.id)).toEqual([shako!.id]);
  });

  it('restores a deleted search where it was, watched again when the cap allows', async () => {
    await loadFrom({
      savedSearches: [saved('c', { createdAt: '2026-10-23T00:00:00Z' }), saved('b', { watching: true, createdAt: '2026-10-22T00:00:00Z' }), saved('a')],
    });
    const removed = actions.removeSearch('b')!;
    actions.restoreSearch(removed);
    expect(getMarketPrefs().savedSearches.map((s) => [s.id, s.watching])).toEqual([
      ['c', false],
      ['b', true],
      ['a', false],
    ]);
    // Twice is a no-op
    actions.restoreSearch(removed);
    expect(getMarketPrefs().savedSearches).toHaveLength(3);
  });

  it('refuses over the caps (25 saved, 10 watched), saying why', async () => {
    await loadFrom({
      savedSearches: Array.from({ length: MAX_WATCHED_SEARCHES }, (_, i) => saved(`w${i}`, { watching: true })),
    });
    expect(actions.saveSearch('more', filters('more'), true)).toBeNull();
    expect(showToast).toHaveBeenLastCalledWith(expect.objectContaining({ title: 'Too many watches' }));
    const plain = actions.saveSearch('plain', filters('plain'))!;
    expect(actions.setSearchWatching(plain.id, true)).toBe(false);

    for (let i = getMarketPrefs().savedSearches.length; i < MAX_SAVED_SEARCHES; i++) actions.saveSearch(`s${i}`, filters(`s${i}`));
    expect(actions.saveSearch('one too many', filters('x'))).toBeNull();
    expect(showToast).toHaveBeenLastCalledWith(expect.objectContaining({ title: 'Too many saved searches' }));
    expect(getMarketPrefs().savedSearches).toHaveLength(MAX_SAVED_SEARCHES);
  });

  it('keeps the newest bump a watch has seen', async () => {
    await loadFrom({ savedSearches: [saved('a', { watching: true })] });
    actions.markSearchSeen('a', '2026-10-21T08:10:00Z');
    actions.markSearchSeen('a', '2026-10-21T08:00:00Z');
    actions.markSearchSeen('a', 'not a date');
    await flush();
    expect(getMarketPrefs().savedSearches[0].lastSeenBumpedAt).toBe('2026-10-21T08:10:00Z');
    expect(written().at(-1).savedSearches[0].lastSeenBumpedAt).toBe('2026-10-21T08:10:00Z');
  });

  it('names a search from its filters when it has no name', () => {
    const base = { ...filters(''), hardcore: true, ladder: false, rarity: [] } as unknown as MarketFilters;
    expect(defaultSearchName(base)).toBe('Any item · HC NL');
    expect(defaultSearchName({ ...base, rarity: ['Runeword'], hrMax: 2, hrMaxExclusive: true })).toBe(
      'RW · < 2 HR · HC NL',
    );
    expect(defaultSearchName({ ...base, rarity: ['Unique'], baseCode: 'uap' })).toBe('Unique uap · HC NL');
  });
});

describe('import from pd2trader.com (deprecated saved searches)', () => {
  it('adds the server searches it does not have, within the caps', () => {
    const local = [saved('l1', { watching: true }), saved('dup', { name: 'Same', createdAt: '2026-10-25T00:00:00Z' })];
    const merged = mergeServerSavedSearches(local, [
      server('l1'),
      server('other-id', { name: 'Same', filters: filters('dup') }),
      server('n1', { alert: true, createdAt: '2026-10-24T00:00:00Z' }),
      server('n2', { name: '  ', createdAt: '2026-10-20T00:00:00Z' }),
    ]);
    expect(merged.map((s) => [s.id, s.name, s.watching])).toEqual([
      ['dup', 'Same', false],
      ['n1', 'N1', true],
      ['l1', 'L1', true],
      ['n2', 'n2 · SC NL', false],
    ]);

    const fullWatch = Array.from({ length: MAX_WATCHED_SEARCHES }, (_, i) => saved(`w${i}`, { watching: true }));
    expect(mergeServerSavedSearches(fullWatch, [server('x', { alert: true })]).find((s) => s.id === 'x')?.watching).toBe(
      false,
    );
    const full = Array.from({ length: MAX_SAVED_SEARCHES }, (_, i) => saved(`s${i}`));
    expect(mergeServerSavedSearches(full, [server('x')])).toHaveLength(MAX_SAVED_SEARCHES);
  });

  it('imports once: marks the file and never asks the server again', async () => {
    await loadFrom({ savedSearches: [saved('local')] });
    vi.mocked(listServerSavedSearches).mockResolvedValue([server('srv', { alert: true, createdAt: '2026-10-22T00:00:00Z' })]);
    await importServerSavedSearches('tok');
    await flush();
    expect(listServerSavedSearches).toHaveBeenCalledExactlyOnceWith('tok');
    expect(written().at(-1)).toMatchObject({
      savedSearchesImported: true,
      savedSearches: [{ id: 'srv', watching: true }, { id: 'local' }],
    });
    await importServerSavedSearches('tok2');
    expect(listServerSavedSearches).toHaveBeenCalledTimes(1);
  });

  it('leaves everything as it was when the server fails (retried by the next call), one import at a time', async () => {
    await loadFrom({ savedSearches: [saved('local')] });
    vi.mocked(listServerSavedSearches).mockRejectedValueOnce(new Error('offline'));
    await importServerSavedSearches('tok');
    expect(getMarketPrefs()).toMatchObject({ savedSearchesImported: false, savedSearches: [{ id: 'local' }] });
    expect(written()).toEqual([]);

    vi.mocked(listServerSavedSearches).mockResolvedValue([server('srv')]);
    const first = importServerSavedSearches('tok');
    expect(importServerSavedSearches('tok')).toBe(first);
    await first;
    expect(listServerSavedSearches).toHaveBeenCalledTimes(2);
    expect(getMarketPrefs().savedSearchesImported).toBe(true);
  });
});
