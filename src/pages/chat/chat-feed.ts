/**
 * What's new behind the chat button's badges, one item per unread thread, offer notification (or offer seen
 * accepted, the fallback), and new trade whisper: the button's peek lists them, the Offers button lands on them.
 * The chat panel (always mounted) builds and publishes it and provides the actions; the chat button and the
 * offers hotkey read it. Module level, like the badges.
 */
import { useSyncExternalStore } from 'react';
import type { TradeOffer } from '@/hooks/useTradeOffers';
import type { OfferNotification } from '@/hooks/pd2website/useOfferNotifications';
import type { PanelPayloads } from '@/overlay/types';
import type { InboxThread } from './lib/inbox';
import { whisperThreadId } from './lib/identity';
import { offerThreadId, type NewTrade } from './lib/offers-seen';

export type ChatPayload = NonNullable<PanelPayloads['chat']>;

export type FeedKind = 'message' | 'offerReceived' | 'offerAccepted' | 'trade';

export interface FeedItem {
  key: string;
  kind: FeedKind;
  /** The other trader, when known. */
  name?: string;
  itemName?: string;
  price?: string;
  /** A thread's latest message, or PD2's text for an offer that matched none in the lists. */
  text?: string;
  /** Unread messages (message items). */
  count?: number;
  /** Epoch ms. */
  at: number;
  /** Where clicking it lands: its thread, else the list holding it. */
  open: ChatPayload;
}

export interface ChatFeed {
  /** Newest first. */
  items: readonly FeedItem[];
  /** Something to mark read (also unread in muted or archived threads, which have no item). */
  canMarkAllRead: boolean;
}

export interface ChatFeedActions {
  /** The chat panel's Mark all read. */
  markAllRead: () => void;
  /** Every offer and trade whisper counts as looked at (the offers badge clears). */
  seeOffers: () => void;
}

/** The newest offer of `offers` closest in time to `at` (the one a notification is about). */
const closestOffer = (offers: readonly TradeOffer[], at: number) =>
  offers.reduce<TradeOffer | undefined>(
    (best, offer) =>
      !best || Math.abs(offer.timestamp.getTime() - at) < Math.abs(best.timestamp.getTime() - at) ? offer : best,
    undefined,
  );

/**
 * The feed: threads with unread messages (not muted or archived, like the chat badge), PD2 offer notifications
 * (received and accepted; matched to the offer they are about, by listing), your offers seen accepted without a
 * notification (`accepted`, with when) and new trade whispers. `threadOf` resolves any id a thread is known by
 * to the thread.
 */
export function buildFeed({
  threads,
  notifications,
  incomingOffers,
  outgoingOffers,
  accepted,
  trades,
  threadOf,
}: {
  threads: readonly InboxThread[];
  notifications: readonly OfferNotification[];
  incomingOffers: readonly TradeOffer[];
  outgoingOffers: readonly TradeOffer[];
  accepted: readonly { offer: TradeOffer; at: number }[];
  trades: readonly NewTrade[];
  threadOf: (id: string) => InboxThread | undefined;
}): FeedItem[] {
  const items: FeedItem[] = [];
  // Trade whispers first: a thread whose newest unread thing is its trade whisper shows that, not a message too
  const newestTrade = new Map<string, number>();
  for (const { person, trade } of trades) {
    const whisperThread = whisperThreadId(person.key);
    const threadId = threadOf(whisperThread)?.id ?? whisperThread;
    newestTrade.set(threadId, Math.max(newestTrade.get(threadId) ?? 0, trade.timestamp));
    items.push({
      key: `trade:${person.key}:${trade.id}`,
      kind: 'trade',
      name: person.playerName,
      itemName: trade.itemName,
      price: trade.price,
      at: trade.timestamp,
      open: { threadId },
    });
  }
  for (const thread of threads) {
    if (thread.unread === 0 || thread.muted || thread.archived) continue;
    const at = thread.latest?.at ?? 0;
    if (at <= (newestTrade.get(thread.id) ?? -1)) continue;
    items.push({
      key: `message:${thread.id}`,
      kind: 'message',
      name: thread.name,
      text: thread.latest?.text,
      count: thread.unread,
      at,
      open: { threadId: thread.id },
    });
  }
  const offerItem = (key: string, kind: FeedKind, offer: TradeOffer | undefined, at: number, text?: string) => {
    const thread = offer && threadOf(offerThreadId(offer));
    items.push({
      key,
      kind,
      name: offer?.playerName,
      itemName: offer?.itemName,
      price: offer?.price,
      text: offer ? undefined : text,
      at,
      open: thread ? { threadId: thread.id } : { filter: kind === 'offerAccepted' ? 'buying' : 'selling' },
    });
  };
  for (const notification of notifications) {
    if (notification.type === 'offer_revoked') continue;
    const isAccepted = notification.type === 'offer_accepted';
    const { listingId, at } = notification;
    const offer = closestOffer(
      (isAccepted ? outgoingOffers : incomingOffers).filter(
        (o) => !!listingId && o.listingId === listingId && (!isAccepted || o.acceptedOfferId === o.id),
      ),
      at,
    );
    const kind = isAccepted ? 'offerAccepted' : 'offerReceived';
    offerItem(`notification:${notification.id}`, kind, offer, at, notification.text);
  }
  for (const { offer, at } of accepted) offerItem(`accepted:${offer.id}`, 'offerAccepted', offer, at);
  return items.sort((a, b) => b.at - a.at);
}

/**
 * Where the Offers button lands: the view of what its badge counts. A trade whisper's thread, Selling for an
 * offer received, Buying for an offer accepted; several new ones: the list holding them all when they are on one
 * side (trade whispers you received are selling), else the newest one's view. Nothing new: Selling.
 */
export function offersLanding(items: readonly FeedItem[]): ChatPayload {
  const offers = items.filter((item) => item.kind !== 'message');
  const side = (item: FeedItem) => (item.kind === 'offerAccepted' ? 'buying' : 'selling');
  const newest = offers[0];
  if (!newest) return { filter: 'selling' };
  if (offers.length > 1 && offers.every((item) => side(item) === side(newest))) return { filter: side(newest) };
  return newest.kind === 'trade' ? newest.open : { filter: side(newest) };
}

const EMPTY_FEED: ChatFeed = { items: [], canMarkAllRead: false };
let feed = EMPTY_FEED;
let feedKey = '';
const listeners = new Set<() => void>();
let actions: ChatFeedActions = { markAllRead: () => {}, seeOffers: () => {} };

/** Publishes the feed (subscribers re-render only when it changed). */
export function publishChatFeed(next: ChatFeed): void {
  const key = JSON.stringify(next);
  if (key === feedKey) return;
  feed = next;
  feedKey = key;
  listeners.forEach((listener) => listener());
}

export const getChatFeed = (): ChatFeed => feed;

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const useChatFeed = (): ChatFeed => useSyncExternalStore(subscribe, getChatFeed);

/** The chat panel's actions, replaced on each of its renders (they close over its state). */
export function provideChatFeedActions(next: ChatFeedActions): void {
  actions = next;
}

export const chatFeedActions = (): ChatFeedActions => actions;

/** The Offers button and hotkey: open the view of what the offers badge counts, which counts as looking at it. */
export function openOffers(openChat: (payload: ChatPayload) => void): void {
  const payload = offersLanding(feed.items);
  actions.seeOffers();
  openChat(payload);
}

/**
 * Where an offer notification's toast lands: the thread of the offer it is about (its feed item), else the list
 * it belongs to (Buying for an accepted offer, Selling otherwise).
 */
export function offerNotificationLanding(notificationId: string, accepted: boolean): ChatPayload {
  return (
    feed.items.find((item) => item.key === `notification:${notificationId}`)?.open ?? {
      filter: accepted ? 'buying' : 'selling',
    }
  );
}

/** Tests: back to an empty feed and no actions. */
export function resetChatFeed(): void {
  feed = EMPTY_FEED;
  feedKey = '';
  actions = { markAllRead: () => {}, seeOffers: () => {} };
}
