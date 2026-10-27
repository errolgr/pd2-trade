/**
 * Client for the pd2trader market service listing search (`POST /api/market/search`). Wire shapes mirror the
 * server's src/market-listings/dto.ts and search.responses.ts; keep them in sync.
 */
import { fetch } from '@/lib/browser-http';
import { BACKEND_URL } from '@/lib/pkce';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { MAX_FILTER_TEXT, MAX_SELLER_NAME } from '@/pages/market/lib/defaults';
import type { MarketFilters, ScoredListing } from '@/pages/market/lib/types';

/** A search that hasn't answered by then counts as the service being unavailable. */
export const MARKET_SEARCH_TIMEOUT_MS = 8000;

/**
 * The market service couldn't answer a search. `unavailable`: unreachable, timed out, 5xx or an unreadable
 * reply; `rate-limited`: 429 (`retryAfterMs` when the server said); `invalid`: it rejected the filters (400).
 */
export class MarketBackendError extends Error {
  constructor(
    message: string,
    public readonly kind: 'unavailable' | 'rate-limited' | 'invalid',
    public readonly status?: number,
    public readonly retryAfterMs?: number,
  ) {
    super(message);
    this.name = 'MarketBackendError';
    Object.setPrototypeOf(this, MarketBackendError.prototype);
  }
}

export interface MarketSearchPage {
  items: ScoredListing[];
  total: number;
  /**
   * False when `total` isn't an exact count: the service stops counting at its cap (`total` is then a lower
   * bound) or, with a Seller online filter, estimated it from the listings it read. Older services omit it: exact.
   */
  totalExact: boolean;
}

/**
 * The request body: exactly the fields the service accepts (it rejects unknown ones), so filters restored from
 * older saved state can't break a search. `sort.key` only travels with a stat sort.
 */
export function marketSearchBody(filters: MarketFilters, page: number, limit: number) {
  const f = filters;
  return {
    filters: {
      source: f.source,
      hardcore: f.hardcore,
      ladder: f.ladder,
      itemName: f.itemName,
      priceText: f.priceText?.slice(0, MAX_FILTER_TEXT),
      hrMin: f.hrMin,
      hrMax: f.hrMax,
      typeCode: f.typeCode,
      baseCode: f.baseCode,
      rarity: f.rarity,
      ethereal: f.ethereal,
      corrupted: f.corrupted,
      desecrated: f.desecrated,
      identified: f.identified,
      socketsMin: f.socketsMin,
      socketsMax: f.socketsMax,
      userOnlineSite: f.userOnlineSite,
      userOnlineGame: f.userOnlineGame,
      hasBuyout: f.hasBuyout,
      sellerUserId: f.sellerUserId,
      sellerName: f.sellerUserId ? undefined : f.sellerName?.slice(0, MAX_SELLER_NAME),
      requirements: {
        class: f.requirements.class,
        levelMin: f.requirements.levelMin,
        levelMax: f.requirements.levelMax,
        strMin: f.requirements.strMin,
        strMax: f.requirements.strMax,
        dexMin: f.requirements.dexMin,
        dexMax: f.requirements.dexMax,
      },
      // A row added before its stat is picked has no key yet: the service would reject it
      stats: f.stats
        .filter((s) => s.key.trim() !== '')
        .map((s) => ({
          id: s.id,
          kind: s.kind,
          key: s.key,
          min: s.min,
          max: s.max,
          weight: s.weight,
          enabled: s.enabled,
          or: s.or || undefined,
        })),
      maxAgeDays: f.maxAgeDays,
      sort: { by: f.sort.by, dir: f.sort.dir, key: f.sort.by === 'stat' ? f.sort.key : undefined },
    },
    page,
    limit,
  };
}

const finiteOrNull = (n: unknown): number | null => (typeof n === 'number' && Number.isFinite(n) ? n : null);

function parsePage(body: unknown): MarketSearchPage {
  if (!body || typeof body !== 'object' || !('items' in body) || !Array.isArray(body.items)) {
    throw new MarketBackendError('The market service sent an unreadable reply.', 'unavailable');
  }
  const total = 'total' in body ? finiteOrNull(body.total) : null;
  const totalExact = !('totalExact' in body) || body.totalExact !== false;
  const items: ScoredListing[] = [];
  for (const row of body.items as unknown[]) {
    if (!row || typeof row !== 'object' || !('listing' in row)) continue;
    const listing = row.listing as MarketListingEntry;
    if (!listing?._id) continue;
    const pseudo =
      'pseudo' in row && row.pseudo && typeof row.pseudo === 'object' ? (row.pseudo as Record<string, number>) : {};
    items.push({
      listing,
      pseudo,
      score: 'score' in row ? finiteOrNull(row.score) : null,
      value: 'value' in row ? finiteOrNull(row.value) : null,
    });
  }
  return { items, total: total ?? items.length, totalExact };
}

async function errorMessage(response: Response): Promise<string | null> {
  try {
    const body = await response.json();
    const message = body?.message;
    return Array.isArray(message) ? message.join(', ') : typeof message === 'string' ? message : null;
  } catch {
    return null;
  }
}

/**
 * One page of listings from the market service. Rejects with MarketBackendError (see its kinds) or, when `signal`
 * aborts, with the abort reason.
 */
export async function searchMarketListings(
  filters: MarketFilters,
  { page, limit, signal }: { page: number; limit: number; signal?: AbortSignal },
): Promise<MarketSearchPage> {
  if (signal?.aborted) throw signal.reason;
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, MARKET_SEARCH_TIMEOUT_MS);
  const forwardAbort = () => controller.abort(signal?.reason);
  signal?.addEventListener('abort', forwardAbort, { once: true });

  try {
    let response: Response;
    try {
      response = await fetch(`${BACKEND_URL}/api/market/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(marketSearchBody(filters, page, limit)),
        signal: controller.signal,
      });
    } catch {
      if (signal?.aborted) throw signal.reason;
      throw new MarketBackendError(
        timedOut ? 'The market service took too long to answer.' : "Couldn't reach the market service.",
        'unavailable',
      );
    }

    if (response.status === 429) {
      const seconds = Number(response.headers.get('retry-after'));
      throw new MarketBackendError(
        'Too many market searches; wait a moment.',
        'rate-limited',
        429,
        Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : undefined,
      );
    }
    if (response.status === 400) {
      const message = await errorMessage(response);
      throw new MarketBackendError(message ?? 'The market service rejected these filters.', 'invalid', 400);
    }
    if (!response.ok) {
      throw new MarketBackendError(`The market service answered ${response.status}.`, 'unavailable', response.status);
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      if (signal?.aborted) throw signal.reason;
      throw new MarketBackendError(
        timedOut ? 'The market service took too long to answer.' : 'The market service sent an unreadable reply.',
        'unavailable',
        response.status,
      );
    }
    return parsePage(body);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', forwardAbort);
  }
}
