/**
 * The market browser's state, shared by the market panel and the app-level watch stream (`useMarketAlerts`), all
 * kept in market-prefs.json (app config dir; localStorage in a browser): saved searches with their Watch toggle,
 * stat presets (and the built-in ones deleted), the last search, the alerts switch, the results layout and the
 * filter sections opened/closed.
 *
 * Saved searches were kept on pd2trader.com for a while (that API is deprecated): `importServerSavedSearches`
 * copies them here once, on the first sign-in after the update. Files from before then hold theirs under the
 * same `savedSearches` key (`alert` for `watching`).
 *
 * Module-level stores like `lib/chat-prefs.ts`; changes are saved right away, in order.
 */
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { z } from 'zod';
import { BaseDirectory, exists, mkdir, readTextFile, writeTextFile } from '@/lib/browser-fs';
import { showToast } from '@/overlay';
import { findTypeOption } from '@/pages/market/lib/catalog';
import { upgradeFilters } from '@/pages/market/lib/defaults';
import type { MarketFilters, SavedSearch, StatPreset } from '@/pages/market/lib/types';
import { watchKey } from '@/pages/market/alerts/alert-logic';
import { listServerSavedSearches, type ServerSavedSearch } from '@/pages/market/alerts/market-api';
import { t } from '@/i18n';

export const MARKET_PREFS_FILENAME = 'market-prefs.json';
const PREFS_DIR = BaseDirectory.AppConfig;

/** Saved searches kept at most. */
export const MAX_SAVED_SEARCHES = 25;
/** Searches watched at once: one live stream carries them all. */
export const MAX_WATCHED_SEARCHES = 10;
const MAX_NAME = 80;

export type MarketViewMode = 'rows' | 'cards';

/** Everything in market-prefs.json. */
export interface MarketPrefs {
  /** Newest first. */
  savedSearches: SavedSearch[];
  /** The deprecated pd2trader.com saved searches were imported (once; never asked for again). */
  savedSearchesImported: boolean;
  userPresets: StatPreset[];
  /** Built-in presets the user deleted (ids); "Restore default presets" clears it. */
  hiddenPresets: string[];
  lastFilters: MarketFilters | null;
  /** Master switch for Watch alerts (no stream, no popups when off). */
  alertsEnabled: boolean;
  /** Results layout: compact rows (+ detail pane) or self-contained cards. */
  viewMode: MarketViewMode;
  /** Filter sidebar sections the user opened or closed (by title); the rest use their default. */
  sectionsOpen: Record<string, boolean>;
}

export const EMPTY_MARKET_PREFS: MarketPrefs = {
  savedSearches: [],
  savedSearchesImported: false,
  userPresets: [],
  hiddenPresets: [],
  lastFilters: null,
  alertsEnabled: true,
  viewMode: 'cards',
  sectionsOpen: {},
};

// Filters are stored as the panel built them; only the envelope is checked so a filter field added later
// doesn't throw away saved searches (the panel merges them over defaults).
const FiltersSchema = z.object({ stats: z.array(z.unknown()) }).passthrough();
const SavedSearchSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  filters: FiltersSchema,
  watching: z.boolean().optional(),
  /** Files from before Watch was local. */
  alert: z.boolean().optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  lastSeenBumpedAt: z.string().optional(),
});
const PresetSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  typeCodes: z.array(z.string()).optional(),
  rarity: z.array(z.string()).optional(),
  stats: z.array(z.object({ kind: z.enum(['mod', 'pseudo', 'corruption']), key: z.string() }).passthrough()),
});
const HiddenPresetsSchema = z.array(z.string().max(100)).max(100);
const SectionsOpenSchema = z.record(z.string().max(40), z.boolean());

function entries<S extends z.ZodTypeAny>(raw: unknown, schema: S): z.infer<S>[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((v) => {
    const parsed = schema.safeParse(v);
    return parsed.success ? [parsed.data] : [];
  });
}

/** Stored filters may predate the current shape (legacy corruptions list, weights): read them as today's. */
const readFilters = (filters: unknown) => upgradeFilters(filters as MarketFilters);

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
  const hiddenPresets = HiddenPresetsSchema.safeParse(file.hiddenPresets);
  const sectionsOpen = SectionsOpenSchema.safeParse(file.sectionsOpen);
  return {
    savedSearches: entries(file.savedSearches, SavedSearchSchema).map((s) => ({
      id: s.id,
      name: s.name,
      filters: readFilters(s.filters),
      watching: s.watching ?? s.alert ?? false,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt ?? s.createdAt,
      ...(s.lastSeenBumpedAt ? { lastSeenBumpedAt: s.lastSeenBumpedAt } : {}),
    })),
    savedSearchesImported: file.savedSearchesImported === true,
    userPresets: entries(file.userPresets, PresetSchema).map(
      (p) => ({ ...p, builtIn: false }) as unknown as StatPreset,
    ),
    hiddenPresets: hiddenPresets.success ? hiddenPresets.data : [],
    lastFilters: lastFilters.success ? (lastFilters.data as unknown as MarketFilters) : null,
    alertsEnabled: file.alertsEnabled !== false,
    viewMode: file.viewMode === 'rows' ? 'rows' : 'cards',
    sectionsOpen: sectionsOpen.success ? sectionsOpen.data : {},
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

let local: MarketPrefs = EMPTY_MARKET_PREFS;
let loadState: 'idle' | 'loading' | 'loaded' = 'idle';
let loadPromise: Promise<void> | null = null;
/** Changes made before the file was read, replayed over it. */
let early: ((prefs: MarketPrefs) => MarketPrefs)[] = [];
/** Writes in order, each with the then-current state. */
let writes: Promise<void> = Promise.resolve();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

function publishLocal(next: MarketPrefs, persist: boolean) {
  local = next;
  if (persist) writes = writes.then(() => writePrefsFile(next));
  notify();
}

/** Reads market-prefs.json once (later calls return the same promise). */
export function loadMarketPrefs(): Promise<void> {
  if (loadPromise) return loadPromise;
  loadState = 'loading';
  loadPromise = readPrefsFile().then((saved) => {
    const changes = early;
    early = [];
    loadState = 'loaded';
    publishLocal(
      changes.reduce((prefs, change) => change(prefs), saved),
      changes.length > 0,
    );
  });
  return loadPromise;
}

/** Changes the preferences and saves them. */
export function changeMarketPrefs(change: (prefs: MarketPrefs) => MarketPrefs): void {
  const next = change(local);
  if (next === local) return;
  if (loadState !== 'loaded') early.push(change);
  publishLocal(next, loadState === 'loaded');
}

// ---- saved searches ----

const RARITY_SHORT: Record<string, string> = { Runeword: 'RW' };

/** Readable default name, e.g. `Harlequin Crest · SC L`, `Rare Bows · ≤ 2 HR · HC NL`. */
export function defaultSearchName(f: MarketFilters): string {
  const what =
    f.itemName?.trim() ||
    [
      (f.rarity ?? []).map((r) => RARITY_SHORT[r] ?? r).join('/'),
      f.baseCode ?? (f.typeCode && (findTypeOption(f.typeCode)?.label ?? f.typeCode)),
    ]
      .filter(Boolean)
      .join(' ') ||
    t('market:store.anyItem');
  const parts = [what];
  if (f.hrMax !== undefined) parts.push(`${f.hrMaxExclusive ? '<' : '≤'} ${f.hrMax} HR`);
  parts.push(`${f.hardcore ? 'HC' : 'SC'} ${f.ladder ? 'L' : 'NL'}`);
  return parts.join(' · ').slice(0, MAX_NAME);
}

const watchingCount = (searches: readonly SavedSearch[]) => searches.filter((s) => s.watching).length;
const newestFirst = (a: { createdAt: string }, b: { createdAt: string }) =>
  Date.parse(b.createdAt) - Date.parse(a.createdAt);

/**
 * `local` plus the server's saved searches it doesn't have yet (by id, or by name and filters), within the caps:
 * past the saved cap the rest are left out, past the watch cap they come without Watch.
 */
export function mergeServerSavedSearches(
  local: readonly SavedSearch[],
  server: readonly ServerSavedSearch[],
): SavedSearch[] {
  const merged = [...local];
  for (const item of [...server].sort(newestFirst)) {
    if (merged.length >= MAX_SAVED_SEARCHES) break;
    if (!item?.id || !item.filters || typeof item.name !== 'string') continue;
    const search: SavedSearch = {
      id: item.id,
      name: item.name.trim().slice(0, MAX_NAME) || defaultSearchName(item.filters),
      filters: readFilters(item.filters),
      watching: item.alert === true && watchingCount(merged) < MAX_WATCHED_SEARCHES,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt ?? item.createdAt,
    };
    const key = watchKey(search.filters);
    if (merged.some((s) => s.id === search.id || (s.name === search.name && watchKey(s.filters) === key))) continue;
    merged.push(search);
  }
  return merged.sort(newestFirst);
}

/** One import at a time: a second sign-in while one runs waits for it. */
let importing: Promise<void> | null = null;

/**
 * Copies the user's saved searches from pd2trader.com (deprecated API) into the local list, once: after a
 * successful import the server is never asked again. A failure is only logged; the next sign-in or start retries.
 */
export function importServerSavedSearches(token: string): Promise<void> {
  importing ??= (async () => {
    try {
      await loadMarketPrefs();
      if (local.savedSearchesImported) return;
      const items = await listServerSavedSearches(token);
      changeMarketPrefs((prefs) => ({
        ...prefs,
        savedSearches: mergeServerSavedSearches(prefs.savedSearches, items),
        savedSearchesImported: true,
      }));
    } catch (error) {
      console.warn('[market] importing saved searches from pd2trader.com failed; retrying on the next sign-in:', error);
    } finally {
      importing = null;
    }
  })();
  return importing;
}

const setSearches = (change: (searches: SavedSearch[]) => SavedSearch[]) =>
  changeMarketPrefs((prefs) => {
    const savedSearches = change(prefs.savedSearches);
    return savedSearches === prefs.savedSearches ? prefs : { ...prefs, savedSearches };
  });

const editSearch = (id: string, change: (search: SavedSearch) => SavedSearch) =>
  setSearches((searches) =>
    searches.some((s) => s.id === id) ? searches.map((s) => (s.id === id ? change(s) : s)) : searches,
  );

function toastSearchCap(): void {
  showToast({
    title: t('market:store.tooManySearches'),
    description: t('market:store.capSearches', { count: MAX_SAVED_SEARCHES }),
    variant: 'warning',
  });
}

function toastWatchCap(): void {
  showToast({
    title: t('market:watch.tooManyTitle'),
    description: t('market:watch.tooManyDescription', { count: MAX_WATCHED_SEARCHES }),
    variant: 'warning',
  });
}

/** Store actions; usable outside React (they read the current state). */
export const marketStoreActions = {
  /**
   * Saves a search (`name` omitted: a readable default). Returns it, or null over a cap (a toast says why).
   */
  saveSearch(name: string | undefined, filters: MarketFilters, watching = false): SavedSearch | null {
    if (local.savedSearches.length >= MAX_SAVED_SEARCHES) {
      toastSearchCap();
      return null;
    }
    if (watching && watchingCount(local.savedSearches) >= MAX_WATCHED_SEARCHES) {
      toastWatchCap();
      return null;
    }
    const now = new Date().toISOString();
    const search: SavedSearch = {
      id: crypto.randomUUID(),
      name: name?.trim().slice(0, MAX_NAME) || defaultSearchName(filters),
      filters,
      watching,
      createdAt: now,
      updatedAt: now,
    };
    setSearches((searches) => [search, ...searches]);
    return search;
  },
  renameSearch(id: string, name: string): void {
    const trimmed = name.trim().slice(0, MAX_NAME);
    if (!trimmed) return;
    editSearch(id, (s) => (s.name === trimmed ? s : { ...s, name: trimmed, updatedAt: new Date().toISOString() }));
  },
  /** Turns a search's Watch on/off; false when refused (watch cap: the caller says so). */
  setSearchWatching(id: string, watching: boolean): boolean {
    const search = local.savedSearches.find((s) => s.id === id);
    if (!search) return false;
    if (search.watching === watching) return true;
    if (watching && watchingCount(local.savedSearches) >= MAX_WATCHED_SEARCHES) return false;
    editSearch(id, (s) => ({ ...s, watching, updatedAt: new Date().toISOString() }));
    return true;
  },
  /** A watch saw a listing bumped at `bumpedAt` (kept when newer than the newest it saw). */
  markSearchSeen(id: string, bumpedAt: string): void {
    const at = Date.parse(bumpedAt);
    if (Number.isNaN(at)) return;
    editSearch(id, (s) =>
      s.lastSeenBumpedAt && Date.parse(s.lastSeenBumpedAt) >= at ? s : { ...s, lastSeenBumpedAt: bumpedAt },
    );
  },
  /** Deletes a search; returns it (for Undo via `restoreSearch`). */
  removeSearch(id: string): SavedSearch | null {
    const search = local.savedSearches.find((s) => s.id === id) ?? null;
    if (search) setSearches((searches) => searches.filter((s) => s.id !== id));
    return search;
  },
  /** Puts a deleted search back (Undo), watched again when the watch cap allows. */
  restoreSearch(search: SavedSearch): void {
    const searches = local.savedSearches;
    if (searches.some((s) => s.id === search.id)) return;
    if (searches.length >= MAX_SAVED_SEARCHES) {
      toastSearchCap();
      return;
    }
    const watching = search.watching && watchingCount(searches) < MAX_WATCHED_SEARCHES;
    setSearches((current) => [...current, { ...search, watching }].sort(newestFirst));
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
  /** Deletes a built-in preset (remembered; `restoreBuiltInPresets` brings them back). */
  hideBuiltInPreset(id: string): void {
    changeMarketPrefs((prefs) =>
      prefs.hiddenPresets.includes(id) ? prefs : { ...prefs, hiddenPresets: [...prefs.hiddenPresets, id] },
    );
  },
  restoreBuiltInPresets(): void {
    changeMarketPrefs((prefs) => (prefs.hiddenPresets.length ? { ...prefs, hiddenPresets: [] } : prefs));
  },
  /** Remembers a filter section the user opened or closed. */
  setSectionOpen(title: string, open: boolean): void {
    changeMarketPrefs((prefs) =>
      prefs.sectionsOpen[title] === open ? prefs : { ...prefs, sectionsOpen: { ...prefs.sectionsOpen, [title]: open } },
    );
  },
  /** The last search run (restored when the panel opens without a payload). Call on search, not per keystroke. */
  setLastFilters(filters: MarketFilters): void {
    changeMarketPrefs((prefs) =>
      JSON.stringify(prefs.lastFilters) === JSON.stringify(filters) ? prefs : { ...prefs, lastFilters: filters },
    );
  },
  setAlertsEnabled(on: boolean): void {
    changeMarketPrefs((prefs) => (prefs.alertsEnabled === on ? prefs : { ...prefs, alertsEnabled: on }));
  },
  setViewMode(viewMode: MarketViewMode): void {
    changeMarketPrefs((prefs) => (prefs.viewMode === viewMode ? prefs : { ...prefs, viewMode }));
  },
};

/** The state right now (for callbacks; components use `useMarketStore`). */
export const getMarketPrefs = (): MarketPrefs => local;
export const isMarketPrefsLoaded = (): boolean => loadState === 'loaded';

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export type MarketStore = MarketPrefs & typeof marketStoreActions & { loaded: boolean };

/** The market state and its actions, re-rendering on every change; loads the saved file on first use. */
export function useMarketStore(): MarketStore {
  useEffect(() => {
    void loadMarketPrefs();
  }, []);
  const prefs = useSyncExternalStore(subscribe, () => local);
  const loaded = useSyncExternalStore(subscribe, isMarketPrefsLoaded);
  return useMemo(() => ({ ...prefs, ...marketStoreActions, loaded }), [prefs, loaded]);
}

/** Tests: forget the in-memory state; the next load reads the file again. */
export function resetMarketPrefs(): void {
  local = EMPTY_MARKET_PREFS;
  importing = null;
  loadState = 'idle';
  loadPromise = null;
  early = [];
  writes = Promise.resolve();
}
