import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { exists, readTextFile, writeTextFile } from '@/lib/browser-fs';
import type { MarketFilters } from '@/pages/market/lib/types';
import {
  EMPTY_MARKET_PREFS,
  getMarketPrefs,
  loadMarketPrefs,
  MARKET_PREFS_FILENAME,
  marketStoreActions as actions,
  MAX_ALERT_SEARCHES,
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

const flush = () => vi.advanceTimersByTimeAsync(0);
const written = () =>
  vi
    .mocked(writeTextFile)
    .mock.calls.filter(([path]) => path === MARKET_PREFS_FILENAME)
    .map(([, text]) => JSON.parse(String(text)));

const filters = (itemName: string) => ({ source: 'live', itemName, stats: [] }) as unknown as MarketFilters;

async function loadFrom(file: unknown) {
  vi.mocked(exists).mockResolvedValue(true);
  vi.mocked(readTextFile).mockResolvedValue(JSON.stringify(file));
  loadMarketPrefs();
  await flush();
}

beforeEach(() => {
  vi.useFakeTimers();
  resetMarketPrefs();
  vi.mocked(writeTextFile).mockClear();
  vi.mocked(readTextFile).mockReset();
  vi.mocked(exists).mockResolvedValue(false);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('parseMarketPrefs', () => {
  it('falls back to the empty state on a broken file', () => {
    expect(parseMarketPrefs('{oops')).toEqual(EMPTY_MARKET_PREFS);
    expect(parseMarketPrefs('null')).toEqual(EMPTY_MARKET_PREFS);
  });

  it('skips malformed entries and keeps the rest', () => {
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
      }),
    );
    expect(prefs.savedSearches.map((s) => s.id)).toEqual(['s1']);
    expect(prefs.userPresets).toMatchObject([{ id: 'p1', builtIn: false }]);
    expect(prefs.lastFilters?.itemName).toBe('Spirit');
    expect(prefs.statWeights).toEqual({ item_fastercastrate: 2 });
    expect(prefs.alertsEnabled).toBe(false);
  });

  it('turns off alerts beyond the cap', () => {
    const savedSearches = Array.from({ length: 12 }, (_, i) => ({
      id: `s${i}`,
      name: `S${i}`,
      filters: filters('x'),
      alert: true,
      createdAt: 'x',
    }));
    const prefs = parseMarketPrefs(JSON.stringify({ savedSearches }));
    expect(prefs.savedSearches.filter((s) => s.alert)).toHaveLength(MAX_ALERT_SEARCHES);
  });
});

describe('market store', () => {
  it('saves searches to market-prefs.json and restores them on the next launch', async () => {
    await loadFrom({});
    const saved = actions.saveSearch('  Shako  ', filters('Harlequin Crest'), true);
    await flush();
    expect(saved).toMatchObject({ name: 'Shako', alert: true });
    const file = written().at(-1);
    expect(file.savedSearches).toEqual([saved]);

    resetMarketPrefs();
    await loadFrom(file);
    expect(getMarketPrefs().savedSearches).toEqual([saved]);
  });

  it('replays changes made before the file was read over it', async () => {
    vi.mocked(exists).mockResolvedValue(true);
    vi.mocked(readTextFile).mockResolvedValue(
      JSON.stringify({ savedSearches: [{ id: 'a', name: 'A', filters: filters('a'), alert: false, createdAt: 'x' }] }),
    );
    loadMarketPrefs();
    actions.setAlertsEnabled(false);
    await flush();
    expect(getMarketPrefs()).toMatchObject({ alertsEnabled: false, savedSearches: [{ id: 'a' }] });
    expect(written().at(-1)).toMatchObject({ alertsEnabled: false });
  });

  it('persists the results view mode, defaulting to rows', async () => {
    expect(parseMarketPrefs('{}').viewMode).toBe('rows');
    expect(parseMarketPrefs(JSON.stringify({ viewMode: 'grid' })).viewMode).toBe('rows');
    expect(parseMarketPrefs(JSON.stringify({ viewMode: 'cards' })).viewMode).toBe('cards');
    await loadFrom({});
    actions.setViewMode('cards');
    await flush();
    expect(getMarketPrefs().viewMode).toBe('cards');
    expect(written().at(-1)).toMatchObject({ viewMode: 'cards' });
  });

  it('refuses an alert beyond the cap', async () => {
    await loadFrom({});
    const ids = Array.from({ length: MAX_ALERT_SEARCHES + 1 }, (_, i) => actions.saveSearch(`S${i}`, filters('x')).id);
    ids.slice(0, MAX_ALERT_SEARCHES).forEach((id) => expect(actions.setSearchAlert(id, true)).toBe(true));
    expect(actions.setSearchAlert(ids[MAX_ALERT_SEARCHES], true)).toBe(false);
    expect(actions.saveSearch('extra', filters('x'), true).alert).toBe(false);
    actions.setSearchAlert(ids[0], false);
    expect(actions.setSearchAlert(ids[MAX_ALERT_SEARCHES], true)).toBe(true);
  });

  it('renames, updates, removes and restores searches', async () => {
    await loadFrom({});
    const s = actions.saveSearch('A', filters('a'));
    actions.renameSearch(s.id, '  B ');
    actions.renameSearch(s.id, '   ');
    actions.updateSearch(s.id, { filters: filters('b') });
    expect(getMarketPrefs().savedSearches[0]).toMatchObject({ name: 'B', filters: { itemName: 'b' } });
    const removed = actions.removeSearch(s.id);
    expect(getMarketPrefs().savedSearches).toEqual([]);
    actions.restoreSearch(removed!);
    expect(getMarketPrefs().savedSearches.map((x) => x.id)).toEqual([s.id]);
  });

  it('keeps user presets, stat weights and the last search', async () => {
    await loadFrom({});
    const preset = actions.addPreset({
      name: 'Caster',
      stats: [{ kind: 'mod', key: 'item_fastercastrate', enabled: true }],
    });
    expect(preset.builtIn).toBe(false);
    actions.setStatWeight('item_fastercastrate', 2);
    actions.setLastFilters(filters('Spirit'));
    await flush();
    expect(written().at(-1)).toMatchObject({
      userPresets: [{ id: preset.id, name: 'Caster' }],
      statWeights: { item_fastercastrate: 2 },
      lastFilters: { itemName: 'Spirit' },
    });
    const writes = written().length;
    actions.setLastFilters(filters('Spirit'));
    await flush();
    expect(written()).toHaveLength(writes);

    actions.removePreset(preset.id);
    actions.setStatWeight('item_fastercastrate', undefined);
    expect(getMarketPrefs()).toMatchObject({ userPresets: [], statWeights: {} });
  });
});
