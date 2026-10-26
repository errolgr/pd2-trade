/**
 * Client for the pd2-price-crawler builds API (`/api/builds/*`, public, no auth) plus PD2's public
 * `game/account` endpoint (a linked account's characters, live).
 * Wire types mirror the server's src/builds/builds.types.ts; keep them in sync.
 */
import { fetch } from '@/lib/browser-http';
import { BACKEND_URL } from '@/lib/pkce';

export type BuildsMode = 'softcore' | 'hardcore';
export type CharacterSort = 'level' | 'life' | 'gearValueHr' | 'lastUpdated';

export const BUILD_CLASSES = [
  'Amazon',
  'Assassin',
  'Barbarian',
  'Druid',
  'Necromancer',
  'Paladin',
  'Sorceress',
] as const;
export type BuildClass = (typeof BUILD_CLASSES)[number];

/** The server only crawls ladder characters from this level up. */
export const BUILDS_MIN_LEVEL = 80;

/** Filters shared by the list, usage and shopping-list endpoints. Empty lists / null = no filter. */
export interface BuildsFilters {
  /** Season id (`s14`); undefined = the server's current season. */
  season?: string;
  mode: BuildsMode;
  /** Any of. */
  classes: string[];
  /** All of; `Name` or `Name:N` (at least N hard points, default 1). */
  skills: string[];
  /** All of; worn item keys (`unique:griffon_s_eye`, `rw:infinity`). */
  items: string[];
  /** Any of. */
  mercTypes: string[];
  /** All of; merc item keys. */
  mercItems: string[];
  minLevel?: number | null;
  maxLevel?: number | null;
  /** Maximum gear value in HR (excludes characters without one). */
  maxCostHr?: number | null;
}

export const EMPTY_BUILDS_FILTERS: BuildsFilters = {
  mode: 'softcore',
  classes: [],
  skills: [],
  items: [],
  mercTypes: [],
  mercItems: [],
  minLevel: null,
  maxLevel: null,
  maxCostHr: null,
};

// ───────────────────────────── wire types ─────────────────────────────

export interface SocketedItem {
  key: string;
  name: string;
  /** PD2 quality name; null for runes and gems. */
  quality: string | null;
  mods: string[];
}

export interface EquippedItem {
  /** Helm, Amulet, Armor, Right Hand, Left Hand, Right Hand Switch, Left Hand Switch, Right Ring, Left Ring, Belt, Boots, Gloves. */
  slot: string;
  /** `unique:<code>`, `set:<code>`, `rw:<name>`, catalog key, else `base:<baseCode>:<quality>`. */
  key: string;
  name: string;
  /** `Unique`, `Set`, `Rare`, `Magic`, `Crafted`, `Normal`, `Superior`, …; `Runeword` for runewords. */
  quality: string;
  base: string;
  baseCode: string;
  runeword: boolean;
  ethereal: boolean;
  corrupted: boolean;
  sockets: number;
  socketed: SocketedItem[];
  /** PD2 display lines (sockets included). */
  mods: string[];
}

export interface CharacterSkill {
  name: string;
  /** Hard points. */
  base: number;
  /** Hard points + every bonus. */
  total: number;
}

export interface CharacterAttributes {
  strength: number;
  dexterity: number;
  vitality: number;
  energy: number;
}

export interface PricedEquippedItem extends EquippedItem {
  iconUrl: string | null;
  /** Item + priced sockets; null when nothing in it is priced. */
  priceHr: number | null;
}

export interface Merc<Item> {
  /** Act/aura flavour (`Fire Arrow`, `Defensive Auras`, …). */
  type: string;
  typeId: number | null;
  name: string | null;
  equipped: Item[];
}

export interface ItemIcon {
  slot: string;
  name: string;
  quality: string;
  iconUrl: string | null;
}

export interface CharacterListEntry {
  name: string;
  className: string;
  level: number;
  life: number;
  mana: number;
  isDead: boolean;
  topSkills: { name: string; total: number }[];
  gearValueHr: number | null;
  lastUpdated: string;
  equippedIcons: ItemIcon[];
}

export interface CharacterListResponse {
  season: string;
  mode: BuildsMode;
  total: number;
  page: number;
  pageSize: number;
  /** Matching characters per class under every filter except `classes`. */
  breakdown: Record<string, number>;
  characters: CharacterListEntry[];
}

export interface UsageCount {
  name: string;
  count: number;
  /** 0–100 */
  pct: number;
}

export interface ItemUsage {
  key: string;
  name: string;
  quality: string;
  iconUrl: string | null;
  count: number;
  pct: number;
  priceHr: number | null;
}

export interface UsageResponse {
  season: string;
  mode: BuildsMode;
  total: number;
  classes: UsageCount[];
  /** Skills with ≥ 20 hard points. */
  skills: UsageCount[];
  items: ItemUsage[];
  mercTypes: UsageCount[];
  mercItems: ItemUsage[];
}

export interface ShoppingListItem extends ItemUsage {
  /** Site path of the item's market page, or null. */
  marketUrl: string | null;
}

export interface ShoppingListResponse {
  season: string;
  mode: BuildsMode;
  total: number;
  /** The 10 most worn uniques/sets/runewords. */
  items: ShoppingListItem[];
}

export interface CharacterDetail {
  name: string;
  season: string;
  mode: BuildsMode;
  className: string;
  level: number;
  life: number;
  mana: number;
  attributes: CharacterAttributes;
  isDead: boolean;
  skills: CharacterSkill[];
  equipped: PricedEquippedItem[];
  merc: Merc<PricedEquippedItem> | null;
  gearValueHr: number | null;
  firstSeenAt: string;
  lastUpdated: string;
}

export interface SnapshotListEntry {
  id: string;
  takenAt: string;
  level: number;
  gearValueHr: number | null;
}

export interface SnapshotBuild {
  className: string;
  level: number;
  life: number;
  mana: number;
  attributes: CharacterAttributes;
  isDead: boolean;
  skills: CharacterSkill[];
  equipped: EquippedItem[];
  merc: Merc<EquippedItem> | null;
  gearValueHr: number | null;
}

export interface SnapshotDetail {
  id: string;
  name: string;
  season: string;
  mode: BuildsMode;
  takenAt: string;
  doc: SnapshotBuild;
}

export interface MetaHistoryResponse {
  season: string;
  mode: BuildsMode;
  points: { hour: string; total: number; classes: UsageCount[] }[];
  items: {
    key: string;
    name: string;
    quality: string;
    iconUrl: string | null;
    series: { hour: string; pct: number }[];
  }[];
}

/** One character of a PD2 account (PD2 `game/account` details; live, every level and mode). */
export interface AccountCharacter {
  account: string;
  name: string;
  className: string;
  level: number;
  hardcore: boolean;
  ladder: boolean;
}

// ───────────────────────────── requests ─────────────────────────────

export class BuildsApiError extends Error {
  constructor(
    message: string,
    /** HTTP status; 0 = no answer. */
    public readonly status: number,
  ) {
    super(message);
    this.name = 'BuildsApiError';
  }
}

type Params = Record<string, string | number | undefined | null>;

function query(params: Params): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' }, signal });
  } catch (error) {
    if (signal?.aborted) throw signal.reason ?? error;
    throw new BuildsApiError("Couldn't reach the builds service.", 0);
  }
  if (!response.ok) {
    let message = response.status === 429 ? 'Too many requests; wait a moment.' : `Builds API ${response.status}`;
    try {
      const body = await response.json();
      if (body?.message && response.status !== 429) {
        message = Array.isArray(body.message) ? body.message.join(', ') : String(body.message);
      }
    } catch {
      // non-JSON error body
    }
    throw new BuildsApiError(message, response.status);
  }
  return (await response.json()) as T;
}

const LIST_KEYS = ['classes', 'skills', 'items', 'mercTypes', 'mercItems'] as const;

/** Query params for the filter endpoints; the current season and softcore are server defaults. */
export function filterParams(filters: BuildsFilters): Params {
  const params: Params = {};
  if (filters.season) params.season = filters.season;
  if (filters.mode === 'hardcore') params.mode = 'hardcore';
  for (const key of LIST_KEYS) if (filters[key].length) params[key] = filters[key].join(',');
  if (filters.minLevel) params.minLevel = filters.minLevel;
  if (filters.maxLevel) params.maxLevel = filters.maxLevel;
  if (filters.maxCostHr != null) params.maxCostHr = filters.maxCostHr;
  return params;
}

const builds = (path: string, params: Params) => `${BACKEND_URL}/api/builds${path}${query(params)}`;
const seasonParams = (opts: { season?: string; mode?: BuildsMode }): Params => ({
  season: opts.season,
  mode: opts.mode,
});

export function getBuildCharacters(
  filters: BuildsFilters,
  opts: { page?: number; pageSize?: number; sort?: CharacterSort; dir?: 'asc' | 'desc'; signal?: AbortSignal } = {},
): Promise<CharacterListResponse> {
  const { page = 1, pageSize = 25, sort = 'level', dir = 'desc', signal } = opts;
  return getJson(builds('/characters', { ...filterParams(filters), page, pageSize, sort, dir }), signal);
}

export function getBuildUsage(filters: BuildsFilters, signal?: AbortSignal): Promise<UsageResponse> {
  return getJson(builds('/usage', filterParams(filters)), signal);
}

export function getBuildShoppingList(filters: BuildsFilters, signal?: AbortSignal): Promise<ShoppingListResponse> {
  return getJson(builds('/shopping-list', filterParams(filters)), signal);
}

export function getBuildMetaHistory(
  opts: { season?: string; mode?: BuildsMode; from?: string; to?: string },
  signal?: AbortSignal,
): Promise<MetaHistoryResponse> {
  return getJson(builds('/meta/history', { ...seasonParams(opts), from: opts.from, to: opts.to }), signal);
}

/** `mode` omitted: the server looks in softcore first, then hardcore. 404 → BuildsApiError status 404. */
export function getBuildCharacter(
  name: string,
  opts: { season?: string; mode?: BuildsMode } = {},
  signal?: AbortSignal,
): Promise<CharacterDetail> {
  return getJson(builds(`/characters/${encodeURIComponent(name)}`, seasonParams(opts)), signal);
}

/** Newest first; one per build change (at most one per hour). */
export function getCharacterSnapshots(
  name: string,
  opts: { season?: string; mode?: BuildsMode } = {},
  signal?: AbortSignal,
): Promise<SnapshotListEntry[]> {
  return getJson(builds(`/characters/${encodeURIComponent(name)}/snapshots`, seasonParams(opts)), signal);
}

export function getCharacterSnapshot(
  name: string,
  id: string,
  opts: { season?: string; mode?: BuildsMode } = {},
  signal?: AbortSignal,
): Promise<SnapshotDetail> {
  return getJson(
    builds(`/characters/${encodeURIComponent(name)}/snapshots/${encodeURIComponent(id)}`, seasonParams(opts)),
    signal,
  );
}

const PD2_GAME_URL = 'https://api.projectdiablo2.com/game';

/** A PD2 account's characters, live from PD2 (public). null when PD2 doesn't know the account. */
export async function getAccountCharacters(account: string, signal?: AbortSignal): Promise<AccountCharacter[] | null> {
  let data: { details?: unknown };
  try {
    data = await getJson(`${PD2_GAME_URL}/account/${encodeURIComponent(account)}`, signal);
  } catch (error) {
    if (error instanceof BuildsApiError && error.status === 404) return null;
    throw error;
  }
  if (!Array.isArray(data.details)) return [];
  return data.details.flatMap((d: Record<string, unknown>) =>
    typeof d?.name === 'string' && typeof d.class_name === 'string' && typeof d.level === 'number'
      ? [
          {
            account: typeof d.account === 'string' ? d.account : account,
            name: d.name,
            className: d.class_name,
            level: d.level,
            hardcore: d.hardcore === true,
            ladder: d.ladder === true,
          },
        ]
      : [],
  );
}
