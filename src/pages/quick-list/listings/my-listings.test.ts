import { describe, expect, it } from 'vitest';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import type { Deal } from '@/pages/market/enrich/useDealIndicators';
import type { ListingOffers } from '@/pages/market/lib/listing-offers';
import {
  BUMP_COOLDOWN_MS,
  bumpReadyAt,
  canBump,
  type ListingContext,
  listingPriceFields,
  matchesFilter,
  sortListings,
} from './my-listings';

const NOW = Date.parse('2026-03-01T12:00:00Z');
const H = 3600_000;
const iso = (ms: number) => new Date(ms).toISOString();

function listing(id: string, over: Partial<MarketListingEntry> = {}): MarketListingEntry {
  return {
    _id: id,
    price: '',
    hr_price: 0,
    bumped_at: iso(NOW - 24 * H),
    created_at: iso(NOW - 48 * H),
    item: { hash: `h${id}`, name: `Item ${id}` },
    ...over,
  } as unknown as MarketListingEntry;
}

function ctx(over: { offers?: Record<string, number>; deals?: Record<string, number | null> } = {}): ListingContext {
  const offers = new Map<string, ListingOffers>(
    Object.entries(over.offers ?? {}).map(([id, n]) => [
      id,
      { mine: [], received: Array.from({ length: n }, () => ({})) } as unknown as ListingOffers,
    ]),
  );
  const deals = new Map<string, Deal>(
    Object.entries(over.deals ?? {}).map(([id, ratio]) => [
      id,
      { estimateHr: 1, ratio, verdict: null, source: null } as Deal,
    ]),
  );
  return { now: NOW, offers, deals };
}

const ids = (ls: MarketListingEntry[]) => ls.map((l) => l._id);

describe('bump cooldown', () => {
  it('is ready exactly 12h after the last bump, not a millisecond before', () => {
    const l = { bumped_at: iso(NOW - 12 * H) };
    expect(bumpReadyAt(l)).toBe(NOW);
    expect(canBump(l, NOW)).toBe(true);
    expect(canBump({ bumped_at: iso(NOW - 12 * H + 1) }, NOW)).toBe(false);
    expect(bumpReadyAt({ bumped_at: iso(NOW) })).toBe(NOW + BUMP_COOLDOWN_MS);
  });

  it('treats a missing or unparsable bumped_at as ready', () => {
    expect(bumpReadyAt({ bumped_at: undefined } as never)).toBe(0);
    expect(bumpReadyAt({ bumped_at: '' })).toBe(0);
    expect(bumpReadyAt({ bumped_at: 'nope' })).toBe(0);
    expect(canBump({ bumped_at: undefined } as never, NOW)).toBe(true);
  });
});

describe('listingPriceFields', () => {
  it.each(['', '  ', '0', 0, '-3', -1, 'abc', null, undefined])('%j makes a note-only listing', (price) => {
    expect(listingPriceFields(price, 'offer')).toEqual({ hr_price: 0, price: 'offer' });
  });

  it('keeps a positive HR price and trims the note', () => {
    expect(listingPriceFields('2.5', '  obo  ')).toEqual({ hr_price: 2.5, price: 'obo' });
    expect(listingPriceFields(3, null)).toEqual({ hr_price: 3, price: '' });
  });
});

describe('sortListings', () => {
  it('sorts by last bump, date listed and name, flipping with the direction', () => {
    const a = listing('a', {
      bumped_at: iso(NOW - 3 * H),
      created_at: iso(NOW - 1 * H),
      item: { name: 'beta' } as never,
    });
    const b = listing('b', {
      bumped_at: iso(NOW - 1 * H),
      created_at: iso(NOW - 3 * H),
      item: { name: 'Alpha' } as never,
    });
    const c = listing('c', {
      bumped_at: iso(NOW - 2 * H),
      created_at: iso(NOW - 2 * H),
      item: { name: 'gamma' } as never,
    });
    const all = [a, b, c];
    expect(ids(sortListings(all, { key: 'bumped', dir: 'desc' }, ctx()))).toEqual(['b', 'c', 'a']);
    expect(ids(sortListings(all, { key: 'bumped', dir: 'asc' }, ctx()))).toEqual(['a', 'c', 'b']);
    expect(ids(sortListings(all, { key: 'listed', dir: 'desc' }, ctx()))).toEqual(['a', 'c', 'b']);
    expect(ids(sortListings(all, { key: 'listed', dir: 'asc' }, ctx()))).toEqual(['b', 'c', 'a']);
    expect(ids(sortListings(all, { key: 'name', dir: 'asc' }, ctx()))).toEqual(['b', 'a', 'c']);
    expect(ids(sortListings(all, { key: 'name', dir: 'desc' }, ctx()))).toEqual(['c', 'a', 'b']);
  });

  it('puts note-only listings last by price in either direction', () => {
    const all = [
      listing('note', { price: '10 wss' }),
      listing('two', { hr_price: 2 }),
      listing('five', { hr_price: 5 }),
    ];
    expect(ids(sortListings(all, { key: 'price', dir: 'desc' }, ctx()))).toEqual(['five', 'two', 'note']);
    expect(ids(sortListings(all, { key: 'price', dir: 'asc' }, ctx()))).toEqual(['two', 'five', 'note']);
  });

  it('puts listings without a deal ratio last by deal in either direction', () => {
    const all = [listing('none'), listing('noratio'), listing('cheap'), listing('dear')];
    const c = ctx({ deals: { noratio: null, cheap: 0.5, dear: 1.5 } });
    expect(ids(sortListings(all, { key: 'deal', dir: 'asc' }, c)).slice(0, 2)).toEqual(['cheap', 'dear']);
    expect(ids(sortListings(all, { key: 'deal', dir: 'desc' }, c)).slice(0, 2)).toEqual(['dear', 'cheap']);
    expect(
      ids(sortListings(all, { key: 'deal', dir: 'desc' }, c))
        .slice(2)
        .sort(),
    ).toEqual(['none', 'noratio']);
  });

  it('orders by attention: offers, then bump-ready, then the rest, ties oldest bump first', () => {
    const all = [
      listing('cool1', { bumped_at: iso(NOW - 1 * H) }),
      listing('ready-new', { bumped_at: iso(NOW - 13 * H) }),
      listing('offer-cool', { bumped_at: iso(NOW - 2 * H) }),
      listing('cool2', { bumped_at: iso(NOW - 5 * H) }),
      listing('ready-old', { bumped_at: iso(NOW - 30 * H) }),
    ];
    const sorted = sortListings(all, { key: 'attention', dir: 'asc' }, ctx({ offers: { 'offer-cool': 1 } }));
    expect(ids(sorted)).toEqual(['offer-cool', 'ready-old', 'ready-new', 'cool2', 'cool1']);
  });

  it('does not mutate its input', () => {
    const all = [listing('a', { hr_price: 1 }), listing('b', { hr_price: 2 })];
    sortListings(all, { key: 'price', dir: 'desc' }, ctx());
    expect(ids(all)).toEqual(['a', 'b']);
  });
});

describe('matchesFilter', () => {
  const ready = listing('ready', { bumped_at: iso(NOW - 13 * H) });
  const cool = listing('cool', { bumped_at: iso(NOW - 1 * H) });
  const c = ctx({ offers: { cool: 2, ready: 0 } });

  it('ready keeps only off-cooldown listings', () => {
    expect(matchesFilter(ready, 'ready', c)).toBe(true);
    expect(matchesFilter(cool, 'ready', c)).toBe(false);
  });

  it('offers keeps only listings with received offers', () => {
    expect(matchesFilter(cool, 'offers', c)).toBe(true);
    expect(matchesFilter(ready, 'offers', c)).toBe(false);
  });

  it('no filter keeps everything', () => {
    expect(matchesFilter(cool, null, c)).toBe(true);
  });
});
