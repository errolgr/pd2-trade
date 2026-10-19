// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getDeletedOffers,
  getDeletedOffersWithMetadata,
  markOfferAsDeleted,
  purgeOldDeletedOffers,
  unmarkOfferAsDeleted,
} from './deleted-offers-storage';

const KEY = 'pd2-deleted-outgoing-offers';
const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-10-18T12:00:00.000Z').getTime();

const stored = () => JSON.parse(localStorage.getItem(KEY) ?? 'null');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
});

describe('mark / unmark round-trip', () => {
  it('starts empty', () => {
    expect(getDeletedOffers().size).toBe(0);
    expect(getDeletedOffersWithMetadata()).toEqual([]);
  });

  it('remembers marked offers with their deletion time', () => {
    markOfferAsDeleted('a');
    vi.advanceTimersByTime(1000);
    markOfferAsDeleted('b');

    expect([...getDeletedOffers()].sort()).toEqual(['a', 'b']);
    expect(getDeletedOffersWithMetadata()).toEqual([
      { offerId: 'a', deletedAt: NOW },
      { offerId: 'b', deletedAt: NOW + 1000 },
    ]);
  });

  it('marking the same offer twice keeps one entry with the original timestamp', () => {
    markOfferAsDeleted('a');
    vi.advanceTimersByTime(DAY);
    markOfferAsDeleted('a');

    expect(getDeletedOffersWithMetadata()).toEqual([{ offerId: 'a', deletedAt: NOW }]);
  });

  it('unmarking removes only that offer', () => {
    markOfferAsDeleted('a');
    markOfferAsDeleted('b');

    unmarkOfferAsDeleted('a');
    unmarkOfferAsDeleted('never-marked');

    expect([...getDeletedOffers()]).toEqual(['b']);
  });

  it('unmarking with nothing stored does not create storage', () => {
    unmarkOfferAsDeleted('a');

    expect(localStorage.getItem(KEY)).toBeNull();
  });
});

describe('seven-day expiry', () => {
  it('keeps an offer just under seven days old and drops it at exactly seven days', () => {
    markOfferAsDeleted('a');

    vi.advanceTimersByTime(7 * DAY - 1);
    expect(getDeletedOffers().has('a')).toBe(true);

    vi.advanceTimersByTime(1);
    expect(getDeletedOffers().has('a')).toBe(false);
  });

  it('reading prunes expired entries from storage', () => {
    localStorage.setItem(
      KEY,
      JSON.stringify([
        { offerId: 'old', deletedAt: NOW - 8 * DAY },
        { offerId: 'new', deletedAt: NOW - DAY },
      ]),
    );

    expect(getDeletedOffersWithMetadata().map((o) => o.offerId)).toEqual(['new']);
    expect(stored()).toEqual([{ offerId: 'new', deletedAt: NOW - DAY }]);
  });

  it('an expired offer can be marked again with a fresh timestamp', () => {
    localStorage.setItem(KEY, JSON.stringify([{ offerId: 'a', deletedAt: NOW - 10 * DAY }]));

    markOfferAsDeleted('a');

    expect(stored()).toEqual([{ offerId: 'a', deletedAt: NOW }]);
  });

  it('purgeOldDeletedOffers rewrites storage without expired entries', () => {
    localStorage.setItem(
      KEY,
      JSON.stringify([
        { offerId: 'old', deletedAt: NOW - 7 * DAY },
        { offerId: 'new', deletedAt: NOW - 6 * DAY },
      ]),
    );

    purgeOldDeletedOffers();

    expect(stored()).toEqual([{ offerId: 'new', deletedAt: NOW - 6 * DAY }]);
  });
});

describe('corrupt storage', () => {
  it('reads as empty and does not throw from any operation', () => {
    localStorage.setItem(KEY, '{not json');

    expect(getDeletedOffers().size).toBe(0);
    expect(getDeletedOffersWithMetadata()).toEqual([]);
    expect(() => {
      markOfferAsDeleted('a');
      unmarkOfferAsDeleted('a');
      purgeOldDeletedOffers();
    }).not.toThrow();
  });
});
