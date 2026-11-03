// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { useOptions } from '@/hooks/useOptions';
import type { TradeOffer } from '@/hooks/useTradeOffers';
import { publishListingDeleted } from '@/hooks/pd2website/listing-events';
import { listingsRealm, resetMyListings, setMyListings } from '@/pages/quick-list/listings/my-listings-store';
import type { PaletteRef, PaletteSourceInput } from '../lib/types';
import { listingsRef, pendingOffers, rankListings, resolveListingsRefs, useListingsSource } from './listings';

vi.mock('@/hooks/pd2website/usePD2Website', () => ({ usePd2Website: vi.fn() }));
vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));
vi.mock('@/overlay', () => ({ showToast: vi.fn() }));
vi.mock('@/lib/telemetry', () => ({ trackEvent: vi.fn(), trackMeasurement: vi.fn() }));
vi.mock('@/lib/error-reporting', () => ({ reportApiError: vi.fn() }));

const listing = (id: string, name: string, base = name) =>
  ({
    _id: id,
    price: '',
    hr_price: 1,
    bumped_at: new Date().toISOString(),
    item: { hash: `h${id}`, name, base: { name: base }, quality: { name: 'Unique' }, modifiers: [] },
  }) as unknown as MarketListingEntry;

const offer = (id: string, over: Partial<TradeOffer> = {}): TradeOffer => ({
  id,
  isIncoming: true,
  playerName: 'Trader',
  itemName: 'Shako',
  price: '2 HR',
  timestamp: new Date('2026-03-01T12:00:00Z'),
  ...over,
});

const SHAKO = listing('L1', 'Harlequin Crest', 'Shako');
const SOJ = listing('L2', 'Stone of Jordan', 'Ring');
const MESH = listing('L3', 'Arachnid Mesh', 'Spiderweb Sash');
const LISTINGS = [SHAKO, SOJ, MESH];

const input = (over: Partial<PaletteSourceInput> = {}): PaletteSourceInput => ({
  query: '',
  scope: null,
  limit: 5,
  refs: [],
  ...over,
});

let api: {
  authData: unknown;
  getMarketListings: Mock<() => Promise<{ data: MarketListingEntry[]; total: number }>>;
  incomingOffers: TradeOffer[];
};

beforeEach(() => {
  resetMyListings();
  api = {
    authData: { accessToken: 'token', user: { _id: 'u1' } },
    getMarketListings: vi.fn(async () => ({ data: LISTINGS, total: LISTINGS.length })),
    incomingOffers: [],
  };
  vi.mocked(usePd2Website).mockImplementation(() => api as never);
  vi.mocked(useOptions).mockReturnValue({ settings: { mode: 'softcore', ladder: 'ladder' } } as never);
});
afterEach(cleanup);

describe('rankListings', () => {
  it('matches item names and bases; offers before listings within a tier', () => {
    const offers = [offer('o1', { itemName: 'Stone of Jordan', playerName: 'Ann' })];
    const ranked = rankListings(LISTINGS, offers, 'stone', 10);
    expect(ranked.map((e) => (e.kind === 'offer' ? e.offer.id : e.listing._id))).toEqual(['o1', 'L2']);
    // The base ("Shako" under Harlequin Crest), a word of the name, a word of the base
    expect(rankListings(LISTINGS, [], 'shako', 10).map((e) => e.kind === 'listing' && e.listing._id)).toEqual(['L1']);
    expect(rankListings(LISTINGS, [], 'crest', 10).map((e) => e.kind === 'listing' && e.listing._id)).toEqual(['L1']);
    expect(rankListings(LISTINGS, [], 'sash', 10).map((e) => e.kind === 'listing' && e.listing._id)).toEqual(['L3']);
  });

  it('ranks a prefix over a word start over a substring, and caps at the limit', () => {
    const listings = [listing('C', 'Kiteshield'), listing('A', 'Big Shield'), listing('B', 'Shield of Ice')];
    const ids = (limit: number) =>
      rankListings(listings, [], 'shield', limit).map((e) => e.kind === 'listing' && e.listing._id);
    expect(ids(10)).toEqual(['B', 'A', 'C']);
    expect(ids(2)).toEqual(['B', 'A']);
  });

  it('finds offers by the trader name', () => {
    const ranked = rankListings([], [offer('o1', { playerName: 'Zed' }), offer('o2')], 'zed', 10);
    expect(ranked.map((e) => e.kind === 'offer' && e.offer.id)).toEqual(['o1']);
  });
});

describe('pendingOffers', () => {
  it('keeps only open offers on your listings', () => {
    const offers = [
      offer('open'),
      offer('accepted', { acceptedOfferId: 'accepted' }),
      offer('declined', { acceptedOfferId: 'other' }),
      offer('mine', { isIncoming: false }),
    ];
    expect(pendingOffers(offers).map((o) => o.id)).toEqual(['open']);
  });
});

describe('resolveListingsRefs', () => {
  it('keeps the refs order and drops sold, delisted or answered targets', () => {
    const o1 = offer('o1');
    const refs: PaletteRef[] = [
      listingsRef({ kind: 'offer', offer: o1 }),
      listingsRef({ kind: 'listing', listing: SOJ }),
      { id: 'listings:listing:gone', group: 'listings', title: 'Gone', data: { listingId: 'gone' } },
      { id: 'listings:offer:gone', group: 'listings', title: 'Gone', data: { offerId: 'gone' } },
    ];
    expect(resolveListingsRefs(LISTINGS, [o1], refs).map((e) => e.kind)).toEqual(['offer', 'listing']);
  });
});

describe('useListingsSource', () => {
  it('is signed out without a PD2 token, with no items and no fetch', () => {
    api.authData = null;
    const { result } = renderHook(() => useListingsSource(input({ query: 'shako' })));
    expect(result.current).toEqual({ items: [], loading: false, signedOut: true });
    expect(api.getMarketListings).not.toHaveBeenCalled();
  });

  it('loads the listings once when none are stored, not per keystroke', async () => {
    const { result, rerender } = renderHook((props: PaletteSourceInput) => useListingsSource(props), {
      initialProps: input({ query: 's' }),
    });
    expect(result.current.loading).toBe(true);
    await act(async () => {});
    expect(result.current.loading).toBe(false);
    rerender(input({ query: 'sh' }));
    rerender(input({ query: 'shako' }));
    expect(api.getMarketListings).toHaveBeenCalledTimes(1);
    expect(result.current.items.map((i) => i.ref.title)).toEqual(['Harlequin Crest']);
  });

  it('uses the stored listings of this realm without fetching, and drops a deleted one', () => {
    setMyListings(listingsRealm('u1', false, true), LISTINGS);
    const refs = [listingsRef({ kind: 'listing', listing: SHAKO }), listingsRef({ kind: 'listing', listing: MESH })];
    const { result } = renderHook(() => useListingsSource(input({ refs })));
    expect(api.getMarketListings).not.toHaveBeenCalled();
    expect(result.current.items.map((i) => i.ref.id)).toEqual(['listings:listing:L1', 'listings:listing:L3']);
    act(() => publishListingDeleted('L1'));
    expect(result.current.items.map((i) => i.ref.id)).toEqual(['listings:listing:L3']);
  });
});
