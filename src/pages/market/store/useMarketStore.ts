/**
 * The market browser's saved state: saved searches (with their live-alert toggle), the user's stat presets, the
 * last search and default stat weights (market-prefs.json in the app config dir; localStorage in a browser).
 *
 * A module-level store like `lib/chat-prefs.ts`: the market panel and the app-level alert poller
 * (`useMarketAlerts`) read and change the same state. Changes are saved right away, in order.
 */
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { z } from 'zod';
import { BaseDirectory, exists, mkdir, readTextFile, writeTextFile } from '@/lib/browser-fs';
import type { MarketFilters, SavedSearch, StatPreset } from '@/pages/market/lib/types';

export const MARKET_PREFS_FILENAME = 'market-prefs.json';
const PREFS_DIR = BaseDirectory.AppConfig;

/** Saved searches that may alert at once (each is polled every 15 s). */
export const MAX_ALERT_SEARCHES = 10;

export interface MarketPrefs {
  savedSearches: SavedSearch[];
  userPresets: StatPreset[];
  lastFilters: MarketFilters | null;
  /** Default weight per stat key for the stat-weighted sort. */
  statWeights: Record<string, number>;
  /** Master switch for saved-search alerts. */
  alertsEnabled: boolean;
  /** Results layout: compact rows (+ detail pane) or self-contained cards. */
  viewMode: MarketViewMode;
}

export type MarketViewMode = 'rows' | 'cards';

export const EMPTY_MARKET_PREFS: MarketPrefs = {
  savedSearches: [],
  userPresets: [],
  lastFilters: null,
  statWeights: {},
  alertsEnabled: true,
  viewMode: 'rows',
};

// Filters are stored as the panel built them; only the envelope is checked so a filter field added later
// doesn't throw away saved searches (the panel merges them over defaults).
const FiltersSchema = z.object({ stats: z.array(z.unknown()) }).passthrough();
const SavedSearchSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  filters: FiltersSchema,
  alert: z.boolean(),
  createdAt: z.string(),
});
const PresetSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  typeCodes: z.array(z.string()).optional(),
  rarity: z.array(z.string()).optional(),
  stats: z.array(z.object({ kind: z.enum(['mod', 'pseudo']), key: z.string() }).passthrough()),
});

function entries<S extends z.ZodTypeAny>(raw: unknown, schema: S): z.infer<S>[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((v) => {
    const parsed = schema.safeParse(v);
    return parsed.success ? [parsed.data] : [];
  });
}

/** Reads a saved file; malformed entries are skipped (a broken file yields the empty state). */
export function parseMarketPrefs(text: string): MarketPrefs {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return EMPTY_MARKET_PREFS;
  }
  if (!raw || typeof raw !== 'object') return EMPTY_MARKET_PREFS;
  const file = raw as Record<string, unknown>;
  const lastFilters = FiltersSchema.safeParse(file.lastFilters);
  const weights = z.record(z.string(), z.number()).safeParse(file.statWeights);
  let alerting = 0;
  return {
    savedSearches: entries(file.savedSearches, SavedSearchSchema).map((s) => {
      const alert = s.alert && alerting < MAX_ALERT_SEARCHES;
      if (alert) alerting++;
      return { id: s.id, name: s.name, filters: s.filters as unknown as MarketFilters, alert, createdAt: s.createdAt };
    }),
    userPresets: entries(file.userPresets, PresetSchema).map(
      (p) => ({ ...p, builtIn: false }) as unknown as StatPreset,
    ),
    lastFilters: lastFilters.success ? (lastFilters.data as unknown as MarketFilters) : null,
    statWeights: weights.success ? weights.data : {},
    alertsEnabled: file.alertsEnabled !== false,
    viewMode: file.viewMode === 'cards' ? 'cards' : 'rows',
  };
}

async function readPrefsFile(): Promise<MarketPrefs> {
  try {
    if (!(await exists(MARKET_PREFS_FILENAME, { baseDir: PREFS_DIR }))) return EMPTY_MARKET_PREFS;
    return parseMarketPrefs(await readTextFile(MARKET_PREFS_FILENAME, { baseDir: PREFS_DIR }));
  } catch (error) {
    console.warn('Failed to load market preferences:', error);
    return EMPTY_MARKET_PREFS;
  }
}

async function writePrefsFile(prefs: MarketPrefs): Promise<void> {
  try {
    if (!(await exists('', { baseDir: PREFS_DIR }))) await mkdir('', { baseDir: PREFS_DIR, recursive: true });
    await writeTextFile(MARKET_PREFS_FILENAME, JSON.stringify(prefs), { baseDir: PREFS_DIR });
  } catch (error) {
    console.error('Failed to save market preferences:', error);
  }
}

let current: MarketPrefs = EMPTY_MARKET_PREFS;
let loadState: 'idle' | 'loading' | 'loaded' = 'idle';
/** Changes made before the file was read, replayed over it. */
let early: ((prefs: MarketPrefs) => MarketPrefs)[] = [];
/** Writes in order, each with the then-current state. */
let writes: Promise<void> = Promise.resolve();
const listeners = new Set<() => void>();

function publish(next: MarketPrefs, persist: boolean) {
  current = next;
  if (persist) writes = writes.then(() => writePrefsFile(next));
  listeners.forEach((listener) => listener());
}

/** Reads market-prefs.json once (later calls do nothing). */
export function loadMarketPrefs(): void {
  if (loadState !== 'idle') return;
  loadState = 'loading';
  void readPrefsFile().then((saved) => {
    const changes = early;
    early = [];
    loadState = 'loaded';
    publish(
      changes.reduce((prefs, change) => change(prefs), saved),
      changes.length > 0,
    );
  });
}

/** The state right now (for callbacks; components use `useMarketStore`). */
export const getMarketPrefs = (): MarketPrefs => current;
export const isMarketPrefsLoaded = (): boolean => loadState === 'loaded';

/** Changes the state and saves it. */
export function changeMarketPrefs(change: (prefs: MarketPrefs) => MarketPrefs): void {
  const next = change(current);
  if (next === current) return;
  if (loadState !== 'loaded') early.push(change);
  publish(next, loadState === 'loaded');
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const alertingCount = (prefs: MarketPrefs) => prefs.savedSearches.filter((s) => s.alert).length;

const mapSearch = (id: string, change: (s: SavedSearch) => SavedSearch) =>
  changeMarketPrefs((prefs) => {
    const index = prefs.savedSearches.findIndex((s) => s.id === id);
    if (index < 0) return prefs;
    const savedSearches = [...prefs.savedSearches];
    savedSearches[index] = change(savedSearches[index]);
    return { ...prefs, savedSearches };
  });

/** Store actions; usable outside React (they read the current state). */
export const marketStoreActions = {
  /** Saves a new search; `alert` is dropped when MAX_ALERT_SEARCHES already alert. */
  saveSearch(name: string, filters: MarketFilters, alert = false): SavedSearch {
    const created: SavedSearch = {
      id: crypto.randomUUID(),
      name: name.trim() || 'Saved search',
      filters,
      alert: alert && alertingCount(current) < MAX_ALERT_SEARCHES,
      createdAt: new Date().toISOString(),
    };
    changeMarketPrefs((prefs) => ({ ...prefs, savedSearches: [...prefs.savedSearches, created] }));
    return created;
  },
  updateSearch(id: string, changes: Partial<Pick<SavedSearch, 'name' | 'filters'>>): void {
    mapSearch(id, (s) => ({ ...s, ...changes }));
  },
  renameSearch(id: string, name: string): void {
    const trimmed = name.trim();
    if (trimmed) mapSearch(id, (s) => ({ ...s, name: trimmed }));
  },
  /** Turns a search's alert on/off; false when turning on is refused (MAX_ALERT_SEARCHES reached). */
  setSearchAlert(id: string, alert: boolean): boolean {
    const search = current.savedSearches.find((s) => s.id === id);
    if (!search) return false;
    if (search.alert === alert) return true;
    if (alert && alertingCount(current) >= MAX_ALERT_SEARCHES) return false;
    mapSearch(id, (s) => ({ ...s, alert }));
    return true;
  },
  /** Deletes a search; returns it (for Undo via `restoreSearch`). */
  removeSearch(id: string): SavedSearch | null {
    const search = current.savedSearches.find((s) => s.id === id) ?? null;
    if (search) {
      changeMarketPrefs((prefs) => ({ ...prefs, savedSearches: prefs.savedSearches.filter((s) => s.id !== id) }));
    }
    return search;
  },
  restoreSearch(search: SavedSearch): void {
    changeMarketPrefs((prefs) =>
      prefs.savedSearches.some((s) => s.id === search.id)
        ? prefs
        : {
            ...prefs,
            savedSearches: [
              ...prefs.savedSearches,
              { ...search, alert: search.alert && alertingCount(prefs) < MAX_ALERT_SEARCHES },
            ],
          },
    );
  },
  addPreset(preset: Omit<StatPreset, 'id' | 'builtIn'>): StatPreset {
    const created: StatPreset = { ...preset, id: crypto.randomUUID(), builtIn: false };
    changeMarketPrefs((prefs) => ({ ...prefs, userPresets: [...prefs.userPresets, created] }));
    return created;
  },
  removePreset(id: string): void {
    changeMarketPrefs((prefs) =>
      prefs.userPresets.some((p) => p.id === id)
        ? { ...prefs, userPresets: prefs.userPresets.filter((p) => p.id !== id) }
        : prefs,
    );
  },
  /** The last search run (restored when the panel opens without a payload). Call on search, not per keystroke. */
  setLastFilters(filters: MarketFilters): void {
    changeMarketPrefs((prefs) =>
      JSON.stringify(prefs.lastFilters) === JSON.stringify(filters) ? prefs : { ...prefs, lastFilters: filters },
    );
  },
  /** undefined/0 removes the default weight. */
  setStatWeight(key: string, weight: number | undefined): void {
    changeMarketPrefs((prefs) => {
      const statWeights = { ...prefs.statWeights };
      if (weight) statWeights[key] = weight;
      else if (key in statWeights) delete statWeights[key];
      else return prefs;
      return { ...prefs, statWeights };
    });
  },
  setAlertsEnabled(on: boolean): void {
    changeMarketPrefs((prefs) => (prefs.alertsEnabled === on ? prefs : { ...prefs, alertsEnabled: on }));
  },
  setViewMode(viewMode: MarketViewMode): void {
    changeMarketPrefs((prefs) => (prefs.viewMode === viewMode ? prefs : { ...prefs, viewMode }));
  },
};

export type MarketStore = MarketPrefs & typeof marketStoreActions & { loaded: boolean };

/** The market state and its actions, re-rendering on every change; loads the saved file on first use. */
export function useMarketStore(): MarketStore {
  useEffect(loadMarketPrefs, []);
  const prefs = useSyncExternalStore(subscribe, getMarketPrefs);
  const loaded = useSyncExternalStore(subscribe, isMarketPrefsLoaded);
  return useMemo(() => ({ ...prefs, ...marketStoreActions, loaded }), [prefs, loaded]);
}

/** Tests: forget the in-memory state; the next load reads the file again. */
export function resetMarketPrefs(): void {
  current = EMPTY_MARKET_PREFS;
  loadState = 'idle';
  early = [];
  writes = Promise.resolve();
}
