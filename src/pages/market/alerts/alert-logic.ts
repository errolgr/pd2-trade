/**
 * Saved-search alerts, the pure part: the popup text of a `market.alert` and how a batch of them shows, and
 * which saved search a "Watch" of some filters is (`watchKey`).
 */
import { ToastActionType, type CustomToastPayload } from '@/common/types/Events';
import type { MarketFilters, SavedSearch } from '@/pages/market/lib/types';
import type { MarketAlert } from './saved-search-api';

/** More alerts than this at once (a catch-up after a reconnect) show as one summary popup. */
export const MAX_ALERT_TOASTS = 3;

/** "Harlequin Crest — 1.5 HR" (listing text is shown as plain text). */
export function alertListingText(alert: MarketAlert): string {
  const { listing } = alert;
  const item = (listing?.name || listing?.baseName || 'Item').slice(0, 60);
  const price =
    listing?.hrPrice != null && listing.hrPrice > 0
      ? `${listing.hrPrice} HR`
      : (listing?.price ?? '').trim().slice(0, 40) || 'no price';
  return `${item} — ${price}`;
}

const viewAction = (alert: MarketAlert): CustomToastPayload['action'] => ({
  label: 'View',
  type: ToastActionType.OPEN_MARKET_PANEL,
  data: { savedSearchId: alert.savedSearchId, focusListingId: alert.listingId, tab: 'search' },
});

/** The popups for new alerts (oldest first): one each, or one summary when there are many. */
export function alertToasts(alerts: readonly MarketAlert[]): CustomToastPayload[] {
  if (alerts.length === 0) return [];
  if (alerts.length > MAX_ALERT_TOASTS) {
    const newest = alerts[alerts.length - 1];
    return [
      {
        title: 'Market watch',
        description: `${alerts.length} new matches. Newest: ${newest.savedSearchName}: ${alertListingText(newest)}`,
        action: viewAction(newest),
      },
    ];
  }
  return alerts.map((alert) => ({
    title: 'Market watch',
    description: `${alert.savedSearchName}: ${alertListingText(alert)}`,
    action: viewAction(alert),
  }));
}

/**
 * What a watch matches on: the filters minus what alerts ignore or the server fills in (sort, age window, stat
 * row ids/weights, disabled stats, empty fields, order of rarities and rows). Equal keys = same watch.
 */
export function watchKey(filters: MarketFilters): string {
  const { sort: _sort, maxAgeDays: _age, stats, rarity, requirements, ...rest } = filters;
  const present = (value: unknown) => value !== undefined && value !== null && value !== '';
  const clean = (record: Record<string, unknown>) =>
    Object.fromEntries(
      Object.entries(record)
        .filter(([, value]) => present(value))
        .sort(([a], [b]) => a.localeCompare(b)),
    );
  return JSON.stringify({
    ...clean(rest),
    rarity: [...(rarity ?? [])].sort(),
    requirements: clean({ ...(requirements ?? {}) }),
    stats: (stats ?? [])
      .filter((s) => s.enabled !== false)
      .map((s) => clean({ kind: s.kind ?? 'mod', key: s.key, min: s.min, max: s.max, or: s.or || undefined }))
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
  });
}

/** The alerting saved search watching `filters`, if any (else a saved, not alerting, one with them). */
export function findWatch(
  searches: readonly SavedSearch[],
  filters: MarketFilters,
): { watching: SavedSearch | null; saved: SavedSearch | null } {
  const key = watchKey(filters);
  const same = searches.filter((s) => watchKey(s.filters) === key);
  return { watching: same.find((s) => s.alert) ?? null, saved: same.find((s) => !s.alert) ?? null };
}
