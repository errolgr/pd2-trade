/**
 * Market browser shared contract. Pure types — no React/Tauri imports anywhere under `pages/market/lib`
 * so the query/stat layer can later be reused by the web client.
 */
import type { MarketListingEntry, Modifier } from '@/common/types/pd2-website/GetMarketListingsResponse';
import type { MarketListingResult } from '@/common/types/pd2-website/GetMarketListingsResponse';

export type Tri = 'any' | 'yes' | 'no';
export type OnlineFilter = 'all' | 'online' | 'offline';
export type Rarity = 'Normal' | 'Superior' | 'Magic' | 'Rare' | 'Crafted' | 'Set' | 'Unique' | 'Runeword';
export type CharClass = 'amazon' | 'assassin' | 'barbarian' | 'druid' | 'necromancer' | 'paladin' | 'sorceress';

/** Client-side sorts (`score`, `value`) force pool mode; `bumped`/`price` are server-side. */
export type SortBy = 'bumped' | 'price' | 'score' | 'value';

export interface StatFilter {
  /** Stable row id (uuid) for React keys / editing. */
  id: string;
  /** `mod` = PD2 modifier name (server-filterable); `pseudo` = computed client-side. */
  kind: 'mod' | 'pseudo';
  /** PD2 modifier name (e.g. `item_fastercastrate`) or pseudo id (e.g. `pseudo_total_res`). */
  key: string;
  min?: number;
  max?: number;
  /** Weight for stat-weighted sort; undefined/0 = not scored. */
  weight?: number;
  enabled: boolean;
}

export interface Requirements {
  class?: CharClass;
  levelMin?: number;
  levelMax?: number;
  strMin?: number;
  strMax?: number;
  dexMin?: number;
  dexMax?: number;
}

export interface MarketFilters {
  /** `live` = market/listing, `archive` = market/listingArchive (sold). */
  source: 'live' | 'archive';
  hardcore: boolean;
  ladder: boolean;
  /** Exact item.name (unique/set/runeword/base name), site parity. */
  itemName?: string;
  /** Case-insensitive regex on the price note (site "Price" box). */
  priceText?: string;
  /** hr_price range (extension over the site). */
  hrMin?: number;
  hrMax?: number;
  /** item.base.type_code */
  typeCode?: string;
  /** item.base_code */
  baseCode?: string;
  /** Site is single-select; multiple → `$in`. Empty = any. */
  rarity: Rarity[];
  ethereal: Tri;
  corrupted: Tri;
  desecrated: Tri;
  identified: Tri;
  socketsMin?: number;
  socketsMax?: number;
  userOnlineSite: OnlineFilter;
  userOnlineGame: OnlineFilter;
  hasBuyout: Tri;
  sellerUserId?: string;
  /** Display only; the query uses sellerUserId. */
  sellerName?: string;
  requirements: Requirements;
  stats: StatFilter[];
  /** item.corruptions `$all` (cube corruption names). */
  corruptions: string[];
  /** updated_at window; site default 3. */
  maxAgeDays: number;
  sort: { by: SortBy; dir: 'asc' | 'desc' };
}

export interface StatOption {
  /** PD2 modifier name. */
  key: string;
  /** Site-style template, e.g. `+{X} Faster Cast Rate`. */
  label: string;
  /** Display group (Offense, Defense, Resists, Skills, Caster, Attributes, Utility, Charm/Misc, Corruption). */
  group: string;
}

export interface PseudoDef {
  id: string;
  label: string;
  group: string;
  /** Sum/derive from the listing's item modifiers. Return 0 when absent. */
  compute: (mods: Modifier[]) => number;
}

export interface StatPreset {
  id: string;
  name: string;
  builtIn: boolean;
  /** Optional item.base.type_code(s) this preset targets; applied to filters when exactly one. */
  typeCodes?: string[];
  /** Optional item name applied with the preset (e.g. `Grand Charm`, matched the way the site matches names). */
  itemName?: string;
  rarity?: Rarity[];
  stats: Omit<StatFilter, 'id'>[];
}

export interface ScoredListing {
  listing: MarketListingEntry;
  /** pseudo id → value, for every PSEUDO_STATS entry. */
  pseudo: Record<string, number>;
  /** Weighted score; null when no weighted stats. */
  score: number | null;
  /** score / hr_price; null when score null or hr_price ≤ 0. */
  value: number | null;
}

export interface SearchOptions {
  /** Pool mode cap (pseudo filters or client sort). Default 200. */
  poolSize?: number;
  /** Server page size. */
  pageSize?: number;
  /** Server-paged mode: 0-based page. */
  page?: number;
  signal?: AbortSignal;
  onProgress?: (fetched: number, total: number) => void;
}

export interface SearchResult {
  items: ScoredListing[];
  /** Server total for the raw (server-filterable) query. */
  total: number;
  /** Listings pulled from the server. */
  fetched: number;
  /** Pool mode hit poolSize before exhausting total. */
  truncated: boolean;
  /** `server`: items are one server page; `pool`: items are the full filtered+ranked pool. */
  mode: 'server' | 'pool';
}

export interface MarketFavorite {
  _id: string;
  listing_id: string;
  seller_id: string;
  user_id: string;
  created_at: string;
  listing?: MarketListingEntry;
}

/**
 * PD2 API surface the market lib needs; implemented by useMarketActions (`usePd2Website().marketApi`). Like every
 * PD2 call in the overlay, methods resolve null on 401 (re-authentication has started) and throw otherwise; a 429
 * throws an error with `status === 429` and `retryAfterMs` (see lib/rate-limit).
 */
export interface MarketApi {
  getMarketListings: (query: Record<string, unknown>) => Promise<MarketListingResult>;
  getMarketListingsArchive: (query: Record<string, unknown>) => Promise<MarketListingResult>;
  getFavorites: (opts?: { limit?: number; skip?: number }) => Promise<{ total: number; data: MarketFavorite[] }>;
  addFavorite: (listingId: string, sellerId: string) => Promise<MarketFavorite>;
  removeFavorite: (favoriteId: string) => Promise<void>;
  /**
   * Seller lookup for the Seller filter. PD2 only supports an exact (case-insensitive) username match
   * (`GET security/user?username=`), so this returns 0 or 1 users.
   */
  findUsers: (name: string) => Promise<{ _id: string; username: string }[]>;
  /**
   * Make an offer on a listing (site parity: POST market/offer `{listing_id, offer, hr_offer}`).
   * `price` is the offer text shown to the seller, `hrPrice` its optional HR value.
   */
  createOffer?: (listingId: string, offer: { price: string; hrPrice?: number }) => Promise<unknown>;
}

export interface SavedSearch {
  id: string;
  name: string;
  filters: MarketFilters;
  /** Live alert enabled (15s poll). */
  alert: boolean;
  createdAt: string;
}

export type MarketTab = 'search' | 'favorites' | 'saved';

/** Payload for `openPanel('market', payload)`. */
export interface MarketPanelPayload {
  /** Merged over defaults (not over current state) and searched immediately. */
  filters?: Partial<MarketFilters>;
  savedSearchId?: string;
  focusListingId?: string;
  tab?: MarketTab;
}
