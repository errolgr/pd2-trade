import { watchKey } from '../alerts/alert-logic';
import type { MarketFilters } from '../lib/types';
import { countsTowardCap, postBlocker, type WtbRequest, wtbSearchFilters } from '../lib/wtb';

/** How long the "Also post a buy request?" prompt stays up after Watch starts (paused while hovered / focused). */
export const WTB_PROMPT_MS = 10_000;

/** What decides whether starting a Watch offers to post a buy request for the same search. */
export interface WtbPromptContext {
  /** The search just watched. */
  filters: MarketFilters;
  /** Signed in to PD2 (requests are posted as the user). */
  signedIn: boolean;
  /** Settings → Market "Offer a buy request after Watch" (off: "Don't ask again" was picked). */
  enabled: boolean;
  /** The post pane is already open: the user is posting one. */
  posting: boolean;
  /** The user's requests as already loaded (none fetched for this). */
  mine: readonly WtbRequest[];
  now: number;
}

/**
 * The user already has a live (open or paused, unexpired) request for the same search as `filters`: the request's
 * item fields over `filters` (as Mine → Edit loads them) watch-equal to `filters`.
 */
export function hasRequestFor(mine: readonly WtbRequest[], filters: MarketFilters, now: number): boolean {
  const key = watchKey(filters);
  return mine.some((r) => countsTowardCap(r, now) && watchKey(wtbSearchFilters(r, filters)) === key);
}

/**
 * Offer "Also post a buy request?" right after Watch started on `filters`: live listings only, signed in, not turned
 * off, not already posting, the search can be posted as is (the post pane's rule, nothing marked nice-to-have), and
 * no request of the user's already asks for it.
 */
export function shouldPromptWtb(ctx: WtbPromptContext): boolean {
  const { filters } = ctx;
  return (
    filters.source === 'live' &&
    ctx.signedIn &&
    ctx.enabled &&
    !ctx.posting &&
    postBlocker(filters, []) === null &&
    !hasRequestFor(ctx.mine, filters, ctx.now)
  );
}
