/**
 * Market browser shared contract. Pure types — no React/Tauri imports anywhere under `pages/market/lib`
 * so the query/stat layer can later be reused by the web client.
 */
import type { MarketListingEntry, Modifier } from '@/common/types/pd2-website/GetMarketListingsResponse';
import type { MarketListingResult } from '@/common/types/pd2-website/GetMarketListingsResponse';
import type { MarketFacetName, MarketFacets } from './facets';
import type { MarketPriceStats } from './price-stats';
import type { WtbCurrency, WtbItemMatch } from './wtb';

export type Tri = 'any' | 'yes' | 'no';
export type OnlineFilter = 'all' | 'online' | 'offline';
export type Rarity = 'Normal' | 'Superior' | 'Magic' | 'Rare' | 'Crafted' | 'Set' | 'Unique' | 'Runeword';
export type CharClass = 'amazon' | 'assassin' | 'barbarian' | 'druid' | 'necromancer' | 'paladin' | 'sorceress';

/**
 * Result order, all applied by the market service over every match: `bumped` (newest bump), `price` (HR price;
 * unpriced listings excluded), `score`/`value` (stat-weighted score, score per HR), `stat` (`sort.key`'s value).
 */
export type SortBy = 'bumped' | 'price' | 'score' | 'value' | 'stat';

export type StatKind = 'mod' | 'pseudo' | 'corruption' | 'item';

/** Item properties an `item` stat row bounds (`sockets`: the socket count, items without one count as 0). */
export type ItemProperty = 'sockets';

/** A listing's state on the market service: still up, or how it ended. */
export type MarketListingStatus = 'active' | 'sold' | 'removed' | 'expired';

export interface StatFilter {
  /** Stable row id (uuid) for React keys / editing. */
  id: string;
  /**
   * `mod` = PD2 property key; `pseudo` = a computed pseudo stat; `corruption` = a cube corruption name
   * (`item.corruptions`; min/max bound its corrupted line); `item` = an item property (`sockets`: min/max bound the
   * socket count, no bounds = at least one). All filtered by the market service.
   */
  kind: StatKind;
  /** PD2 modifier name (e.g. `item_fastercastrate`), pseudo id (e.g. `pseudo_total_res`), corruption name or item property. */
  key: string;
  min?: number;
  max?: number;
  /** Weight for stat-weighted sort; undefined/0 = not scored. */
  weight?: number;
  enabled: boolean;
  /**
   * Any-of block (1…MAX_OR_BLOCKS): each block matches when one of its enabled rows does. Rows with neither
   * `or` nor `not` are all required.
   */
  or?: number;
  /** Exclusion group: listings matching any enabled `not` row are left out. Never set together with `or`. */
  not?: boolean;
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
  /**
   * `live` = active listings, `archive` = ended ones (sold, removed, expired), like the site's Archive, `wanted` =
   * buy requests asking for what the filters describe (see `wanted`).
   */
  source: 'live' | 'archive' | 'wanted';
  hardcore: boolean;
  ladder: boolean;
  /** Exact item.name (unique/set/runeword/base name), site parity. */
  itemName?: string;
  /** Case-insensitive regex on the price note (site "Price" box). */
  priceText?: string;
  /** hr_price range (extension over the site). */
  hrMin?: number;
  hrMax?: number;
  /** `hrMax` is exclusive (`< hrMax`, a price chart bucket's upper edge) instead of `<=` (a typed max). */
  hrMaxExclusive?: boolean;
  /**
   * item.base.type_code: a type, a site `{"$in": [...]}` entry, a type group code (`group:bows`, type-groups.ts),
   * or several of them as the `{"$in": [...]}` of their type codes (type-selection.ts)
   */
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
  /** Seller name (website username or in-game account); queried when `sellerUserId` is not set. */
  sellerName?: string;
  requirements: Requirements;
  stats: StatFilter[];
  /** Archive only: the statuses to show (a subset of ARCHIVE_STATUSES). Absent = every one, like the site. */
  status?: MarketListingStatus[];
  /** Listing age window in days (`updated_at`); absent = every listing (the default). */
  maxAgeDays?: number;
  /** `key` (a property key or pseudo id) is required for `by: 'stat'` and ignored otherwise. */
  sort: { by: SortBy; dir: 'asc' | 'desc'; key?: string };
  /** The Wanted source's own filters (offer, requests, order); the market search never reads them. */
  wanted?: WantedFilters;
}

/** Wanted source filters beyond the shared ones (`sellerName` is the buyer there). */
export interface WantedFilters {
  /** Lowest offer, in `offerCurrency` (HR when unset). */
  minOffer?: number;
  offerCurrency?: WtbCurrency;
  /** Only requests the user's stash fits. */
  fitsStash?: boolean;
  /** Only the user's own requests (every status). */
  mine?: boolean;
  sort?: 'newest' | 'offer';
}

export interface StatOption {
  /** PD2 modifier name. */
  key: string;
  /** Site-style template, e.g. `+{X} Faster Cast Rate`. */
  label: string;
  /** Display group (Offense, Defense, Resists, Skills, Caster, Attributes, Utility, Charm/Misc, Corruption). */
  group: string;
}

/** A cube corruption the stat picker offers (`item.corruptions` value). */
export interface CorruptionOption {
  value: string;
  label: string;
  /** False when PD2 keeps no corrupted line to bound (sockets, dye…): presence only. */
  rolled: boolean;
}

/** An item property the stat picker offers (`item` rows). */
export interface ItemPropertyOption {
  property: ItemProperty;
  /** Template like the stat labels: `{X} Sockets`. */
  label: string;
  group: string;
}

export interface PseudoDef {
  id: string;
  label: string;
  group: string;
  /** Sum/derive from the listing's item modifiers. Return 0 when absent. */
  compute: (mods: Modifier[]) => number;
  /**
   * The pair pseudo whose low end this is (`pseudo_elemental_min_damage`): filtered through that row's pinned key
   * (`pseudo_elemental_max_damage{4..10}`), never picked or offered on its own.
   */
  lowEndOf?: string;
}

export interface StatPreset {
  id: string;
  name: string;
  builtIn: boolean;
  /** Optional Type value(s) this preset targets (type codes or type group codes); applied to filters when exactly one. */
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
  /** Market service rows (absent on rows scored in the overlay, e.g. favorites): the listing's state. */
  status?: MarketListingStatus;
  /** When it was listed (ISO); null when the service doesn't know. */
  listedAt?: string | null;
  /** When it sold / was removed / expired (ISO); null while active or unknown. */
  endedAt?: string | null;
  /** How long it was (or has been) up: listedAt → endedAt (→ now while active); null without both ends. */
  durationSeconds?: number | null;
}

/** The seller's last-seen times on a listing, as PD2 reports them now. */
export interface ListingPresence {
  user_last_online: string | null;
  user_last_ingame: string | null;
}

export interface SearchOptions {
  /** Results per page (1–100). Default 25. */
  pageSize?: number;
  /** 0-based page. */
  page?: number;
  signal?: AbortSignal;
  /** Facet counts to ask for with this page (the market browser's first page). */
  facets?: readonly MarketFacetName[];
  /** Ask for the price spread of every match with this page (the market browser's first page). */
  priceStats?: boolean;
}

export interface SearchResult {
  /** One page, filtered and ordered by the market service. */
  items: ScoredListing[];
  /** Matches across all pages; see `totalExact`. */
  total: number;
  /** False when `total` is a lower bound (the service's count cap) or an estimate (Seller online filters). */
  totalExact: boolean;
  /** Rows the service sent for this page, including any `items` leaves out; page on this. */
  fetched: number;
  mode: 'server';
  /** Facet counts, when `facets` were asked for. */
  facets?: MarketFacets;
  /** The price spread of every match, when `priceStats` was asked for. */
  priceStats?: MarketPriceStats;
}

/** Whether a listing is still on PD2, checked before acting on it; `listing` is PD2's current copy. */
export type ListingFreshness =
  | { status: 'ok'; listing: MarketListingEntry }
  | { status: 'gone' }
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
    opts: {
      page: number;
      limit: number;
      signal?: AbortSignal;
      facets?: readonly MarketFacetName[];
      priceStats?: boolean;
    },
  ) => Promise<{
    items: ScoredListing[];
    total: number;
    totalExact: boolean;
    fetched: number;
    facets?: MarketFacets;
    priceStats?: MarketPriceStats;
  }>;
  /** One live listing from PD2 (`GET market/listing/:id`); null when PD2 no longer has it. */
  getListing: (listingId: string) => Promise<MarketListingEntry | null>;
  /**
   * The sellers' current last-seen times on live listings (`GET market/listing?_id[$in]=…`, at most 50 ids), by
   * listing id; ids PD2 no longer lists are absent. Throws on any failure (401 included: it never starts a sign-in).
   */
  getListingPresence: (listingIds: string[]) => Promise<Map<string, ListingPresence>>;
  getMarketListings: (query: Record<string, unknown>) => Promise<MarketListingResult>;
  getMarketListingsArchive: (query: Record<string, unknown>) => Promise<MarketListingResult>;
  getFavorites: (opts?: { limit?: number; skip?: number }) => Promise<{ total: number; data: MarketFavorite[] }>;
  addFavorite: (listingId: string, sellerId: string) => Promise<MarketFavorite>;
  removeFavorite: (favoriteId: string) => Promise<void>;
  /**
   * Make an offer on a listing (site parity: POST market/offer `{listing_id, offer, hr_offer}`).
   * `price` is the offer text shown to the seller, `hrPrice` its optional HR value.
   */
  createOffer?: (listingId: string, offer: { price: string; hrPrice?: number }) => Promise<unknown>;
}

/** A saved search, kept locally (market-prefs.json). */
export interface SavedSearch {
  id: string;
  name: string;
  filters: MarketFilters;
  /** Watched: a popup for every new listing matching it (live search stream). */
  watching: boolean;
  createdAt: string;
  updatedAt: string;
  /** bumpedAt of the newest listing the watch has seen: a reconnect alerts only what was bumped after it. */
  lastSeenBumpedAt?: string;
}

export type MarketTab = 'search' | 'favorites' | 'saved';

/** Payload for `openPanel('market', payload)`. */
export interface MarketPanelPayload {
  /** Merged over defaults (not over current state) and searched immediately. */
  filters?: Partial<MarketFilters>;
  savedSearchId?: string;
  focusListingId?: string;
  tab?: MarketTab;
  /**
   * Opens Search on the Wanted source: the item a buy request asks for (it and its kind), the request in the
   * drawer; `itemText` (the price-checked item's clipboard JSON) offers "List it at {offer}"; `item` (the user's
   * listing it came from) is sent with a contact.
   */
  wanted?: { match: WtbItemMatch; itemText?: string; item?: object };
  /**
   * Opens a buy request by id (a response's View request): the user's own on Mine only, else as it stands on the
   * board in the user's realm; its drawer open.
   */
  requestId?: string;
}

/** Payload for `openPanel('listingDetail', payload)`: the listing drawer. */
export interface ListingPanelPayload {
  /** PD2 listing id, looked up on pd2trader.com. */
  listingId: string;
  /** The watch that found it: its pseudo stat totals show, as in the market browser. */
  savedSearchId?: string;
}
