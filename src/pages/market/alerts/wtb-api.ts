/**
 * Client for the pd2trader.com buy requests (`/api/market/wtb`, WTB contract). Authed calls send the user's PD2
 * access token (`Bearer`), like the saved searches import; errors are MarketApiError (`{ message }`, Retry-After).
 */
import { fetch } from '@/lib/browser-http';
import { BACKEND_URL } from '@/lib/pkce';
import { marketSearchBody } from '@/lib/market-search-api';
import type { MarketFilters } from '@/pages/market/lib/types';
import type {
  WtbCurrency,
  WtbExpiryDays,
  WtbItemMatch,
  WtbRealm,
  WtbRequest,
  WtbResponse,
  WtbSearchBody,
  WtbStatus,
} from '@/pages/market/lib/wtb';
import { isWtbResponse } from '@/pages/market/lib/wtb';
import { errorFrom } from './market-api';

const WTB_URL = `${BACKEND_URL}/api/market/wtb`;

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const json = { 'Content-Type': 'application/json' };

async function send<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) throw await errorFrom(response);
  return (response.status === 204 ? undefined : await response.json()) as T;
}

/**
 * The filters as the service takes them (the market search's own fields only, as a live search; the server
 * normalizes the rest).
 */
export const wtbFilters = (filters: MarketFilters): MarketFilters =>
  marketSearchBody({ ...filters, source: 'live' }, 0, 1).filters as unknown as MarketFilters;

export type WtbSort = 'newest' | 'offer';

export interface WtbSearchPage {
  items: WtbRequest[];
  nextCursor: string | null;
  total: number;
}

/**
 * The Wanted source (`POST /api/market/wtb/search`): requests asking for what `body` describes; `mine` needs the
 * token (401 without), and with one the caller's own requests come with their counts.
 */
export async function searchWtbRequests(
  body: WtbSearchBody,
  { token, signal }: { token?: string | null; signal?: AbortSignal } = {},
): Promise<WtbSearchPage> {
  const page = await send<Partial<WtbSearchPage>>(`${WTB_URL}/search`, {
    method: 'POST',
    headers: token ? { ...auth(token), ...json } : json,
    body: JSON.stringify(body),
    signal,
  });
  return {
    items: Array.isArray(page.items) ? page.items : [],
    nextCursor: page.nextCursor ?? null,
    total: typeof page.total === 'number' ? page.total : 0,
  };
}

/** The user's requests in every status (closed/expired kept 30 days), newest first, with their counts. */
export async function listMyWtbRequests(token: string): Promise<WtbRequest[]> {
  const body = await send<{ items?: WtbRequest[] }>(`${WTB_URL}/mine`, { headers: auth(token) });
  return Array.isArray(body.items) ? body.items : [];
}

export interface WtbDraft {
  title: string;
  whisperTo: string;
  filters: MarketFilters;
  niceToHaveIds: string[];
  offer: { amount: number; currency: WtbCurrency };
  openToOffers: boolean;
  expiresInDays: WtbExpiryDays;
}

/** Posts a request; 409 when the user already has MAX_OPEN_WTB_PER_USER open/paused ones. */
export function createWtbRequest(token: string, draft: WtbDraft): Promise<WtbRequest> {
  return send<WtbRequest>(WTB_URL, {
    method: 'POST',
    headers: { ...auth(token), ...json },
    body: JSON.stringify({ ...draft, filters: wtbFilters(draft.filters) }),
  });
}

export interface WtbPatch {
  title?: string;
  whisperTo?: string;
  filters?: MarketFilters;
  niceToHaveIds?: string[];
  offer?: { amount: number; currency: WtbCurrency };
  openToOffers?: boolean;
  status?: Exclude<WtbStatus, 'expired'>;
  /** How long the next bump runs it for (does not move its expiry). */
  expiryDays?: WtbExpiryDays;
  /** Mark filled: the response that filled it (with `status: 'closed'`, kept for history). */
  filledByResponseId?: string;
}

/** Edits, pauses, resumes or closes one of the user's requests (404 when not theirs). */
export function updateWtbRequest(token: string, id: string, patch: WtbPatch): Promise<WtbRequest> {
  return send<WtbRequest>(`${WTB_URL}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { ...auth(token), ...json },
    body: JSON.stringify(patch.filters ? { ...patch, filters: wtbFilters(patch.filters) } : patch),
  });
}

/**
 * Bumps one of the user's requests to the top of Newest and restarts its expiry (`expiryDays`); revives an
 * expired one. 429 (with `nextBumpAt`) while cooling down, 409 at the open cap or when closed.
 */
export function bumpWtbRequest(token: string, id: string): Promise<WtbRequest> {
  return send<WtbRequest>(`${WTB_URL}/${encodeURIComponent(id)}/bump`, { method: 'POST', headers: auth(token) });
}

export function deleteWtbRequest(token: string, id: string): Promise<void> {
  return send<void>(`${WTB_URL}/${encodeURIComponent(id)}`, { method: 'DELETE', headers: auth(token) });
}

/** One item to match: the raw clipboard JSON (`text`) or a PD2 item object (a listing's or stash item). */
export type WtbMatchItem = { key: string; text: string } | { key: string; item: object };

/**
 * The open requests each item matches (only keys with a match; best offer first, at most 10 each). With a token
 * the user's own requests are left out; `countViews` counts a view on each returned request (price check, list
 * item).
 */
export async function matchWtbRequests(
  realm: WtbRealm,
  items: readonly WtbMatchItem[],
  { token, countViews = false, signal }: { token?: string | null; countViews?: boolean; signal?: AbortSignal } = {},
): Promise<Map<string, WtbItemMatch[]>> {
  const body = await send<{ results?: { key: string; requests?: WtbItemMatch[] }[] }>(`${WTB_URL}/match`, {
    method: 'POST',
    headers: token ? { ...auth(token), ...json } : json,
    body: JSON.stringify({ ladder: realm.ladder, hardcore: realm.hardcore, items, ...(countViews && { countViews }) }),
    signal,
  });
  const out = new Map<string, WtbItemMatch[]>();
  for (const result of body.results ?? []) {
    if (result?.key && result.requests?.length) out.set(result.key, result.requests);
  }
  return out;
}

/** How a seller reached the buyer: the website chat (`message`), or the game chat whisper (copied, `copy`). */
export type WtbContactChannel = 'message' | 'copy';

/** The item a seller has for a request: the raw clipboard JSON (`text`) or a PD2 item object (stash / listing). */
export type WtbContactItem = { text: string } | { item: object };

/** The `/contact` body: the channel, the seller's selected account, and the item when the source has one. */
export interface WtbContact {
  channel: WtbContactChannel;
  account?: string;
  text?: string;
  item?: object;
}

export function wtbContactBody(
  channel: WtbContactChannel,
  item: WtbContactItem | null | undefined,
  account: string | null | undefined,
): WtbContact {
  return { channel, ...(account && { account }), ...item };
}

/**
 * A seller contacting the buyer (Whisper / Copy whisper): counted; signed in, also a response the buyer is told
 * about (with the item when sent; the user's own request: counted only).
 */
export function contactWtbRequest(id: string, contact: WtbContact, token: string | null): Promise<void> {
  return send<void>(`${WTB_URL}/${encodeURIComponent(id)}/contact`, {
    method: 'POST',
    headers: token ? { ...auth(token), ...json } : json,
    body: JSON.stringify(contact),
  });
}

export interface WtbResponsePage {
  items: WtbResponse[];
  nextCursor: string | null;
}

/** Responses on the user's requests (`received`, optionally one request's) or theirs to others' (`made`), newest first. */
export async function listWtbResponses(
  token: string,
  query: { direction: 'received' | 'made'; requestId?: string; cursor?: string; limit?: number },
  signal?: AbortSignal,
): Promise<WtbResponsePage> {
  const params = new URLSearchParams({ direction: query.direction });
  if (query.requestId) params.set('requestId', query.requestId);
  if (query.cursor) params.set('cursor', query.cursor);
  if (query.limit) params.set('limit', String(query.limit));
  const page = await send<Partial<WtbResponsePage>>(`${WTB_URL}/responses?${params}`, { headers: auth(token), signal });
  return {
    items: Array.isArray(page.items) ? page.items.filter(isWtbResponse) : [],
    nextCursor: page.nextCursor ?? null,
  };
}

/** Hides a response on one of the user's requests (receiver only). */
export function dismissWtbResponse(token: string, id: string): Promise<WtbResponse> {
  return send<WtbResponse>(`${WTB_URL}/responses/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { ...auth(token), ...json },
    body: JSON.stringify({ dismissed: true }),
  });
}

/** "Sell for {offer}": the item (when the source has one), the seller's account, and a price / note when asked. */
export interface WtbOfferBody {
  item?: object;
  text?: string;
  account?: string;
  /** None: the request's offer. Another price needs the request open to offers (else 400 `fixedPrice`). */
  price?: { amount: number; currency: WtbCurrency };
  note?: string;
}

export function wtbOfferBody(
  item: WtbContactItem | null | undefined,
  account: string | null | undefined,
  ask?: { price: { amount: number; currency: WtbCurrency }; note?: string },
): WtbOfferBody {
  const note = ask?.note?.trim();
  return { ...item, ...(account && { account }), ...(ask && { price: ask.price }), ...(note && { note }) };
}

/**
 * Offers to sell the buyer what they asked for (a response of kind `offer`; replaces the seller's pending one).
 * 400 `fixedPrice` (another price on a request not open to offers) or own request, 409 not open, 429 throttled.
 */
export function offerWtbRequest(token: string, id: string, body: WtbOfferBody): Promise<WtbResponse> {
  return send<WtbResponse>(`${WTB_URL}/${encodeURIComponent(id)}/offers`, {
    method: 'POST',
    headers: { ...auth(token), ...json },
    body: JSON.stringify(body),
  });
}

/** The buyer accepts / declines a pending offer, or the seller withdraws theirs (404 / 409 otherwise). */
export function decideWtbOffer(
  token: string,
  responseId: string,
  decision: 'accept' | 'decline' | 'withdraw',
): Promise<WtbResponse> {
  return send<WtbResponse>(`${WTB_URL}/responses/${encodeURIComponent(responseId)}/${decision}`, {
    method: 'POST',
    headers: auth(token),
  });
}
