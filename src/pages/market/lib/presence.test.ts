import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { withPresence, withRowPresence } from './presence';

const listing = (id: string, over: Partial<MarketListingEntry> = {}) =>
  ({
    _id: id,
    user_last_online: '2026-10-18T10:00:00.000Z',
    user_last_ingame: undefined,
    ...over,
  }) as MarketListingEntry;

afterEach(() => {
  vi.useRealTimers();
});

describe('withPresence', () => {
  it("takes PD2's newer last-seen times and keeps the service's flags in step", () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-18T12:00:00Z'));
    const merged = withPresence(listing('a', { online: false, in_game: false }), {
      user_last_online: '2026-10-18T11:59:00.000Z',
      user_last_ingame: '2026-10-18T11:58:00.000Z',
    });
    expect(merged).toMatchObject({
      user_last_online: '2026-10-18T11:59:00.000Z',
      user_last_ingame: '2026-10-18T11:58:00.000Z',
      online: true,
      in_game: true,
    });
  });

  it('never replaces a newer stored time with an older or missing one (same object back)', () => {
    const stored = listing('a');
    expect(withPresence(stored, { user_last_online: '2026-10-17T00:00:00.000Z', user_last_ingame: null })).toBe(stored);
    expect(withPresence(stored, undefined)).toBe(stored);
  });
});

describe('withRowPresence', () => {
  it('merges by listing id in place, keeping the row order and untouched rows', () => {
    const rows = ['a', 'b', 'c'].map((id) => ({ listing: listing(id), score: null }));
    const merged = withRowPresence(
      rows,
      new Map([['c', { user_last_online: '2026-10-18T12:00:00.000Z', user_last_ingame: null }]]),
    );
    expect(merged.map((r) => r.listing._id)).toEqual(['a', 'b', 'c']);
    expect(merged[0]).toBe(rows[0]);
    expect(merged[2].listing.user_last_online).toBe('2026-10-18T12:00:00.000Z');
    expect(withRowPresence(rows, new Map())).toBe(rows);
  });
});
