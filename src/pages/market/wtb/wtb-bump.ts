/**
 * Bumping buy requests (contract endpoint 9, "Bump & expired"): the 12h cooldown, which owner actions a request
 * offers, the listing-style times, the Mine view's Active / Expired sections and what a failed bump says. Pure.
 */
import { t } from '@/i18n';
import { MarketApiError } from '../alerts/market-api';
import { ageText } from '../lib/listing';
import { wtbExpired, type WtbRequest } from '../lib/wtb';

/** Open and paused requests can be bumped once per this long. */
export const WTB_BUMP_COOLDOWN_MS = 12 * 60 * 60 * 1000;

/** Time left as "{h}h {m}m" parts, minutes rounded up (59s left reads 0h 1m). */
export interface WaitParts {
  hours: number;
  minutes: number;
}

/** `ms` as hours and minutes (rounded up); null when nothing is left. */
export function waitParts(ms: number): WaitParts | null {
  if (!(ms > 0)) return null;
  const total = Math.ceil(ms / 60_000);
  return { hours: Math.floor(total / 60), minutes: total % 60 };
}

/** What Bump does now: bump, wait out the cooldown, or revive an expired request; null on a closed one. */
export type BumpState = { kind: 'ready' } | { kind: 'cooldown'; wait: WaitParts } | { kind: 'revive' };

/**
 * The request's bump: expired ones revive any time; open / paused ones once `nextBumpAt` passes (owner responses),
 * else 12h after their last bump.
 */
export function bumpState(
  request: Pick<WtbRequest, 'status' | 'expiresAt' | 'bumpedAt' | 'createdAt' | 'nextBumpAt'>,
  now: number,
): BumpState | null {
  if (request.status === 'closed') return null;
  if (wtbExpired(request, now)) return { kind: 'revive' };
  const next =
    request.nextBumpAt !== undefined
      ? request.nextBumpAt === null
        ? now
        : Date.parse(request.nextBumpAt)
      : Date.parse(request.bumpedAt || request.createdAt) + WTB_BUMP_COOLDOWN_MS;
  const wait = waitParts(next - now);
  return wait ? { kind: 'cooldown', wait } : { kind: 'ready' };
}

/** The owner actions a request offers (card, row, drawer). */
export interface OwnerActionSet {
  bump: BumpState | null;
  edit: boolean;
  pause: boolean;
  resume: boolean;
  close: boolean;
}

/** Open: bump, edit, pause, close; paused: bump, edit, resume, close; expired: revive, edit, close; closed: none. */
export function ownerActionsFor(request: Parameters<typeof bumpState>[0], now: number): OwnerActionSet {
  const bump = bumpState(request, now);
  const live = bump !== null && bump.kind !== 'revive';
  return {
    bump,
    edit: bump !== null,
    pause: live && request.status === 'open',
    resume: live && request.status === 'paused',
    close: bump !== null,
  };
}

/** A request's times as a listing shows its age: the last bump (none before the first), the post, the expiry. */
export interface WtbTimes {
  /** "3h"; null until it is bumped. */
  bumped: string | null;
  posted: string;
  /** "2d" since it expired; null while it runs. */
  expired: string | null;
}

export function wtbTimes(
  request: Pick<WtbRequest, 'status' | 'expiresAt' | 'bumpedAt' | 'createdAt'>,
  now: number,
): WtbTimes {
  const posted = Date.parse(request.createdAt);
  const bumped = Date.parse(request.bumpedAt);
  return {
    bumped: Number.isFinite(bumped) && bumped > posted ? ageText(bumped, now) : null,
    posted: ageText(posted, now),
    expired: wtbExpired(request, now) ? ageText(Date.parse(request.expiresAt), now) : null,
  };
}

/** "bumped 3h · posted 2d" / "posted 2d". */
export function wtbTimesLine(times: Pick<WtbTimes, 'bumped' | 'posted'>): string {
  const posted = t('market:wtb.card.postedAge', { age: times.posted });
  return times.bumped ? `${t('market:wtb.card.bumpedAge', { age: times.bumped })} · ${posted}` : posted;
}
/** One entry of the Mine view: a section heading (Active, Expired with its fold) or a request. */
export type MineEntry =
  | { kind: 'section'; section: 'active' | 'expired'; count: number; open: boolean }
  | { kind: 'request'; request: WtbRequest };

/**
 * The Mine view: Active (open and paused) then Expired (folded unless `expiredOpen`; no heading when none), each in
 * the server's order; closed requests are left out (closed is final).
 */
export function mineEntries(requests: readonly WtbRequest[], now: number, expiredOpen: boolean): MineEntry[] {
  const active = requests.filter((r) => r.status !== 'closed' && !wtbExpired(r, now));
  const expired = requests.filter((r) => r.status !== 'closed' && wtbExpired(r, now));
  const entries: MineEntry[] = [
    { kind: 'section', section: 'active', count: active.length, open: true },
    ...active.map((request) => ({ kind: 'request', request }) as const),
  ];
  if (expired.length > 0) {
    entries.push({ kind: 'section', section: 'expired', count: expired.length, open: expiredOpen });
    if (expiredOpen) entries.push(...expired.map((request) => ({ kind: 'request', request }) as const));
  }
  return entries;
}

/** What a failed bump tells the user: the time left (429), the open cap (409), or the error. */
export type BumpFailure =
  | { kind: 'cooldown'; wait: WaitParts | null }
  | { kind: 'cap' }
  | { kind: 'failed'; message: string };

export function bumpFailure(error: unknown, request: Parameters<typeof bumpState>[0], now: number): BumpFailure {
  if (error instanceof MarketApiError && error.status === 429) {
    if (error.nextBumpAt) return { kind: 'cooldown', wait: waitParts(Date.parse(error.nextBumpAt) - now) };
    if (error.retryAfterMs !== null) return { kind: 'cooldown', wait: waitParts(error.retryAfterMs) };
    const state = bumpState(request, now);
    return { kind: 'cooldown', wait: state?.kind === 'cooldown' ? state.wait : null };
  }
  if (error instanceof MarketApiError && error.status === 409) return { kind: 'cap' };
  return { kind: 'failed', message: error instanceof Error ? error.message : String(error) };
}
