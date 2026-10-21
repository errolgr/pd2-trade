import { describe, expect, it } from 'vitest';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import type { MarketFilters, SavedSearch } from '@/pages/market/lib/types';
import {
  ALERT_POLL_MS,
  alertingSearches,
  alertToastText,
  diffListings,
  filtersFingerprint,
  MAX_BACKOFF_MS,
  rateLimitBackoff,
  SEEN_CAP,
} from './alert-logic';

const listing = (id: string, over: Partial<MarketListingEntry> = {}) =>
  ({
    _id: id,
    hr_price: 0,
    price: 'offers',
    item: { name: 'Harlequin Crest', base: { name: 'Shako' } },
    ...over,
  }) as unknown as MarketListingEntry;

const filters = (over: Partial<MarketFilters> = {}) =>
  ({ source: 'live', itemName: 'Harlequin Crest', stats: [], ...over }) as unknown as MarketFilters;

const search = (id: string, alert: boolean, name = `search ${id}`): SavedSearch => ({
  id,
  name,
  filters: filters(),
  alert,
  createdAt: '2026-10-21T00:00:00Z',
});

const all = () => true;

describe('diffListings', () => {
  it('seeds silently on the first poll', () => {
    const { next, fresh } = diffListings(undefined, 'f', [listing('a'), listing('b')], all);
    expect(fresh).toEqual([]);
    expect([...next.ids].sort()).toEqual(['a', 'b']);
  });

  it('alerts only on unseen matching listings, and never twice', () => {
    const seeded = diffListings(undefined, 'f', [listing('a')], all).next;
    const first = diffListings(seeded, 'f', [listing('c'), listing('b'), listing('a')], (l) => l._id !== 'b');
    expect(first.fresh.map((l) => l._id)).toEqual(['c']);

    const again = diffListings(first.next, 'f', [listing('c'), listing('b'), listing('a')], all);
    expect(again.fresh).toEqual([]);
  });

  it('does not alert later on a listing that did not match when first seen', () => {
    const seeded = diffListings(undefined, 'f', [], all).next;
    const first = diffListings(seeded, 'f', [listing('x')], () => false);
    expect(first.fresh).toEqual([]);
    expect(diffListings(first.next, 'f', [listing('x')], all).fresh).toEqual([]);
  });

  it('seeds again (no alerts) when the search filters changed', () => {
    const seeded = diffListings(undefined, 'f1', [listing('a')], all).next;
    const changed = diffListings(seeded, 'f2', [listing('a'), listing('b')], all);
    expect(changed.fresh).toEqual([]);
    expect(changed.next.fingerprint).toBe('f2');
    expect(changed.next.ids.has('b')).toBe(true);
  });

  it('keeps the state as is when nothing new came in', () => {
    const seeded = diffListings(undefined, 'f', [listing('a')], all).next;
    expect(diffListings(seeded, 'f', [listing('a')], all).next).toBe(seeded);
  });

  it('caps remembered ids, dropping the oldest first', () => {
    const many = Array.from({ length: SEEN_CAP }, (_, i) => listing(`old${i}`));
    const seeded = diffListings(undefined, 'f', many, all).next;
    const { next, fresh } = diffListings(seeded, 'f', [listing('new')], all);
    expect(fresh.map((l) => l._id)).toEqual(['new']);
    expect(next.ids.size).toBe(SEEN_CAP);
    expect(next.ids.has('new')).toBe(true);
    expect(next.ids.has('old0')).toBe(false);
  });
});

describe('alertingSearches', () => {
  it('polls only alerting searches, at most 10, none while alerts are off', () => {
    const searches = [search('off', false), ...Array.from({ length: 12 }, (_, i) => search(`s${i}`, true))];
    const polled = alertingSearches({ savedSearches: searches, alertsEnabled: true });
    expect(polled).toHaveLength(10);
    expect(polled.map((s) => s.id)).not.toContain('off');
    expect(alertingSearches({ savedSearches: searches, alertsEnabled: false })).toEqual([]);
  });
});

describe('filtersFingerprint', () => {
  it('ignores stat row ids but not stat values', () => {
    const stat = { kind: 'mod' as const, key: 'item_fastercastrate', min: 20, enabled: true };
    const a = filtersFingerprint(filters({ stats: [{ ...stat, id: '1' }] }));
    expect(filtersFingerprint(filters({ stats: [{ ...stat, id: '2' }] }))).toBe(a);
    expect(filtersFingerprint(filters({ stats: [{ ...stat, id: '1', min: 10 }] }))).not.toBe(a);
  });
});

describe('rateLimitBackoff', () => {
  it('doubles from the poll interval, honours a longer retry-after, and caps', () => {
    expect(rateLimitBackoff(0, 5000)).toBe(ALERT_POLL_MS * 2);
    expect(rateLimitBackoff(ALERT_POLL_MS * 2, 5000)).toBe(ALERT_POLL_MS * 4);
    expect(rateLimitBackoff(0, 120_000)).toBe(120_000);
    expect(rateLimitBackoff(MAX_BACKOFF_MS, 5000)).toBe(MAX_BACKOFF_MS);
  });
});

describe('alertToastText', () => {
  it('names the search, the newest item and its price', () => {
    const text = alertToastText(search('s', true, 'Cheap shakos'), [listing('a', { hr_price: 1.5 }), listing('b')]);
    expect(text).toEqual({ title: 'Market alert', description: '2 new: Cheap shakos — Harlequin Crest 1.5 HR' });
  });

  it('falls back to the price note when there is no HR price', () => {
    const text = alertToastText(search('s', true, 'S'), [listing('a', { price: '  2 ist  ' })]);
    expect(text.description).toBe('1 new: S — Harlequin Crest 2 ist');
  });
});
