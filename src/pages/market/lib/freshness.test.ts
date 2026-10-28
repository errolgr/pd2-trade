import { describe, expect, it, vi } from 'vitest';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { verifyListing } from './freshness';
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
  it("ok with PD2's current copy while PD2 has it, even when the price changed", async () => {
    const current = { ...shown, price: '0.1 wss', hr_price: 0.1 };
    const a = api(current);
    await expect(verifyListing(a, shown)).resolves.toEqual({ status: 'ok', listing: current });
    expect(a.getListing).toHaveBeenCalledWith('L1');
  });

  it('gone when PD2 no longer has it or an offer was accepted', async () => {
    await expect(verifyListing(api(null), shown)).resolves.toEqual({ status: 'gone' });
    await expect(verifyListing(api({ ...shown, accepted_offer_id: 'o1' }), shown)).resolves.toEqual({ status: 'gone' });
  });

  it('unknown when the check itself fails', async () => {
    await expect(verifyListing(api(new Error('PD2 down')), shown)).resolves.toEqual({ status: 'unknown' });
  });
});
