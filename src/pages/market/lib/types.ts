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

/**
 * Result order, all applied by the market service over every match: `bumped` (newest bump), `price` (HR price;
 * unpriced listings excluded), `score`/`value` (stat-weighted score, score per HR), `stat` (`sort.key`'s value).
 */
export type SortBy = 'bumped' | 'price' | 'score' | 'value' | 'stat';

export interface StatFilter {
  /** Stable row id (uuid) for React keys / editing. */
  id: string;
  /** `mod` = PD2 property key; `pseudo` = a computed pseudo stat (both filtered by the market service). */
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
  /** `key` (a property key or pseudo id) is required for `by: 'stat'` and ignored otherwise. */
  sort: { by: SortBy; dir: 'asc' | 'desc'; key?: string };
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
  /** Results per page (1–100). Default 25. */
  pageSize?: number;
  /** 0-based page. */
  page?: number;
  signal?: AbortSignal;
}

export interface SearchResult {
  /** One page, filtered and ordered by the market service. */
  items: ScoredListing[];
  /** Matches across all pages. */
  total: number;
  /** Listings on this page. */
  fetched: number;
  mode: 'server';
}

/** Whether a listing still stands as shown, checked against PD2 before acting on it. */
export type ListingFreshness =
  | { status: 'ok'; listing: MarketListingEntry }
  | { status: 'gone' }
  /** Price note, HR price or item differ from what was shown; `listing` is the current one. */
  | { status: 'changed'; listing: MarketListingEntry }
  /** The check itself failed (network, PD2 down, signed out); callers proceed as before. */
  | { status: 'unknown' };

export interface MarketFavorite {
  _id: string;
  listing_id: string;
  seller_id: string;
  user_id: string;
  created_at: string;
  listing?: MarketListingEntry;
}

/**
 * What the market browser talks to: the pd2trader market service for search, PD2 (with the user's token) for
 * everything else; implemented by useMarketActions (`usePd2Website().marketApi`). Like every PD2 call in the
 * overlay, the PD2 methods resolve null on 401 (re-authentication has started) and throw otherwise.
 */
export interface MarketApi {
  /**
   * Listing search on the market service (`POST {BACKEND_URL}/api/market/search`). Rejects with
   * MarketBackendError (`@/lib/market-search-api`) when the service is down, slow (8 s), rate limiting or
   * rejects the filters; an AbortError when `signal` aborts.
   */
  searchListings: (
    filters: MarketFilters,
    opts: { page: number; limit: number; signal?: AbortSignal },
  ) => Promise<{ items: ScoredListing[]; total: number }>;
  /** One live listing from PD2 (`GET market/listing/:id`); null when PD2 no longer has it. */
  getListing: (listingId: string) => Promise<MarketListingEntry | null>;
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
