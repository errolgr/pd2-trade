import { describe, expect, it } from 'vitest';
import { ToastActionType } from '@/common/types/Events';
import { defaultFilters } from '@/pages/market/lib/defaults';
import type { MarketFilters, SavedSearch } from '@/pages/market/lib/types';
import {
  ALERT_TOAST_DURATION_MS,
  alertListingText,
  alertToasts,
  findWatch,
  MAX_ALERT_TOASTS,
  watchKey,
} from './alert-logic';
import type { MarketAlert } from './saved-search-api';

const alert = (id: string, over: Partial<MarketAlert['listing']> = {}): MarketAlert => ({
  id,
  savedSearchId: 's1',
  savedSearchName: 'Cheap Shako',
  listingId: `l-${id}`,
  matchedAt: '2026-10-21T08:01:00Z',
  listing: {
    id: `l-${id}`,
    isLadder: true,
    isHardcore: false,
    name: 'Harlequin Crest',
    baseName: 'Shako',
    baseCode: 'uap',
    typeCode: 'helm',
    quality: 'Unique',
    price: '2 ist',
    hrPrice: 0.5,
    bumpedAt: null,
    seller: 'Gheed',
    status: 'active',
    soldHr: null,
    ...over,
  },
});

const base = (): MarketFilters => ({
  ...defaultFilters({ hardcore: false, ladder: true }),
  itemName: 'Harlequin Crest',
});
const search = (id: string, filters: MarketFilters, alert: boolean): SavedSearch => ({
  id,
  name: id,
  filters,
  alert,
  createdAt: '2026-10-21T00:00:00Z',
});

describe('alert popups', () => {
  it('shows "<search>: <item> — <price>" with a View action and the listing for its tooltip and drawer', () => {
    expect(alertToasts([alert('a')])).toEqual([
      {
        title: 'Market watch',
        duration: ALERT_TOAST_DURATION_MS,
        description: 'Cheap Shako: Harlequin Crest — 0.5 HR',
        action: {
          label: 'View',
          type: ToastActionType.OPEN_MARKET_PANEL,
          data: { savedSearchId: 's1', focusListingId: 'l-a', tab: 'search' },
        },
        listing: { listingId: 'l-a', savedSearchId: 's1' },
      },
    ]);
  });

  it('falls back to the base name and the price note', () => {
    expect(alertListingText(alert('a', { name: null, hrPrice: null, price: '  wug  ' }))).toBe('Shako — wug');
    expect(alertListingText(alert('a', { hrPrice: 0, price: null }))).toBe('Harlequin Crest — no price');
  });

  it('sums up a big catch-up in one popup on the newest alert', () => {
    const many = Array.from({ length: MAX_ALERT_TOASTS + 2 }, (_, i) => alert(`a${i}`));
    const toasts = alertToasts(many);
    expect(toasts).toHaveLength(1);
    expect(toasts[0].description).toMatch(/^5 new matches\. Newest: Cheap Shako: /);
    expect(toasts[0].action?.data.focusListingId).toBe(`l-a${many.length - 1}`);
    expect(toasts[0].listing).toEqual({ listingId: `l-a${many.length - 1}`, savedSearchId: 's1' });
  });
});

describe('watchKey / findWatch', () => {
  const stat = { id: 'r1', kind: 'mod' as const, key: 'item_fastercastrate', min: 20, enabled: true };

  it('treats filters the server normalized as the same watch', () => {
    const mine: MarketFilters = { ...base(), rarity: ['Unique', 'Set'], stats: [stat], priceText: '' };
    const server: MarketFilters = {
      ...base(),
      rarity: ['Set', 'Unique'],
      stats: [
        { ...stat, id: '0', weight: 2 },
        { id: '1', kind: 'mod', key: 'item_allskills', enabled: false },
      ],
      maxAgeDays: 30,
      sort: { by: 'price', dir: 'asc' },
    };
    expect(watchKey(server)).toBe(watchKey(mine));
  });

  it('tells different searches apart', () => {
    expect(watchKey({ ...base(), stats: [{ ...stat, min: 10 }] })).not.toBe(watchKey({ ...base(), stats: [stat] }));
    expect(watchKey({ ...base(), hardcore: true })).not.toBe(watchKey(base()));
    expect(watchKey({ ...base(), hrMax: 1 })).not.toBe(watchKey(base()));
  });

  it('finds the alerting search for the filters, else a saved one to turn on', () => {
    const watched = search('w', base(), true);
    const other = search('o', { ...base(), itemName: 'Spirit' }, true);
    expect(findWatch([other, watched], base())).toEqual({ watching: watched, saved: null });

    const saved = search('s', base(), false);
    expect(findWatch([other, saved], base())).toEqual({ watching: null, saved });
    expect(findWatch([other], base())).toEqual({ watching: null, saved: null });
  });
});
