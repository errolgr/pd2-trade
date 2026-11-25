import { describe, expect, it } from 'vitest';
import { defaultFilters } from '../lib/defaults';
import type { MarketFilters, StatFilter } from '../lib/types';
import type { WtbRequest } from '../lib/wtb';
import { hasRequestFor, shouldPromptWtb, type WtbPromptContext } from './wtb-watch-prompt';

const NOW = Date.parse('2026-11-12T00:00:00Z');

const row = (id: string, key: string, extra: Partial<StatFilter> = {}): StatFilter => ({
  id,
  kind: 'mod',
  key,
  enabled: true,
  ...extra,
});

const filters = (extra: Partial<MarketFilters> = {}): MarketFilters => ({
  ...defaultFilters({ hardcore: false, ladder: true }),
  ...extra,
});

const circlet = () => filters({ typeCode: 'circ', stats: [row('a', 'item_fastercastrate', { min: 20 })] });

/** A request as the server returns it: its own row ids, neutral listing fields. */
const request = (extra: Partial<WtbRequest> = {}): WtbRequest => ({
  id: 'r1',
  buyer: { userId: 'u1', name: 'Buyer' },
  whisperTo: 'BuyerAcc',
  title: 'Rare Circlet',
  filters: { ...circlet(), stats: [row('server-1', 'item_fastercastrate', { min: 20 })], maxAgeDays: 1 },
  niceToHaveIds: [],
  offer: { amount: 2, currency: 'HR', hr: 2 },
  openToOffers: true,
  status: 'open',
  createdAt: '2026-11-10T00:00:00Z',
  bumpedAt: '2026-11-10T00:00:00Z',
  expiryDays: 7,
  updatedAt: '2026-11-10T00:00:00Z',
  expiresAt: '2026-11-17T00:00:00Z',
  ...extra,
});

const ctx = (extra: Partial<WtbPromptContext> = {}): WtbPromptContext => ({
  filters: circlet(),
  signedIn: true,
  enabled: true,
  posting: false,
  mine: [],
  now: NOW,
  ...extra,
});

describe('shouldPromptWtb', () => {
  it('offers a request for a postable live search', () => {
    expect(shouldPromptWtb(ctx())).toBe(true);
    expect(shouldPromptWtb(ctx({ filters: filters({ itemName: 'Harlequin Crest' }) }))).toBe(true);
  });

  it('not for sold listings or the Wanted source', () => {
    expect(shouldPromptWtb(ctx({ filters: { ...circlet(), source: 'archive' } }))).toBe(false);
    expect(shouldPromptWtb(ctx({ filters: { ...circlet(), source: 'wanted' } }))).toBe(false);
  });

  it('not signed out, turned off ("Don\'t ask again"), or while the post pane is open', () => {
    expect(shouldPromptWtb(ctx({ signedIn: false }))).toBe(false);
    expect(shouldPromptWtb(ctx({ enabled: false }))).toBe(false);
    expect(shouldPromptWtb(ctx({ posting: true }))).toBe(false);
  });

  it('not when the search lacks what a request needs (the post rule)', () => {
    expect(shouldPromptWtb(ctx({ filters: filters({ stats: [row('a', 'item_fastercastrate')] }) }))).toBe(false);
    expect(shouldPromptWtb(ctx({ filters: filters({ typeCode: 'circ' }) }))).toBe(false);
  });

  it('not when the user already has a request for the same search', () => {
    expect(shouldPromptWtb(ctx({ mine: [request()] }))).toBe(false);
  });
});

describe('hasRequestFor', () => {
  it('matches the same search whatever its row ids and listing fields', () => {
    const watched = { ...circlet(), sort: { by: 'price', dir: 'asc' }, maxAgeDays: 30 } as MarketFilters;
    expect(hasRequestFor([request()], watched, NOW)).toBe(true);
  });

  it('counts open and paused requests, not closed or expired ones', () => {
    expect(hasRequestFor([request({ status: 'paused' })], circlet(), NOW)).toBe(true);
    expect(hasRequestFor([request({ status: 'closed' })], circlet(), NOW)).toBe(false);
    expect(hasRequestFor([request({ status: 'expired' })], circlet(), NOW)).toBe(false);
    expect(hasRequestFor([request({ expiresAt: '2026-11-11T00:00:00Z' })], circlet(), NOW)).toBe(false);
  });

  it('not a request for a different search', () => {
    const other = request({ filters: { ...circlet(), stats: [row('x', 'item_fastercastrate', { min: 10 })] } });
    expect(hasRequestFor([other], circlet(), NOW)).toBe(false);
    expect(hasRequestFor([request()], { ...circlet(), ladder: false }, NOW)).toBe(false);
  });
});
