import { useSyncExternalStore } from 'react';

export type BadgeKey = 'chatUnread' | 'tradeMessages' | 'tradeOffers';

const counts: Record<BadgeKey, number> = { chatUnread: 0, tradeMessages: 0, tradeOffers: 0 };
const subscribers = new Set<() => void>();

export function setBadgeCount(key: BadgeKey, n: number): void {
  if (counts[key] === n) return;
  counts[key] = n;
  subscribers.forEach((notify) => notify());
}

export function getBadgeCount(key: BadgeKey): number {
  return counts[key];
}

function subscribe(notify: () => void) {
  subscribers.add(notify);
  return () => {
    subscribers.delete(notify);
  };
}

export function useBadgeCount(key: BadgeKey): number {
  return useSyncExternalStore(subscribe, () => counts[key]);
}
