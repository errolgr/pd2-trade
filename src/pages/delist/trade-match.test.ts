import { describe, expect, it } from 'vitest';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { matchTradeListings, normalizeItemName, whisperedItemName, type WhisperedItem } from './trade-match';

function listing(
  id: string,
  name: string,
  {
    price = '',
    hr = 0,
    quality = 'Unique',
    base = name,
  }: { price?: string; hr?: number; quality?: string; base?: string } = {},
): MarketListingEntry {
  return {
    _id: id,
    price,
    hr_price: hr,
    item: { name, quality: { name: quality }, base: { name: base } },
  } as unknown as MarketListingEntry;
}

/** A whisper as the chat watcher records it ("listed for" gives both item and price). */
function whisper(item: string, price?: string): WhisperedItem {
  return {
    message: `Hi, I'm interested in your ${item}${price ? ` listed for ${price}` : ''}`,
    itemName: price ? item : undefined,
    price,
  };
}

const ids = (listings: MarketListingEntry[]) => listings.map((l) => l._id);

describe('matchTradeListings', () => {
  const shako = listing('L1', 'Harlequin Crest', { hr: 2 });
  const arach = listing('L2', 'Arachnid Mesh', { price: '1 ist' });
  const gc = (id: string, price: string) =>
    listing(id, 'Entrapping Grand Charm of Quality', { price, quality: 'Magic', base: 'Grand Charm' });

  it('finds the single listing of the whispered item', () => {
    expect(ids(matchTradeListings([shako, arach], whisper('Harlequin Crest', '2 HR')))).toEqual(['L1']);
  });

  it('is empty when no listing matches, or the whisper names no item', () => {
    expect(matchTradeListings([shako, arach], whisper("Griffon's Eye", '3 HR'))).toEqual([]);
    expect(matchTradeListings([shako], { message: 'hello there' })).toEqual([]);
    expect(matchTradeListings([], whisper('Harlequin Crest', '2 HR'))).toEqual([]);
  });

  it('returns every same-named listing when the price does not tell them apart', () => {
    const charms = [gc('C1', '9 wss'), gc('C2', '9 wss'), gc('C3', '3 ist')];
    expect(ids(matchTradeListings([shako, ...charms], whisper('Entrapping Grand Charm of Quality', '9 wss')))).toEqual([
      'C1',
      'C2',
    ]);
    // No price in the whisper: all of them
    expect(ids(matchTradeListings(charms, whisper('Entrapping Grand Charm of Quality')))).toEqual(['C1', 'C2', 'C3']);
  });

  it('narrows same-named listings to the whispered price', () => {
    const charms = [gc('C1', '9 wss'), gc('C2', '3 ist')];
    expect(ids(matchTradeListings(charms, whisper('Entrapping Grand Charm of Quality', '3 ist')))).toEqual(['C2']);
  });

  it('keeps every same-named listing when none has the whispered price (repriced since)', () => {
    const charms = [gc('C1', '9 wss'), gc('C2', '3 ist')];
    expect(ids(matchTradeListings(charms, whisper('Entrapping Grand Charm of Quality', '1 ber')))).toEqual([
      'C1',
      'C2',
    ]);
  });

  it('matches HR prices and notes, the decimal the chat watcher cuts off, and long notes cut with "…"', () => {
    const runes = [
      listing('R1', 'Ohm Rune', { hr: 2.5 }),
      listing('R2', 'Ohm Rune', { hr: 3 }),
      listing('R3', 'Ohm Rune', { price: 'price is firm, no lowballs please, trading for ist only and nothing else' }),
    ];
    // "listed for 2.5 HR" reaches us as "2"
    expect(ids(matchTradeListings(runes, whisper('Ohm Rune', '2')))).toEqual(['R1']);
    expect(ids(matchTradeListings(runes, whisper('Ohm Rune', '3 hr')))).toEqual(['R2']);
    expect(ids(matchTradeListings(runes, whisper('Ohm Rune', 'price is firm, no lowballs please, trading…')))).toEqual([
      'R3',
    ]);
  });

  it('matches rares by the market name ("Rare Amulet") and by the base name', () => {
    const amulet = listing('A1', 'Amulet', { quality: 'Rare', base: 'Amulet' });
    expect(ids(matchTradeListings([amulet, shako], whisper('Rare Amulet', '5 HR')))).toEqual(['A1']);
    expect(ids(matchTradeListings([amulet, shako], whisper('Amulet', '5 HR')))).toEqual(['A1']);
  });

  it('takes a listing linked in the message as exact', () => {
    const charms = [gc('6a0bf54e6c42aba37528aeb6', '9 wss'), gc('6a0bf54e6c42aba37528aeb7', '9 wss')];
    const message =
      'Hi, I\'m interested in your https://projectdiablo2.com/market/listing/6a0bf54e6c42aba37528aeb7?display="Grand Charm"';
    expect(ids(matchTradeListings(charms, { message }))).toEqual(['6a0bf54e6c42aba37528aeb7']);
  });

  it('ignores case, spacing, apostrophes, punctuation and colour codes in the whispered name', () => {
    const tg = listing('T1', "Bul-Kathos' Tribal Guardian", { hr: 1 });
    expect(ids(matchTradeListings([tg], whisper('bul kathos  TRIBAL guardian', '1 HR')))).toEqual(['T1']);
    expect(ids(matchTradeListings([tg], whisper('ÿc4Bul-Kathos’ Tribal Guardian', '1 HR')))).toEqual(['T1']);
  });

  it('matches a long name the whisper cut with "…" (or "...") by prefix', () => {
    const long = listing('X1', 'Entrapping Grand Charm of Quality');
    expect(ids(matchTradeListings([long, shako], whisper('Entrapping Grand Charm…', '9 wss')))).toEqual(['X1']);
    expect(ids(matchTradeListings([long, shako], whisper('Entrapping Grand Ch...', '9 wss')))).toEqual(['X1']);
    // Only a cut name matches by prefix
    expect(matchTradeListings([long], whisper('Entrapping Grand', '9 wss'))).toEqual([]);
  });
});

describe('whisperedItemName', () => {
  it("prefers the chat watcher's name", () => {
    expect(whisperedItemName(whisper('Shako', '2 ist'))).toBe('Shako');
  });

  it('reads the name from a whisper without "listed for" (the watcher leaves it empty)', () => {
    expect(whisperedItemName({ message: "Hi, I'm interested in your Harlequin Crest." })).toBe('Harlequin Crest');
    expect(whisperedItemName({ message: "Hi, I'm interested in your Shako listed for 2 ist" })).toBe('Shako');
  });

  it("reads a linked listing's display name", () => {
    const message = 'Hi, I\'m interested in your https://projectdiablo2.com/market/listing/abc123?display="Ohm Rune"';
    expect(whisperedItemName({ message })).toBe('Ohm Rune');
  });

  it('is undefined for messages that name no item', () => {
    expect(whisperedItemName({ message: 'wanna trade?' })).toBeUndefined();
  });
});

describe('normalizeItemName', () => {
  it('drops colour codes, accents, quotes and punctuation, and lowercases', () => {
    expect(normalizeItemName("  ÿc4Tal Rasha's   Horadric-Crest ")).toBe('tal rashas horadric crest');
    expect(normalizeItemName('Éthereal Shako')).toBe('ethereal shako');
  });
});
