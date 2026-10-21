import { describe, expect, it, vi } from 'vitest';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { listingChanged, verifyListing } from './freshness';
import { listing } from './test-utils';

const shown = {
  ...listing({ id: 'L1', hr: 2, price: '2 hr' }),
  item: { ...listing().item, hash: 'h1' },
} as MarketListingEntry;
const api = (current: MarketListingEntry | null | Error) => ({
  getListing: vi.fn(async () => {
    if (current instanceof Error) throw current;
    return current;
  }),
});

describe('verifyListing', () => {
  it('ok when PD2 has it unchanged (a bump alone is no change)', async () => {
    const current = { ...shown, bumped_at: '2026-10-21T00:00:00Z' };
    const a = api(current);
    await expect(verifyListing(a, shown)).resolves.toEqual({ status: 'ok', listing: current });
    expect(a.getListing).toHaveBeenCalledWith('L1');
  });

  it('gone when PD2 no longer has it or an offer was accepted', async () => {
    await expect(verifyListing(api(null), shown)).resolves.toEqual({ status: 'gone' });
    await expect(verifyListing(api({ ...shown, accepted_offer_id: 'o1' }), shown)).resolves.toEqual({ status: 'gone' });
  });

  it('changed when the price note, HR price or item differ', async () => {
    for (const current of [
      { ...shown, price: '3 hr' },
      { ...shown, hr_price: 3 },
      { ...shown, hr_price: undefined },
      { ...shown, item: { ...shown.item, hash: 'h2' } },
    ] as MarketListingEntry[]) {
      await expect(verifyListing(api(current), shown)).resolves.toEqual({ status: 'changed', listing: current });
    }
  });

  it('unknown when the check itself fails', async () => {
    await expect(verifyListing(api(new Error('PD2 down')), shown)).resolves.toEqual({ status: 'unknown' });
  });
});

describe('listingChanged', () => {
  it('ignores whitespace in the note and a missing hash', () => {
    expect(listingChanged(shown, { ...shown, price: ' 2 hr ' })).toBe(false);
    expect(listingChanged(shown, { ...shown, item: { ...shown.item, hash: undefined } } as MarketListingEntry)).toBe(
      false,
    );
  });
});
