import { describe, expect, it } from 'vitest';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { listing } from '@/pages/market/lib/test-utils';
import { cheaperListings, conditionRequest, type LiveListing } from './market-context-api';

const shako = (
  over: { hr?: number; eth?: boolean; corrupted?: boolean; corruptions?: string[]; sockets?: number } = {},
) => {
  const l = listing({ id: 'me', hr: over.hr, name: 'Harlequin Crest' });
  return {
    ...l,
    item: {
      ...l.item,
      quality: { id: 7, name: 'Unique' },
      is_ethereal: over.eth ?? false,
      corrupted: over.corrupted ?? false,
      corruptions: over.corruptions,
      socket_count: over.sockets ?? 0,
    },
  } as MarketListingEntry;
};

const live = (id: string, priceHr: number | null, over: Partial<LiveListing> = {}): LiveListing => ({
  listingId: id,
  price: '',
  priceHr,
  ethereal: false,
  sockets: 0,
  corrupted: false,
  corruptions: [],
  itemLevel: 88,
  stats: [],
  listedAt: '2026-10-26T00:00:00Z',
  bumpedAt: '2026-10-26T00:00:00Z',
  ...over,
});

describe('conditionRequest', () => {
  it('prices gear in its own condition: ethereal, corruption and sockets', () => {
    expect(
      conditionRequest(
        shako({ eth: true, corrupted: true, corruptions: ['item_magicbonus'], sockets: 1 }),
        'harlequin_crest',
        168,
      ),
    ).toEqual({
      item: 'harlequin_crest',
      stats: [],
      isLadder: true,
      isHardcore: false,
      hours: 168,
      ethereal: true,
      corrupted: true,
      sockets: 1,
      corruption: 'item_magicbonus',
    });
  });

  it('asks for a clean item when it is not corrupted, and sends no condition for non-gear', () => {
    expect(conditionRequest(shako(), 'harlequin_crest', 24)).toMatchObject({
      corrupted: false,
      ethereal: false,
      sockets: 0,
    });
    expect(conditionRequest(shako(), 'harlequin_crest', 24)).not.toHaveProperty('corruption');
    expect(conditionRequest(listing({ name: 'Ist Rune' }), 'r24', 24)).toEqual({
      item: 'r24',
      stats: [],
      isLadder: true,
      isHardcore: false,
      hours: 24,
    });
  });
});

describe('cheaperListings', () => {
  it('keeps cheaper priced listings in the same condition, cheapest first, without the listing itself', () => {
    const rows = [
      live('a', 0.4),
      live('me', 0.1),
      live('b', 0.2),
      live('c', 0.5), // same price: not cheaper
      live('d', 0.6), // dearer
      live('e', null), // note only
      live('f', 0.1, { ethereal: true }),
      live('g', 0.1, { corrupted: true }),
      live('h', 0.1, { sockets: 1 }),
    ];
    expect(cheaperListings(shako({ hr: 0.5 }), rows).map((l) => l.listingId)).toEqual(['b', 'a']);
  });

  it('gives a note-only listing every priced one to compare with', () => {
    expect(cheaperListings(shako(), [live('a', 3), live('b', 0.2)]).map((l) => l.listingId)).toEqual(['b', 'a']);
  });

  it('ignores condition for items without one (runes)', () => {
    const ist = listing({ id: 'me', hr: 1, name: 'Ist Rune' });
    expect(cheaperListings(ist, [live('a', 0.9, { ethereal: true })]).map((l) => l.listingId)).toEqual(['a']);
  });
});
