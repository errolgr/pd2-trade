/**
 * Client for the pd2trader.com market saved searches (`/api/market/saved-searches*`): CRUD, alert history and the
 * live alert stream, plus the public listing lookup alerts link to. Auth: `Bearer <PD2 access token>`.
 */
import { fetch } from '@/lib/browser-http';
import { BACKEND_URL } from '@/lib/pkce';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import type { MarketFilters, SavedSearch } from '@/pages/market/lib/types';

/** Compact listing of a `market.alert`. */
export interface MarketListingSummary {
  id: string;
  isLadder: boolean;
  isHardcore: boolean;
  name: string | null;
  baseName: string | null;
  baseCode: string | null;
  typeCode: string | null;
  quality: string | null;
  price: string | null;
  hrPrice: number | null;
  bumpedAt: string | null;
  seller: string | null;
  status: string;
  soldHr: number | null;
}

/** `event: market.alert` on the stream; also the items of the alert history. */
export interface MarketAlert {
  id: string;
  savedSearchId: string;
  savedSearchName: string;
  listingId: string;
  listing: MarketListingSummary;
  matchedAt: string;
}

export interface SavedSearchLimits {
  maxSearches: number;
  maxAlerting: number;
}

export const DEFAULT_LIMITS: SavedSearchLimits = { maxSearches: 25, maxAlerting: 10 };

export class SavedSearchApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    /** From a 429/503 `Retry-After` header. */
    public readonly retryAfterMs: number | null = null,
  ) {
    super(message);
    this.name = 'SavedSearchApiError';
  }
}

const BASE = '/api/market/saved-searches';

async function errorFrom(response: Response): Promise<SavedSearchApiError> {
  let message = `Saved searches API ${response.status}`;
  try {
    const body = await response.json();
    if (body?.message) message = Array.isArray(body.message) ? body.message.join(', ') : String(body.message);
  } catch {
    // non-JSON error body
  }
  const retryAfter = Number(response.headers?.get('retry-after'));
  return new SavedSearchApiError(
    message,
    response.status,
    Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : null,
  );
}

async function request<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (init.body) headers['Content-Type'] = 'application/json';
  const response = await fetch(`${BACKEND_URL}${path}`, { ...init, headers });
  if (!response.ok) throw await errorFrom(response);
  return (await response.json()) as T;
}

export function listSavedSearches(token: string): Promise<{ items: SavedSearch[]; limits: SavedSearchLimits }> {
  return request(BASE, token);
}

export function createSavedSearch(
  token: string,
  body: { name?: string; filters: MarketFilters; alert?: boolean },
): Promise<SavedSearch> {
  return request(BASE, token, { method: 'POST', body: JSON.stringify(body) });
}

export function updateSavedSearch(
  token: string,
  id: string,
  patch: Partial<Pick<SavedSearch, 'name' | 'filters' | 'alert'>>,
): Promise<SavedSearch> {
  return request(`${BASE}/${encodeURIComponent(id)}`, token, { method: 'PATCH', body: JSON.stringify(patch) });
}

export function deleteSavedSearch(token: string, id: string): Promise<{ deleted: true; id: string }> {
  return request(`${BASE}/${encodeURIComponent(id)}`, token, { method: 'DELETE' });
}

/** Alerts matched after `since` (ISO), newest first. */
export function listMarketAlerts(token: string, since?: string, limit = 100): Promise<{ items: MarketAlert[] }> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (since) params.set('since', since);
  return request(`${BASE}/alerts?${params}`, token);
}

/** Opens the live alert stream (`text/event-stream`); throws SavedSearchApiError on a non-2xx answer. */
export async function openAlertStream(token: string, signal: AbortSignal): Promise<Response> {
  const response = await fetch(`${BACKEND_URL}${BASE}/stream`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
    signal,
  });
  if (!response.ok) throw await errorFrom(response);
  return response;
}

/** Whether a looked-up listing is still for sale. */
export type MarketListingStatus = 'active' | 'sold' | 'removed';

/** `GET /api/market/listing/:id`: the listing and whether it is still for sale. */
export interface MarketListingDetail {
  listing: MarketListingEntry;
  status: MarketListingStatus;
}

/** One listing by its PD2 id from pd2trader.com (also sold/removed ones, kept 30 days); null when unknown. */
export async function fetchMarketListing(id: string): Promise<MarketListingDetail | null> {
  const response = await fetch(`${BACKEND_URL}/api/market/listing/${encodeURIComponent(id)}`);
  if (response.status === 404 || response.status === 400) return null;
  if (!response.ok) throw await errorFrom(response);
  const body = (await response.json()) as { listing?: MarketListingEntry; status?: MarketListingStatus };
  return body.listing ? { listing: body.listing, status: body.status ?? 'active' } : null;
}
