import { describe, expect, it } from 'vitest';
import type { TradeOffer } from '@/hooks/useTradeOffers';
import { indexListingOffers, isAccepted } from './listing-offers';

const offer = (id: string, listingId: string | undefined, at: string, extra: Partial<TradeOffer> = {}): TradeOffer => ({
  id,
  isIncoming: false,
  playerName: 'p',
  listingId,
  timestamp: new Date(at),
  ...extra,
});

describe('indexListingOffers', () => {
  it('groups made and received offers by listing, newest first, skipping offers without a listing', () => {
    const index = indexListingOffers(
      [offer('a', 'L1', '2026-10-20'), offer('b', 'L1', '2026-10-25'), offer('c', undefined, '2026-10-25')],
      [offer('d', 'L2', '2026-10-21', { isIncoming: true }), offer('e', 'L2', '2026-10-26', { isIncoming: true })],
    );
    expect(index.get('L1')?.mine.map((o) => o.id)).toEqual(['b', 'a']);
    expect(index.get('L1')?.received).toEqual([]);
    expect(index.get('L2')?.received.map((o) => o.id)).toEqual(['e', 'd']);
    expect([...index.keys()]).toEqual(['L1', 'L2']);
  });

  it('an offer is accepted only when the listing accepted that offer', () => {
    expect(isAccepted(offer('a', 'L1', '2026-10-20', { acceptedOfferId: 'a' }))).toBe(true);
    expect(isAccepted(offer('a', 'L1', '2026-10-20', { acceptedOfferId: 'other' }))).toBe(false);
    expect(isAccepted(offer('a', 'L1', '2026-10-20'))).toBe(false);
  });
});
