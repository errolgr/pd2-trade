/**
 * Resolves an in-game account to its pd2trader.com user by asking the market service for one live listing
 * from that seller. `sellerName` also matches website usernames, so a hit only counts when the listing shows
 * the account itself (the user's game accounts, linked in-game account or the item's `account_id`).
 */
import { fetch } from '@/lib/browser-http';
import { BACKEND_URL } from '@/lib/pkce';
import { MAX_SELLER_NAME } from '@/pages/market/lib/defaults';

export interface ResolvedSeller {
  userId: string;
  username: string;
  /** `user.game.accounts` of the matched listing, as PD2 cases them, plus the looked-up account if missing. */
  accounts: string[];
}

export interface MarketMode {
  hardcore: boolean;
  ladder: boolean;
}

/**
 * found: someone owns the account. none: no live listing from it in any mode (or a name the service can
 * never match), worth remembering. failed: unreachable, timed out, rate limited (`retryAfterMs` when the
 * service said) or an unreadable reply, worth retrying later.
 */
export type SellerLookup =
  | { status: 'found'; seller: ResolvedSeller }
  | { status: 'none' }
  | { status: 'failed'; retryAfterMs?: number };

const REQUEST_TIMEOUT_MS = 8000;

const ALL_MODES: readonly MarketMode[] = [
  { hardcore: false, ladder: true },
  { hardcore: true, ladder: true },
  { hardcore: false, ladder: false },
  { hardcore: true, ladder: false },
];

/** Every mode, `first` first: the one you play is where whoever whispers you most likely lists. */
export const modesFrom = (first: MarketMode): MarketMode[] => [
  first,
  ...ALL_MODES.filter((m) => m.hardcore !== first.hardcore || m.ladder !== first.ladder),
];

class LookupFailure extends Error {
  constructor(readonly retryAfterMs?: number) {
    super('seller lookup failed');
  }
}

const sameName = (a: unknown, b: string): a is string =>
  typeof a === 'string' && a.trim().toLowerCase() === b.toLowerCase();

/** The listing's owner when it shows `account` as theirs; null for no listing or a match on another name. */
function sellerOf(body: unknown, account: string): ResolvedSeller | null {
  if (!body || typeof body !== 'object' || !('items' in body) || !Array.isArray(body.items)) {
    throw new LookupFailure();
  }
  const listing = (
    body.items[0] as { listing?: { user_id?: unknown; user?: unknown; item?: { account_id?: unknown } } } | undefined
  )?.listing;
  const user = listing?.user as
    | { username?: unknown; in_game_account?: unknown; game?: { accounts?: unknown } }
    | null
    | undefined;
  if (
    typeof listing?.user_id !== 'string' ||
    !listing.user_id ||
    typeof user?.username !== 'string' ||
    !user.username
  ) {
    return null;
  }
  const accounts = Array.isArray(user.game?.accounts)
    ? user.game.accounts.filter((a): a is string => typeof a === 'string' && a.trim() !== '')
    : [];
  if (accounts.some((a) => sameName(a, account))) {
    return { userId: listing.user_id, username: user.username, accounts };
  }
  const owned = [user.in_game_account, listing.item?.account_id].find((a) => sameName(a, account));
  if (!owned) return null;
  return { userId: listing.user_id, username: user.username, accounts: [...accounts, owned.trim()] };
}

/** One mode's search: the seller, null when nobody in that mode, 'invalid' when the service rejects the name. */
async function searchMode(sellerName: string, mode: MarketMode): Promise<ResolvedSeller | null | 'invalid'> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    let response: Response;
    try {
      response = await fetch(`${BACKEND_URL}/api/market/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters: { ...mode, sellerName }, limit: 1 }),
        signal: controller.signal,
      });
    } catch {
      throw new LookupFailure();
    }
    if (response.status === 429) {
      const seconds = Number(response.headers.get('retry-after'));
      throw new LookupFailure(Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : undefined);
    }
    if (response.status === 400) return 'invalid';
    if (!response.ok) throw new LookupFailure();
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new LookupFailure();
    }
    return sellerOf(body, sellerName);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Looks `sellerName` up mode by mode (in `modes` order) until one has a listing from it. `beforeRequest`
 * runs before each request, so the caller can pace them; a failure stops at once (the rest would likely
 * fail too, and each spends the shared rate limit).
 */
export async function lookupSellerByName(
  sellerName: string,
  { modes = ALL_MODES, beforeRequest }: { modes?: readonly MarketMode[]; beforeRequest?: () => Promise<void> } = {},
): Promise<SellerLookup> {
  const name = sellerName.trim().replace(/^\*/, '').trim();
  if (!name || name.length > MAX_SELLER_NAME) return { status: 'none' };
  try {
    for (const mode of modes) {
      await beforeRequest?.();
      const result = await searchMode(name, mode);
      if (result === 'invalid') return { status: 'none' };
      if (result) return { status: 'found', seller: result };
    }
    return { status: 'none' };
  } catch (error) {
    return { status: 'failed', retryAfterMs: error instanceof LookupFailure ? error.retryAfterMs : undefined };
  }
}
