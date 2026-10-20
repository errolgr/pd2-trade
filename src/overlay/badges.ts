import { useSyncExternalStore } from 'react';

/** chatUnread: website + whisper unread; whisperTrades: open trade whispers; tradeOffers: website offers. */
export type BadgeKey = 'chatUnread' | 'whisperTrades' | 'tradeOffers';

const counts: Record<BadgeKey, number> = { chatUnread: 0, whisperTrades: 0, tradeOffers: 0 };
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
