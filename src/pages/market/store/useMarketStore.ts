/**
 * The market browser's state, shared by the market panel and the app-level alert stream (`useMarketAlerts`):
 *
 * - **Saved searches** (with their Watch / alert toggle) live on pd2trader.com (`/api/market/saved-searches`,
 *   `alerts/saved-search-api.ts`), per PD2 user. `syncSavedSearches(token)` lists them on sign-in; edits apply
 *   optimistically and roll back (with a toast) when the server refuses them.
 * - **Local preferences** stay in market-prefs.json (app config dir; localStorage in a browser): stat presets
 *   (and the built-in ones deleted), the last search, the alerts switch, the results layout and the filter
 *   sections opened/closed. Saved searches from before they moved to the server are read from its
 *   `savedSearches`, uploaded once on sign-in, then dropped.
 *
 * Module-level stores like `lib/chat-prefs.ts`; local changes are saved right away, in order.
 */
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { z } from 'zod';
import { BaseDirectory, exists, mkdir, readTextFile, writeTextFile } from '@/lib/browser-fs';
import { showToast } from '@/overlay';
import { upgradeFilters } from '@/pages/market/lib/defaults';
import type { MarketFilters, SavedSearch, StatPreset } from '@/pages/market/lib/types';
import {
  createSavedSearch,
  DEFAULT_LIMITS,
  deleteSavedSearch,
  listSavedSearches,
  SavedSearchApiError,
  type SavedSearchLimits,
  updateSavedSearch,
} from '@/pages/market/alerts/saved-search-api';
import { t } from '@/i18n';

export const MARKET_PREFS_FILENAME = 'market-prefs.json';
const PREFS_DIR = BaseDirectory.AppConfig;

/** Saved searches that may alert at once (server cap; the server's `limits` win once listed). */
export const MAX_ALERT_SEARCHES = DEFAULT_LIMITS.maxAlerting;

/** Ids of saved searches the server has not confirmed yet (no edits until it has). */
export const PENDING_ID_PREFIX = 'pending:';
export const isPendingSearch = (search: SavedSearch) => search.id.startsWith(PENDING_ID_PREFIX);

export type MarketViewMode = 'rows' | 'cards';

/** Local preferences (market-prefs.json). */
export interface MarketLocalPrefs {
  userPresets: StatPreset[];
  /** Built-in presets the user deleted (ids); "Restore default presets" clears it. */
  hiddenPresets: string[];
  lastFilters: MarketFilters | null;
  /** Master switch for saved-search alerts (no stream, no popups when off). */
  alertsEnabled: boolean;
  /** Results layout: compact rows (+ detail pane) or self-contained cards. */
  viewMode: MarketViewMode;
  /** Filter sidebar sections the user opened or closed (by title); the rest use their default. */
  sectionsOpen: Record<string, boolean>;
  /** Saved searches from before they moved to the server, not uploaded yet. */
  legacySavedSearches: SavedSearch[];
}

/**
 * `signedOut`: no PD2 token, nothing listed. `unauthorized`: pd2trader.com refused the token (401); nothing is
 * retried with it, the session owner refreshes it or asks to sign in again.
 */
export type SavedSearchSyncStatus = 'signedOut' | 'loading' | 'ready' | 'error' | 'unauthorized';

/** Server saved searches. */
export interface SavedSearchState {
  /** Newest first, like the server lists them. */
  savedSearches: SavedSearch[];
  syncStatus: SavedSearchSyncStatus;
  limits: SavedSearchLimits;
}

export type MarketPrefs = MarketLocalPrefs & SavedSearchState;

export const EMPTY_LOCAL_PREFS: MarketLocalPrefs = {
  userPresets: [],
  hiddenPresets: [],
  lastFilters: null,
  alertsEnabled: true,
  viewMode: 'cards',
  sectionsOpen: {},
  legacySavedSearches: [],
};

const SIGNED_OUT: SavedSearchState = { savedSearches: [], syncStatus: 'signedOut', limits: DEFAULT_LIMITS };

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

/** Reads a saved file; malformed entries are skipped (a broken file yields the empty state). */
export function parseMarketPrefs(text: string): MarketLocalPrefs {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return EMPTY_LOCAL_PREFS;
  }
  if (!raw || typeof raw !== 'object') return EMPTY_LOCAL_PREFS;
  const file = raw as Record<string, unknown>;
  const lastFilters = FiltersSchema.safeParse(file.lastFilters);
  const hiddenPresets = HiddenPresetsSchema.safeParse(file.hiddenPresets);
  const sectionsOpen = SectionsOpenSchema.safeParse(file.sectionsOpen);
  return {
    userPresets: entries(file.userPresets, PresetSchema).map(
      (p) => ({ ...p, builtIn: false }) as unknown as StatPreset,
    ),
    hiddenPresets: hiddenPresets.success ? hiddenPresets.data : [],
    lastFilters: lastFilters.success ? (lastFilters.data as unknown as MarketFilters) : null,
    alertsEnabled: file.alertsEnabled !== false,
    viewMode: file.viewMode === 'rows' ? 'rows' : 'cards',
    sectionsOpen: sectionsOpen.success ? sectionsOpen.data : {},
    legacySavedSearches: entries(file.savedSearches, SavedSearchSchema).map((s) => ({
      id: s.id,
      name: s.name,
      filters: s.filters as unknown as MarketFilters,
      alert: s.alert,
      createdAt: s.createdAt,
    })),
  };
}

/** The file contents (`savedSearches`: the legacy ones still to upload). */
const fileJson = ({ legacySavedSearches, ...rest }: MarketLocalPrefs) =>
  JSON.stringify({ ...rest, savedSearches: legacySavedSearches });

async function readPrefsFile(): Promise<MarketLocalPrefs> {
  try {
    if (!(await exists(MARKET_PREFS_FILENAME, { baseDir: PREFS_DIR }))) return EMPTY_LOCAL_PREFS;
    return parseMarketPrefs(await readTextFile(MARKET_PREFS_FILENAME, { baseDir: PREFS_DIR }));
  } catch (error) {
    console.warn('Failed to load market preferences:', error);
    return EMPTY_LOCAL_PREFS;
  }
}

async function writePrefsFile(prefs: MarketLocalPrefs): Promise<void> {
  try {
    if (!(await exists('', { baseDir: PREFS_DIR }))) await mkdir('', { baseDir: PREFS_DIR, recursive: true });
    await writeTextFile(MARKET_PREFS_FILENAME, fileJson(prefs), { baseDir: PREFS_DIR });
  } catch (error) {
    console.error('Failed to save market preferences:', error);
  }
}

// ---- local preferences ----

let local: MarketLocalPrefs = EMPTY_LOCAL_PREFS;
let loadState: 'idle' | 'loading' | 'loaded' = 'idle';
let loadPromise: Promise<void> | null = null;
/** Changes made before the file was read, replayed over it. */
let early: ((prefs: MarketLocalPrefs) => MarketLocalPrefs)[] = [];
/** Writes in order, each with the then-current state. */
let writes: Promise<void> = Promise.resolve();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

function publishLocal(next: MarketLocalPrefs, persist: boolean) {
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

/** Changes the local preferences and saves them. */
export function changeMarketPrefs(change: (prefs: MarketLocalPrefs) => MarketLocalPrefs): void {
  const next = change(local);
  if (next === local) return;
  if (loadState !== 'loaded') early.push(change);
  publishLocal(next, loadState === 'loaded');
}

// ---- server saved searches ----

let remote: SavedSearchState = SIGNED_OUT;
interface SyncSession {
  token: string;
  generation: number;
  /** Told once when the server refuses `token` (401). */
  onUnauthorized?: () => void;
}
/** The signed-in token the saved searches belong to; a new one discards answers meant for the old one. */
let session: SyncSession | null = null;
let generation = 0;

function publishRemote(next: SavedSearchState) {
  remote = next;
  notify();
}

const setSearches = (change: (searches: SavedSearch[]) => SavedSearch[]) =>
  publishRemote({ ...remote, savedSearches: change(remote.savedSearches) });

/** Server filters may predate the current shape (legacy corruptions list, weights): read them as today's. */
const upgradeSearch = (search: SavedSearch): SavedSearch => {
  const filters = upgradeFilters(search.filters);
  return filters === search.filters ? search : { ...search, filters };
};

const replaceSearch = (id: string, next: SavedSearch | null) =>
  setSearches((searches) =>
    next ? searches.map((s) => (s.id === id ? upgradeSearch(next) : s)) : searches.filter((s) => s.id !== id),
  );

const refusedMessage = () => t('market:store.refused');

const statusOf = (error: unknown) =>
  error && typeof error === 'object' && 'status' in error && typeof error.status === 'number' ? error.status : null;

const errorMessage = (error: unknown) => {
  const status = statusOf(error);
  if (status === 401) return refusedMessage();
  if (error instanceof Error && status) return error.message;
  return t('market:store.unreachable');
};

function toastError(title: string, error: unknown) {
  console.warn(`[market] ${title}:`, error);
  showToast({ title, description: errorMessage(error), variant: 'error' });
}

/** The server refused the session's token: no more requests with it (no retry timer), and its owner is told. */
function refuseSession(owner: SyncSession) {
  clearTimeout(retryTimer);
  if (remote.syncStatus !== 'unauthorized') publishRemote({ ...remote, syncStatus: 'unauthorized' });
  owner.onUnauthorized?.();
}

/** Runs `request` for the current session; `onDone` / `onError` only when the session is still the same. */
function withSession<T>(
  request: (token: string) => Promise<T>,
  onDone: (result: T) => void,
  onError: (error: unknown) => void,
): boolean {
  const owner = session;
  if (!owner) {
    showToast({
      title: t('market:store.title'),
      description: t('market:store.signIn'),
      variant: 'warning',
    });
    return false;
  }
  // The token was refused: another request with it would only be refused again
  if (remote.syncStatus === 'unauthorized') {
    showToast({ title: t('market:store.title'), description: refusedMessage(), variant: 'warning' });
    return false;
  }
  request(owner.token).then(
    (result) => session === owner && onDone(result),
    (error) => {
      if (session !== owner) return;
      if (statusOf(error) === 401) refuseSession(owner);
      onError(error);
    },
  );
  return true;
}

export interface LegacyUploadApi {
  create: (search: { name: string; filters: MarketFilters; alert: boolean }) => Promise<unknown>;
  /** A search is done with (uploaded, or dropped for good): forget it locally right away. */
  settle: (search: SavedSearch) => void;
  /** Checked before each upload: false stops (the rest stay for the next sign-in). */
  shouldContinue?: () => boolean;
}

/**
 * Uploads saved searches from before the server kept them, oldest first, settling each one as soon as the server
 * has it (or refused it for good) so an interrupted run never uploads it twice. Returns the ones to keep locally
 * for the next sign-in (the server was unreachable) and how many were uploaded / dropped (invalid, or over the
 * caps). An alert over the alert cap (409) or not allowed (400) is retried without it.
 */
export async function uploadLegacySearches(
  legacy: readonly SavedSearch[],
  api: LegacyUploadApi,
): Promise<{ remaining: SavedSearch[]; uploaded: number; dropped: number }> {
  const queue = [...legacy].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  let uploaded = 0;
  let dropped = 0;
  for (let i = 0; i < queue.length; i++) {
    if (api.shouldContinue && !api.shouldContinue()) return { remaining: queue.slice(i), uploaded, dropped };
    const search = queue[i];
    const body = { name: search.name.slice(0, 80), filters: search.filters, alert: search.alert };
    try {
      try {
        await api.create(body);
      } catch (error) {
        const status = statusOf(error);
        if (!body.alert || (status !== 409 && status !== 400)) throw error;
        await api.create({ ...body, alert: false });
      }
      uploaded++;
      api.settle(search);
    } catch (error) {
      const status = statusOf(error);
      if (status === 400) {
        dropped++;
        api.settle(search);
        continue;
      }
      if (status === 409) {
        // Saved-search cap: none of the rest fit either
        for (const rest of queue.slice(i)) api.settle(rest);
        dropped += queue.length - i;
        return { remaining: [], uploaded, dropped };
      }
      // Unreachable or signed out: try again next time
      return { remaining: queue.slice(i), uploaded, dropped };
    }
  }
  return { remaining: [], uploaded, dropped };
}

/** One legacy upload at a time: a new sign-in waits for a running one instead of uploading the same searches. */
let migration: Promise<void> = Promise.resolve();

async function migrateLegacySearches(owner: { token: string }): Promise<void> {
  if (local.legacySavedSearches.length === 0) return;
  const { uploaded, dropped } = await uploadLegacySearches(local.legacySavedSearches, {
    create: (body) => createSavedSearch(owner.token, body),
    // Persisted per search, whatever happens to the session afterwards
    settle: (search) =>
      changeMarketPrefs((prefs) => ({
        ...prefs,
        legacySavedSearches: prefs.legacySavedSearches.filter((s) => s.id !== search.id),
      })),
    shouldContinue: () => session === owner,
  });
  if (session === owner && (uploaded > 0 || dropped > 0)) {
    showToast({
      title: t('market:store.migratedTitle'),
      description:
        dropped > 0
          ? t('market:store.migratedPartial', { uploaded, dropped, max: remote.limits.maxSearches })
          : t('market:store.migrated', { count: uploaded }),
      variant: dropped > 0 ? 'warning' : 'success',
    });
  }
}

/**
 * Retries of a failed list: 2 s, 4 s … 60 s (± jitter), never sooner than a 429/503 Retry-After, while the same
 * token is signed in. A 401 is not retried (the token was refused).
 */
export const SYNC_RETRY_BASE_MS = 2_000;
export const SYNC_RETRY_MAX_MS = 60_000;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
let retryAttempt = 0;

/** Lists the session's saved searches; on failure, `error` and a retry with backoff (`unauthorized` on a 401). */
async function listForSession(owner: SyncSession): Promise<void> {
  clearTimeout(retryTimer);
  try {
    const { items, limits } = await listSavedSearches(owner.token);
    if (session !== owner) return;
    retryAttempt = 0;
    // Keep searches created while the list was loading (still pending)
    const pending = remote.savedSearches.filter(isPendingSearch);
    publishRemote({
      savedSearches: [...pending, ...items.map(upgradeSearch)],
      syncStatus: 'ready',
      limits: limits ?? DEFAULT_LIMITS,
    });
  } catch (error) {
    if (session !== owner) return;
    console.warn('[market] listing saved searches failed:', error);
    if (statusOf(error) === 401) {
      refuseSession(owner);
      return;
    }
    publishRemote({ ...remote, syncStatus: 'error' });
    const backoff = Math.min(SYNC_RETRY_MAX_MS, SYNC_RETRY_BASE_MS * 2 ** retryAttempt) * (0.5 + Math.random());
    const retryAfterMs = error instanceof SavedSearchApiError ? (error.retryAfterMs ?? 0) : 0;
    retryAttempt++;
    retryTimer = setTimeout(
      () => {
        if (session === owner) void listForSession(owner);
      },
      Math.max(backoff, retryAfterMs),
    );
  }
}

/**
 * Follows the sign-in: with a token, uploads legacy local saved searches once, then lists the user's saved
 * searches (retrying with backoff while that fails); without one, clears them. Calling again with the same token
 * only swaps `onUnauthorized`. `onUnauthorized` is told when the server refuses the token (right away if it already
 * has); nothing is sent with that token again.
 */
export function syncSavedSearches(token: string | null, onUnauthorized?: () => void): void {
  if (!token) {
    session = null;
    clearTimeout(retryTimer);
    if (remote !== SIGNED_OUT) publishRemote(SIGNED_OUT);
    return;
  }
  if (session?.token === token) {
    session.onUnauthorized = onUnauthorized;
    if (remote.syncStatus === 'unauthorized') onUnauthorized?.();
    return;
  }
  const owner: SyncSession = { token, generation: ++generation, onUnauthorized };
  session = owner;
  retryAttempt = 0;
  publishRemote({ savedSearches: [], syncStatus: 'loading', limits: remote.limits });
  void (async () => {
    await loadMarketPrefs();
    migration = migration
      .then(() => (session === owner ? migrateLegacySearches(owner) : undefined))
      .catch((error) => console.warn('[market] moving saved searches failed:', error));
    await migration;
    if (session !== owner) return;
    await listForSession(owner);
  })();
}

/** Something else (the alert stream) got a 401 with `token`: the saved searches stop using it too. */
export function refuseSavedSearchToken(token: string): void {
  if (session?.token === token) refuseSession(session);
}

/** A failed list: try again now (the panel or Saved tab was shown, or Retry pressed). */
export function retrySavedSearchSync(): void {
  if (session && remote.syncStatus === 'error') {
    publishRemote({ ...remote, syncStatus: 'loading' });
    void listForSession(session);
  }
}

const alertingCount = () => remote.savedSearches.filter((s) => s.alert).length;

const capMessage = (what: 'searches' | 'alerting', limits: SavedSearchLimits) =>
  what === 'searches'
    ? t('market:store.capSearches', { count: limits.maxSearches })
    : t('market:saved.tooManyDescription', { count: limits.maxAlerting });

/** Store actions; usable outside React (they read the current state). */
export const marketStoreActions = {
  /**
   * Saves a search on the server (shown right away as pending). `name` omitted: the server derives one.
   * Returns the pending entry, or null when refused (signed out, saved searches not loaded yet, or over a cap: a
   * toast says why).
   */
  saveSearch(name: string | undefined, filters: MarketFilters, alert = false): SavedSearch | null {
    const { limits } = remote;
    // Until the list is in, a save could duplicate a search the user already has
    if (session && remote.syncStatus !== 'ready') {
      showToast({
        title: t('market:store.title'),
        description:
          remote.syncStatus === 'unauthorized'
            ? refusedMessage()
            : remote.syncStatus === 'error'
              ? t('market:store.notLoaded')
              : t('market:store.stillLoading'),
        variant: 'warning',
      });
      return null;
    }
    if (session && remote.savedSearches.length >= limits.maxSearches) {
      showToast({
        title: t('market:store.tooManySearches'),
        description: capMessage('searches', limits),
        variant: 'warning',
      });
      return null;
    }
    if (session && alert && alertingCount() >= limits.maxAlerting) {
      showToast({
        title: t('market:watch.tooManyTitle'),
        description: capMessage('alerting', limits),
        variant: 'warning',
      });
      return null;
    }
    const trimmed = name?.trim().slice(0, 80) || undefined;
    const pending: SavedSearch = {
      id: `${PENDING_ID_PREFIX}${crypto.randomUUID()}`,
      name: trimmed ?? t('market:store.saving'),
      filters,
      alert,
      createdAt: new Date().toISOString(),
    };
    const started = withSession(
      (token) => createSavedSearch(token, { name: trimmed, filters, alert }),
      (saved) => replaceSearch(pending.id, saved),
      (error) => {
        replaceSearch(pending.id, null);
        toastError(statusOf(error) === 409 ? t('market:store.limitReached') : t('market:store.saveFailed'), error);
      },
    );
    if (!started) return null;
    setSearches((searches) => [pending, ...searches]);
    return pending;
  },
  updateSearch(id: string, changes: Partial<Pick<SavedSearch, 'name' | 'filters'>>): void {
    marketStoreActions.patchSearch(id, changes, t('market:store.updateFailed'));
  },
  renameSearch(id: string, name: string): void {
    const trimmed = name.trim().slice(0, 80);
    if (trimmed) marketStoreActions.patchSearch(id, { name: trimmed }, t('market:store.renameFailed'));
  },
  /** Turns a search's alert (Watch) on/off; false when refused locally (alert cap: the caller says so). */
  setSearchAlert(id: string, alert: boolean): boolean {
    const search = remote.savedSearches.find((s) => s.id === id);
    if (!search || isPendingSearch(search)) return false;
    if (search.alert === alert) return true;
    if (alert && alertingCount() >= remote.limits.maxAlerting) return false;
    marketStoreActions.patchSearch(
      id,
      { alert },
      alert ? t('market:store.alertOnFailed') : t('market:store.alertOffFailed'),
    );
    return true;
  },
  /** Optimistic PATCH: shows `changes` now, the server's answer when it comes, the old search on failure. */
  patchSearch(id: string, changes: Partial<Pick<SavedSearch, 'name' | 'filters' | 'alert'>>, failure: string): void {
    const before = remote.savedSearches.find((s) => s.id === id);
    if (!before || isPendingSearch(before)) return;
    const started = withSession(
      (token) => updateSavedSearch(token, id, changes),
      (saved) => replaceSearch(id, saved),
      (error) => {
        if (statusOf(error) === 404) replaceSearch(id, null);
        else replaceSearch(id, before);
        toastError(failure, error);
      },
    );
    if (started) replaceSearch(id, { ...before, ...changes });
  },
  /** Deletes a search; returns it (for Undo via `restoreSearch`). */
  removeSearch(id: string): SavedSearch | null {
    const search = remote.savedSearches.find((s) => s.id === id) ?? null;
    if (!search || isPendingSearch(search)) return null;
    const index = remote.savedSearches.indexOf(search);
    const started = withSession(
      (token) => deleteSavedSearch(token, id),
      () => {},
      (error) => {
        if (statusOf(error) === 404) return;
        setSearches((searches) => {
          const next = [...searches];
          next.splice(Math.min(index, next.length), 0, search);
          return next;
        });
        toastError(t('market:store.deleteFailed'), error);
      },
    );
    if (!started) return null;
    replaceSearch(id, null);
    return search;
  },
  /** Saves a deleted search again (Undo); it gets a new id. */
  restoreSearch(search: SavedSearch): void {
    if (remote.savedSearches.some((s) => s.id === search.id)) return;
    const alert = search.alert && alertingCount() < remote.limits.maxAlerting;
    marketStoreActions.saveSearch(search.name, search.filters, alert);
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
export const getMarketPrefs = (): MarketPrefs => ({ ...local, ...remote });
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
  const saved = useSyncExternalStore(subscribe, () => remote);
  const loaded = useSyncExternalStore(subscribe, isMarketPrefsLoaded);
  return useMemo(() => ({ ...prefs, ...saved, ...marketStoreActions, loaded }), [prefs, saved, loaded]);
}

/** Tests: forget the in-memory state; the next load reads the file again. */
export function resetMarketPrefs(): void {
  local = EMPTY_LOCAL_PREFS;
  remote = SIGNED_OUT;
  session = null;
  clearTimeout(retryTimer);
  retryAttempt = 0;
  migration = Promise.resolve();
  loadState = 'idle';
  loadPromise = null;
  early = [];
  writes = Promise.resolve();
}
