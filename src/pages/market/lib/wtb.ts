/**
 * WTB buy requests: a market search a buyer wants matched plus an offer (pd2trader.com `/api/market/wtb`). Wire
 * types mirror the server contract (local wtb-contract v1); keep them in sync. Pure: no React.
 */
import { whisperCommand } from '@/lib/whisper-history';
import { groupOf } from './stat-groups';
import type { MarketFilters, StatFilter } from './types';

export const WTB_CURRENCIES = [
  'HR',
  'Zod',
  'Cham',
  'Jah',
  'Ber',
  'Sur',
  'Lo',
  'Ohm',
  'Vex',
  'Gul',
  'Ist',
  'Mal',
  'Um',
  'Pul',
  'Lem',
] as const;
export type WtbCurrency = (typeof WTB_CURRENCIES)[number];

/** The currency picker's options: rune art for runes (bundled `/runes`), none for HR. */
export const WTB_CURRENCY_OPTIONS = WTB_CURRENCIES.map((c) => ({
  value: c,
  label: c,
  icon: c === 'HR' ? undefined : `/runes/${c}_Rune.png`,
}));

export type WtbStatus = 'open' | 'paused' | 'closed' | 'expired';

export const WTB_EXPIRY_DAYS = [1, 3, 7, 14] as const;
export type WtbExpiryDays = (typeof WTB_EXPIRY_DAYS)[number];
export const DEFAULT_WTB_EXPIRY_DAYS: WtbExpiryDays = 7;

/** Open + paused requests one user may have (the server answers 409 beyond). */
export const MAX_OPEN_WTB_PER_USER = 10;
export const MAX_WTB_TITLE = 80;
export const MAX_WTB_OFFER = 1000;
/** Items one `/match` call takes. */
export const MAX_WTB_MATCH_ITEMS = 300;

export interface WtbOffer {
  amount: number;
  currency: WtbCurrency;
  /** The offer in HR (server rune prices); null when unknown. */
  hr: number | null;
}

export interface WtbRequest {
  id: string;
  /** PD2 website user id + username. */
  buyer: { userId: string; name: string };
  /** In-game account: sellers whisper `/w *<whisperTo> …`. */
  whisperTo: string;
  title: string;
  /** Normalized by the server (live source, neutral listing fields). */
  filters: MarketFilters;
  /** Stat row ids that are optional: shown (✓/○), never matched. */
  niceToHaveIds: string[];
  offer: WtbOffer;
  openToOffers: boolean;
  status: WtbStatus;
  createdAt: string;
  updatedAt: string;
  /** The last bump (= createdAt until the first): Newest orders by it. */
  bumpedAt: string;
  expiresAt: string;
  /** How long each bump runs it for (chosen at post / edit). */
  expiryDays: WtbExpiryDays;
  /** Owner responses: when the next bump is allowed; null when it is now or the request expired. */
  nextBumpAt?: string | null;
  /** The owner's own requests only (mine / create / patch). */
  counts?: { views: number; contacts: number };
}

/** A request an item matched, and which of its optional rows the item meets. */
export interface WtbItemMatch {
  request: WtbRequest;
  niceToHave: { id: string; met: boolean }[];
}

/**
 * A seller's response to a buy request (they whispered / copied the whisper, signed in): who, the item they have
 * when they sent one (re-checked by the server; null: a plain whisper), and the request's rows with its values.
 */
export interface WtbResponse {
  id: string;
  requestId: string;
  request: {
    id: string;
    title: string;
    offer: WtbOffer;
    status: WtbStatus;
    /** The request's buyer and the account sellers whisper. */
    buyer: { userId: string; name: string };
    whisperTo: string;
  };
  seller: { userId: string; name: string; account: string | null };
  item: { name: string; quality: string | null; baseCode: string | null; art?: object } | null;
  met: { id: string; label: string; value: number | null; met: boolean }[];
  channel: 'whisper' | 'copy' | 'message';
  createdAt: string;
  dismissed: boolean;
}

/** A pushed or listed response whole enough to show (a malformed row is skipped, never shown half). */
export function isWtbResponse(value: unknown): value is WtbResponse {
  const r = value as Partial<WtbResponse> | null;
  return (
    !!r &&
    typeof r.id === 'string' &&
    typeof r.requestId === 'string' &&
    typeof r.createdAt === 'string' &&
    typeof r.request?.title === 'string' &&
    !!r.request.offer &&
    typeof r.request.buyer?.userId === 'string' &&
    typeof r.seller?.userId === 'string' &&
    typeof r.seller.name === 'string' &&
    Array.isArray(r.met)
  );
}

export type WtbRealm = { ladder: boolean; hardcore: boolean };

/** Every stat row a request shows: enabled rows with a stat picked. */
export const wtbStatRows = (filters: Pick<MarketFilters, 'stats'>): StatFilter[] =>
  (filters.stats ?? []).filter((s) => s.enabled && s.key.trim() !== '');

/** Must ⇄ Nice for one stat row. */
export function toggleNiceToHave(ids: readonly string[], rowId: string): string[] {
  return ids.includes(rowId) ? ids.filter((id) => id !== rowId) : [...ids, rowId];
}

/** The ids still pointing at an enabled stat row of `filters` (rows removed or disabled since drop out). */
export function niceToHaveIdsFor(filters: Pick<MarketFilters, 'stats'>, ids: readonly string[]): string[] {
  const rows = new Set(wtbStatRows(filters).map((s) => s.id));
  return ids.filter((id) => rows.has(id));
}

/** The rows a matching item must meet: required (not any-of, not excluded) and not nice-to-have. */
export function requiredRows(filters: Pick<MarketFilters, 'stats'>, niceToHaveIds: readonly string[]): StatFilter[] {
  return wtbStatRows(filters).filter((s) => groupOf(s) === 'and' && !niceToHaveIds.includes(s.id));
}

/** Why a request can't be posted (`WTB_POST_RULE` v2; the server answers 400 with this `rule`). */
export type WtbPostBlocker = 'item' | 'detail';

/** A server `rule` this client can explain. */
export const isPostBlocker = (rule: string | null | undefined): rule is WtbPostBlocker =>
  rule === 'item' || rule === 'detail';

/**
 * The filters name an item (its name, base or type): what demand (overlapping requests) is read for. Stats alone
 * would be anything's demand; a type alone ("Circlet") is fine to read, even though it can't be posted as is.
 */
export const wtbItemScoped = (filters: Pick<MarketFilters, 'itemName' | 'baseCode' | 'typeCode'>): boolean =>
  !!(filters.itemName || filters.baseCode || filters.typeCode);

/**
 * What a request still lacks, null when it can be posted (WTB_POST_RULE v2, mirrored from the server): `item`
 * without an item name, base or type; `detail` when no item name is set and it wants neither a required stat row
 * (not nice-to-have, any-of or excluded) nor a socket count nor ethereal. Rarity alone doesn't count.
 */
export function postBlocker(filters: MarketFilters, niceToHaveIds: readonly string[]): WtbPostBlocker | null {
  if (!wtbItemScoped(filters)) return 'item';
  if (filters.itemName) return null;
  const detailed =
    requiredRows(filters, niceToHaveIds).length > 0 ||
    filters.socketsMin !== undefined ||
    filters.socketsMax !== undefined ||
    filters.ethereal === 'yes';
  return detailed ? null : 'detail';
}

/** An offer the server takes: above 0, at most MAX_WTB_OFFER, at most 2 decimals. */
export function isValidOfferAmount(amount: number | undefined): amount is number {
  return (
    typeof amount === 'number' &&
    Number.isFinite(amount) &&
    amount > 0 &&
    amount <= MAX_WTB_OFFER &&
    Math.abs(amount * 100 - Math.round(amount * 100)) < 1e-6
  );
}

/** "2 HR", "1.5 Ber". */
export const formatOffer = (offer: Pick<WtbOffer, 'amount' | 'currency'>): string =>
  `${Math.round(offer.amount * 100) / 100} ${offer.currency}`;

/** One line, no control characters, bounded (titles are user text). */
function oneLine(text: string, max = MAX_WTB_TITLE): string {
  const clean = Array.from(text, (ch) => (ch.charCodeAt(0) < 0x20 || ch.charCodeAt(0) === 0x7f ? ' ' : ch))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

/** The whisper's message: `Hi! I have the {title} you want for {amount} {currency} (pd2trader)`. */
export const wtbWhisperText = (request: Pick<WtbRequest, 'title' | 'offer'>): string =>
  `Hi! I have the ${oneLine(request.title)} you want for ${formatOffer(request.offer)} (pd2trader)`;

/** The game chat command a seller sends the buyer: `/w *{whisperTo} {wtbWhisperText}`. */
export const wtbWhisper = (request: Pick<WtbRequest, 'whisperTo' | 'title' | 'offer'>): string =>
  whisperCommand(oneLine(request.whisperTo), wtbWhisperText(request));

/** The account the buyer whispers back: the seller's selected one, else their name. */
export const wtbResponseAccount = (response: Pick<WtbResponse, 'seller'>): string =>
  oneLine(response.seller.account || response.seller.name);

/** The buyer's reply to a response: "Hi! About my {title} request — still have the {item}?" (or "…one?"). */
export const wtbBackWhisperText = (response: Pick<WtbResponse, 'request' | 'item'>): string =>
  response.item
    ? `Hi! About my ${oneLine(response.request.title)} request — still have the ${oneLine(response.item.name)}?`
    : `Hi! About my ${oneLine(response.request.title)} request — still have one?`;

/** `/w *{seller account} {wtbBackWhisperText}`. */
export const wtbBackWhisper = (response: Pick<WtbResponse, 'seller' | 'request' | 'item'>): string =>
  whisperCommand(wtbResponseAccount(response), wtbBackWhisperText(response));

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days left (rounded up) before the request expires; 0 once past. */
export function wtbDaysLeft(request: Pick<WtbRequest, 'expiresAt'>, now: number): number {
  const at = Date.parse(request.expiresAt);
  return Number.isFinite(at) ? Math.max(0, Math.ceil((at - now) / DAY_MS)) : 0;
}

/** Expired by status, or open/paused past its expiry. */
export const wtbExpired = (request: Pick<WtbRequest, 'status' | 'expiresAt'>, now: number): boolean =>
  request.status === 'expired' || (request.status !== 'closed' && Date.parse(request.expiresAt) <= now);

/** Live or paused with at most a day left: worth renewing. */
export const wtbExpiringSoon = (request: Pick<WtbRequest, 'status' | 'expiresAt'>, now: number): boolean =>
  !wtbExpired(request, now) && request.status !== 'closed' && Date.parse(request.expiresAt) - now <= DAY_MS;

/** Open and paused requests count toward MAX_OPEN_WTB_PER_USER. */
export const countsTowardCap = (request: Pick<WtbRequest, 'status' | 'expiresAt'>, now: number): boolean =>
  (request.status === 'open' || request.status === 'paused') && !wtbExpired(request, now);

/** What "List at {offer}" puts in the list-item form: an HR price, or a note when the offer has none. */
export type WtbListPrice = { price: number } | { note: string };

export function listPriceFor(offer: WtbOffer): WtbListPrice {
  if (offer.currency === 'HR') return { price: Math.round(offer.amount * 100) / 100 };
  if (offer.hr !== null && offer.hr > 0) return { price: Math.round(offer.hr * 100) / 100 };
  return { note: formatOffer(offer) };
}

/**
 * Search filters for a request (Mine → Edit loads them into Search): `base` (the user's fresh search for the realm)
 * with the request's item fields on top; listing-only fields (seller, online, age, sort) stay the user's.
 */
export function wtbSearchFilters(request: Pick<WtbRequest, 'filters'>, base: MarketFilters): MarketFilters {
  const f = request.filters;
  return {
    ...base,
    source: 'live',
    ladder: f.ladder,
    hardcore: f.hardcore,
    itemName: f.itemName,
    typeCode: f.typeCode,
    baseCode: f.baseCode,
    rarity: f.rarity ?? [],
    ethereal: f.ethereal ?? 'any',
    corrupted: f.corrupted ?? 'any',
    desecrated: f.desecrated ?? 'any',
    identified: f.identified ?? 'any',
    socketsMin: f.socketsMin,
    socketsMax: f.socketsMax,
    requirements: f.requirements ?? {},
    stats: f.stats ?? [],
  };
}

/** Requests that matched an item first by their best offer (HR, unknown last), then newest. */
export function byBestOffer(a: WtbItemMatch, b: WtbItemMatch): number {
  const ah = a.request.offer.hr ?? -1;
  const bh = b.request.offer.hr ?? -1;
  return bh - ah || Date.parse(b.request.createdAt) - Date.parse(a.request.createdAt);
}

/** Banner figures for the requests one item matched. */
export interface WtbMatchSummary {
  count: number;
  /** The best offer. */
  best: WtbItemMatch;
  /** The best request's stat rows (required + nice-to-have) and how many the item meets. */
  total: number;
  met: number;
}

export function matchSummary(matches: readonly WtbItemMatch[]): WtbMatchSummary | null {
  if (matches.length === 0) return null;
  const best = [...matches].sort(byBestOffer)[0];
  // An exact match meets every required row; nice-to-have rows count as met when the item has them
  const required = requiredRows(best.request.filters, best.request.niceToHaveIds).length;
  const nice = best.niceToHave.filter((n) => n.met).length;
  return { count: matches.length, best, total: required + best.niceToHave.length, met: required + nice };
}

/** Request ids one Wanted search can be restricted to (Fits my stash). */
export const MAX_WTB_SEARCH_IDS = 500;

/** `POST /api/market/wtb/search`: the Wanted source's query (requests that ask for what the filters describe). */
export interface WtbSearchBody {
  ladder: boolean;
  hardcore: boolean;
  itemName?: string;
  typeCode?: string;
  baseCode?: string;
  rarity?: MarketFilters['rarity'];
  stats?: { kind: StatFilter['kind']; key: string; min?: number; max?: number }[];
  minOfferHr?: number;
  buyer?: string;
  mine?: boolean;
  ids?: string[];
  sort?: 'newest' | 'offer';
  /** Overlap semantics (could take an item the search finds) instead of "asks for". */
  overlap?: boolean;
  cursor?: string;
  limit?: number;
}

/** A rune's HR value as the price check knows it (`name` like "Ber Rune"). */
export interface RuneHrValue {
  name: string;
  price: number;
}

/** `amount` of `currency` in HR: HR as is, runes at `runeValues` (the price check's rune prices); null when unknown. */
export function offerToHr(amount: number, currency: WtbCurrency, runeValues: readonly RuneHrValue[]): number | null {
  if (currency === 'HR') return amount;
  const rune = runeValues.find((r) => r.name === `${currency} Rune`);
  return rune && rune.price > 0 ? Math.round(amount * rune.price * 1000) / 1000 : null;
}

/** The item fields and required stat rows of `f` as a Wanted search says them (both semantics). */
function searchedItem(f: MarketFilters): Omit<WtbSearchBody, 'sort' | 'cursor' | 'limit'> {
  const stats = wtbStatRows(f)
    .filter((s) => groupOf(s) === 'and')
    .map(({ kind, key, min, max }) => ({
      kind,
      key,
      ...(min !== undefined && { min }),
      ...(max !== undefined && { max }),
    }));
  return {
    ladder: f.ladder,
    hardcore: f.hardcore,
    ...(f.itemName && { itemName: f.itemName }),
    ...(f.typeCode && { typeCode: f.typeCode }),
    ...(f.baseCode && { baseCode: f.baseCode }),
    ...(f.rarity.length > 0 && { rarity: f.rarity }),
    ...(stats.length > 0 && { stats }),
  };
}

/**
 * The Wanted search for `f`: the item fields and required stat rows (any-of and excluded rows can't say what a
 * request asks for), the lowest offer in HR, the buyer (`sellerName`), Mine only, and Fits my stash as the ids
 * the stash matched (`stashIds`, null while unknown: none sent).
 */
export function wtbSearchBody(
  f: MarketFilters,
  {
    stashIds,
    runeValues,
    cursor,
    limit,
  }: { stashIds: readonly string[] | null; runeValues: readonly RuneHrValue[]; cursor?: string | null; limit?: number },
): WtbSearchBody {
  const w = f.wanted ?? {};
  const minOfferHr = w.minOffer && w.minOffer > 0 ? offerToHr(w.minOffer, w.offerCurrency ?? 'HR', runeValues) : null;
  const buyer = f.sellerName?.trim();
  return {
    ...searchedItem(f),
    ...(minOfferHr !== null && { minOfferHr }),
    ...(buyer && { buyer }),
    ...(w.mine && { mine: true }),
    ...(w.fitsStash && stashIds && { ids: stashIds.slice(0, MAX_WTB_SEARCH_IDS) }),
    sort: w.sort ?? 'newest',
    ...(cursor && { cursor }),
    ...(limit && { limit }),
  };
}

/**
 * The open requests that could take an item `f` finds (`overlap`: ranges intersect, rows only one side has don't
 * exclude), best offer first: the demand bar and the post drawer's "Others want this too". Seller, price and
 * listing fields don't apply; `mine`: only the user's own.
 */
export function wtbOverlapBody(
  f: MarketFilters,
  { limit, mine = false }: { limit: number; mine?: boolean },
): WtbSearchBody {
  return { ...searchedItem(f), overlap: true, ...(mine && { mine: true }), sort: 'offer', limit };
}

/**
 * The Wanted source on what a request asks for (an alert's "All requests", a "{n} buyers" badge): `base` with the
 * request's item, kind and realm, and nothing narrower, so similar requests show too.
 */
export function wtbBoardFilters(request: Pick<WtbRequest, 'filters'>, base: MarketFilters): MarketFilters {
  const f = request.filters;
  return {
    ...base,
    source: 'wanted',
    ladder: f.ladder,
    hardcore: f.hardcore,
    itemName: f.itemName,
    typeCode: f.typeCode,
    baseCode: f.baseCode,
    stats: [],
  };
}
