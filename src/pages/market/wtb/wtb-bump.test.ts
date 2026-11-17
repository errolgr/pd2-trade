import { describe, expect, it } from 'vitest';
import { MarketApiError } from '../alerts/market-api';
import { defaultFilters } from '../lib/defaults';
import type { WtbRequest } from '../lib/wtb';
import {
  bumpFailure,
  bumpState,
  mineEntries,
  ownerActionsFor,
  waitParts,
  WTB_BUMP_COOLDOWN_MS,
  wtbTimes,
} from './wtb-bump';

const NOW = Date.parse('2026-11-16T12:00:00Z');
const H = 60 * 60 * 1000;
const iso = (ms: number) => new Date(ms).toISOString();
const request = (extra: Partial<WtbRequest> = {}): WtbRequest => ({
  id: 'r1',
  buyer: { userId: 'me', name: 'Me' },
  whisperTo: 'MeAcc',
  title: 'Shako',
  filters: { ...defaultFilters({ hardcore: false, ladder: true }), itemName: 'Harlequin Crest' },
  niceToHaveIds: [],
  offer: { amount: 2, currency: 'HR', hr: 2 },
  openToOffers: true,
  status: 'open',
  createdAt: iso(NOW - 48 * H),
  bumpedAt: iso(NOW - 48 * H),
  updatedAt: iso(NOW - 48 * H),
  expiresAt: iso(NOW + 72 * H),
  expiryDays: 7,
  ...extra,
});

describe('cooldown', () => {
  it('reads "{h}h {m}m" with the minutes rounded up; nothing left: none', () => {
    expect(waitParts(3 * H + 20 * 60_000)).toEqual({ hours: 3, minutes: 20 });
    expect(waitParts(3 * H + 19 * 60_000 + 1)).toEqual({ hours: 3, minutes: 20 });
    expect(waitParts(1)).toEqual({ hours: 0, minutes: 1 });
    expect(waitParts(60 * 60_000)).toEqual({ hours: 1, minutes: 0 });
    expect(waitParts(0)).toBeNull();
    expect(waitParts(-5)).toBeNull();
  });

  it('counts down to nextBumpAt; at it (or null) bumping is ready', () => {
    const at = NOW + 5 * H + 30 * 60_000;
    expect(bumpState(request({ nextBumpAt: iso(at) }), NOW)).toEqual({
      kind: 'cooldown',
      wait: { hours: 5, minutes: 30 },
    });
    expect(bumpState(request({ nextBumpAt: iso(at) }), at)).toEqual({ kind: 'ready' });
    expect(bumpState(request({ nextBumpAt: iso(at) }), at - 1)).toEqual({
      kind: 'cooldown',
      wait: { hours: 0, minutes: 1 },
    });
    expect(bumpState(request({ nextBumpAt: null }), NOW)).toEqual({ kind: 'ready' });
  });

  it('without nextBumpAt (not an owner response): 12h after the last bump', () => {
    const bumped = request({ bumpedAt: iso(NOW - 2 * H) });
    expect(bumpState(bumped, NOW)).toEqual({ kind: 'cooldown', wait: { hours: 10, minutes: 0 } });
    expect(bumpState(bumped, NOW - 2 * H + WTB_BUMP_COOLDOWN_MS)).toEqual({ kind: 'ready' });
  });
});

describe('owner actions per state', () => {
  it('open: bump, edit, pause, close', () => {
    expect(ownerActionsFor(request({ nextBumpAt: null }), NOW)).toEqual({
      bump: { kind: 'ready' },
      edit: true,
      pause: true,
      resume: false,
      close: true,
    });
  });

  it('paused: bump (cooling down here), edit, resume, close', () => {
    expect(ownerActionsFor(request({ status: 'paused', nextBumpAt: iso(NOW + H) }), NOW)).toEqual({
      bump: { kind: 'cooldown', wait: { hours: 1, minutes: 0 } },
      edit: true,
      pause: false,
      resume: true,
      close: true,
    });
  });

  it('expired (by status or past its expiry): Bump to revive, edit, close; never pause / resume', () => {
    const expected = { bump: { kind: 'revive' }, edit: true, pause: false, resume: false, close: true };
    expect(ownerActionsFor(request({ status: 'expired', nextBumpAt: null }), NOW)).toEqual(expected);
    expect(ownerActionsFor(request({ expiresAt: iso(NOW - H), nextBumpAt: iso(NOW + H) }), NOW)).toEqual(expected);
  });

  it('closed: nothing (closed is final)', () => {
    expect(ownerActionsFor(request({ status: 'closed' }), NOW)).toEqual({
      bump: null,
      edit: false,
      pause: false,
      resume: false,
      close: false,
    });
  });
});

describe('times', () => {
  it('posted, bumped once bumped, and how long ago it expired', () => {
    expect(wtbTimes(request(), NOW)).toEqual({ bumped: null, posted: '2d', expired: null });
    expect(wtbTimes(request({ bumpedAt: iso(NOW - 3 * H) }), NOW)).toMatchObject({ bumped: '3h', posted: '2d' });
    expect(wtbTimes(request({ expiresAt: iso(NOW - 5 * H) }), NOW).expired).toBe('5h');
  });
});

describe('Mine sections', () => {
  const open = request({ id: 'open' });
  const paused = request({ id: 'paused', status: 'paused' });
  const expired = request({ id: 'expired', status: 'expired' });
  const lapsed = request({ id: 'lapsed', expiresAt: iso(NOW - H) });
  const closed = request({ id: 'closed', status: 'closed' });
  const ids = (entries: ReturnType<typeof mineEntries>) =>
    entries.map((e) => (e.kind === 'section' ? `[${e.section} ${e.count}${e.open ? '' : ' folded'}]` : e.request.id));

  it('Active (open + paused) then Expired; closed left out', () => {
    expect(ids(mineEntries([expired, open, closed, lapsed, paused], NOW, true))).toEqual([
      '[active 2]',
      'open',
      'paused',
      '[expired 2]',
      'expired',
      'lapsed',
    ]);
  });

  it('Expired folds to its heading; no Expired section when none', () => {
    expect(ids(mineEntries([open, expired], NOW, false))).toEqual(['[active 1]', 'open', '[expired 1 folded]']);
    expect(ids(mineEntries([open, closed], NOW, true))).toEqual(['[active 1]', 'open']);
  });
});

describe('bump failures', () => {
  const r = request({ nextBumpAt: iso(NOW + 2 * H) });

  it('429: the time left from the reply, else Retry-After, else the request', () => {
    const withAt = new MarketApiError('Too soon', 429, null, null, iso(NOW + 4 * H + 5 * 60_000));
    expect(bumpFailure(withAt, r, NOW)).toEqual({ kind: 'cooldown', wait: { hours: 4, minutes: 5 } });
    expect(bumpFailure(new MarketApiError('Slow down', 429, 90_000), r, NOW)).toEqual({
      kind: 'cooldown',
      wait: { hours: 0, minutes: 2 },
    });
    expect(bumpFailure(new MarketApiError('Too soon', 429), r, NOW)).toEqual({
      kind: 'cooldown',
      wait: { hours: 2, minutes: 0 },
    });
  });

  it('409: the open cap; anything else: the error', () => {
    expect(bumpFailure(new MarketApiError('Cap', 409), r, NOW)).toEqual({ kind: 'cap' });
    expect(bumpFailure(new Error('offline'), r, NOW)).toEqual({ kind: 'failed', message: 'offline' });
  });
});
