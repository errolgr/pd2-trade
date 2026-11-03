// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { OfferNotification } from '@/hooks/pd2website/useOfferNotifications';
import type { TradeOffer } from '@/hooks/useTradeOffers';
import type { WhisperPerson, WhisperTrade } from '@/lib/whisper-history';
import {
  buildFeed,
  getChatFeed,
  offerNotificationLanding,
  offersLanding,
  openOffers,
  provideChatFeedActions,
  publishChatFeed,
  resetChatFeed,
  useChatFeed,
  type FeedItem,
} from './chat-feed';
import type { InboxThread } from './lib/inbox';
import type { NewTrade } from './lib/offers-seen';

const NOW = Date.parse('2026-10-18T12:00:00Z');
const ago = (minutes: number) => NOW - minutes * 60_000;

const thread = (id: string, over: Partial<InboxThread> = {}): InboxThread => ({
  id,
  name: id,
  people: [],
  offers: [],
  accounts: [],
  unread: 0,
  selling: false,
  buying: false,
  pinned: false,
  muted: false,
  archived: false,
  ...over,
});

const offer = (id: string, over: Partial<TradeOffer> = {}): TradeOffer => ({
  id,
  isIncoming: true,
  playerName: `p-${id}`,
  itemName: `item-${id}`,
  price: `price-${id}`,
  timestamp: new Date(ago(30)),
  listingId: 'l1',
  userId: `u-${id}`,
  ...over,
});

const notification = (id: string, type: OfferNotification['type'], minutesAgo: number, listingId = 'l1') =>
  ({ id, type, listingId, text: `pd2 ${id}`, at: ago(minutesAgo) }) satisfies OfferNotification;

const newTrade = (key: string, minutesAgo: number): NewTrade => {
  const trade: WhisperTrade = {
    id: `t-${key}`,
    isIncoming: true,
    message: 'wtb',
    itemName: 'Ber',
    price: '1 ber',
    timestamp: ago(minutesAgo),
  };
  const person: WhisperPerson = { key, playerName: `P${key}`, messages: [], trades: [trade], readAt: 0 };
  return { person, trade };
};

const feed = (input: Partial<Parameters<typeof buildFeed>[0]>) =>
  buildFeed({
    threads: [],
    notifications: [],
    incomingOffers: [],
    outgoingOffers: [],
    accepted: [],
    trades: [],
    threadOf: () => undefined,
    ...input,
  });

const item = (kind: FeedItem['kind'], minutesAgo: number, open: FeedItem['open'] = {}): FeedItem => ({
  key: `${kind}:${minutesAgo}`,
  kind,
  at: ago(minutesAgo),
  open,
});

afterEach(() => {
  resetChatFeed();
});

describe('buildFeed', () => {
  it('lists unread threads that are not muted or archived', () => {
    const items = feed({
      threads: [
        thread('c1', { unread: 2, latest: { text: 'hi', at: ago(1), own: false, source: 'website' } }),
        thread('c2'),
        thread('c3', { unread: 1, muted: true }),
        thread('c4', { unread: 1, archived: true }),
      ],
    });
    expect(items).toEqual([
      { key: 'message:c1', kind: 'message', name: 'c1', text: 'hi', count: 2, at: ago(1), open: { threadId: 'c1' } },
    ]);
  });

  it("shows a thread's trade whisper instead of its message, unless a message came after it", () => {
    const latest = (minutesAgo: number) => ({
      text: 'wtb',
      at: ago(minutesAgo),
      own: false,
      source: 'whisper' as const,
    });
    const amy = thread('c-amy', { unread: 1, latest: latest(3) });
    const bob = thread('c-bob', { unread: 2, latest: latest(0) });
    const items = feed({
      threads: [amy, bob],
      trades: [newTrade('amy', 3), newTrade('bob', 1)],
      threadOf: (id) => ({ 'whisper:amy': amy, 'whisper:bob': bob })[id],
    });
    expect(items.map((i) => i.key)).toEqual(['message:c-bob', 'trade:bob:t-bob', 'trade:amy:t-amy']);
  });

  it('matches a received offer notification to the offer on its listing closest in time', () => {
    const near = offer('near', { timestamp: new Date(ago(10)) });
    const items = feed({
      notifications: [notification('n1', 'offer_received', 11)],
      incomingOffers: [offer('far', { timestamp: new Date(ago(60)) }), near, offer('other', { listingId: 'l2' })],
      threadOf: (id) => (id === 'user:u-near' ? thread('c-near') : undefined),
    });
    expect(items).toEqual([
      {
        key: 'notification:n1',
        kind: 'offerReceived',
        name: 'p-near',
        itemName: 'item-near',
        price: 'price-near',
        text: undefined,
        at: ago(11),
        open: { threadId: 'c-near' },
      },
    ]);
  });

  it("falls back to the list and PD2's text, and skips revoked offers", () => {
    const items = feed({
      notifications: [
        notification('n1', 'offer_received', 1, 'l9'),
        notification('n2', 'offer_accepted', 2),
        notification('n3', 'offer_revoked', 3),
      ],
      outgoingOffers: [offer('o1', { isIncoming: false, acceptedOfferId: 'other' })],
    });
    expect(items.map(({ key, text, open }) => ({ key, text, open }))).toEqual([
      { key: 'notification:n1', text: 'pd2 n1', open: { filter: 'selling' } },
      { key: 'notification:n2', text: 'pd2 n2', open: { filter: 'buying' } },
    ]);
  });

  it('matches an accepted offer notification to your accepted offer', () => {
    const mine = offer('o1', { isIncoming: false, acceptedOfferId: 'o1' });
    const items = feed({ notifications: [notification('n1', 'offer_accepted', 1)], outgoingOffers: [mine] });
    expect(items[0]).toMatchObject({ kind: 'offerAccepted', name: 'p-o1', open: { filter: 'buying' } });
  });

  it('adds offers seen accepted and trades, newest first, opening their threads', () => {
    const items = feed({
      accepted: [{ offer: offer('o1', { isIncoming: false }), at: ago(5) }],
      trades: [newTrade('bob', 1), newTrade('amy', 3)],
      threadOf: (id) => (id === 'whisper:amy' ? thread('c-amy') : undefined),
    });
    expect(items.map(({ key, kind, open }) => ({ key, kind, open }))).toEqual([
      { key: 'trade:bob:t-bob', kind: 'trade', open: { threadId: 'whisper:bob' } },
      { key: 'trade:amy:t-amy', kind: 'trade', open: { threadId: 'c-amy' } },
      { key: 'accepted:o1', kind: 'offerAccepted', open: { filter: 'buying' } },
    ]);
    expect(items[0]).toMatchObject({ name: 'Pbob', itemName: 'Ber', price: '1 ber', at: ago(1) });
  });
});

describe('offersLanding', () => {
  const trade = item('trade', 1, { threadId: 'whisper:bob' });
  it.each([
    ['nothing', [], { filter: 'selling' }],
    ['messages only', [item('message', 0)], { filter: 'selling' }],
    ['one received offer', [item('offerReceived', 1)], { filter: 'selling' }],
    ['one accepted offer', [item('offerAccepted', 1)], { filter: 'buying' }],
    ['one trade', [item('message', 0), trade], { threadId: 'whisper:bob' }],
    ['selling side only', [trade, item('offerReceived', 2)], { filter: 'selling' }],
    ['buying side only', [item('offerAccepted', 1), item('offerAccepted', 2)], { filter: 'buying' }],
    ['mixed, trade newest', [item('message', 0), trade, item('offerAccepted', 2)], { threadId: 'whisper:bob' }],
    ['mixed, accepted newest', [item('offerAccepted', 1), item('offerReceived', 2)], { filter: 'buying' }],
  ] as const)('%s', (_, items, landing) => {
    expect(offersLanding(items as readonly FeedItem[])).toEqual(landing);
  });
});

describe('offerNotificationLanding', () => {
  it('opens the thread of the offer a notification is about, once the feed matched it', () => {
    publishChatFeed({
      items: [{ key: 'notification:n1', kind: 'offerReceived', at: ago(1), open: { threadId: 'user:bob' } }],
      canMarkAllRead: false,
    });
    expect(offerNotificationLanding('n1', false)).toEqual({ threadId: 'user:bob' });
  });

  it.each([
    [false, { filter: 'selling' }],
    [true, { filter: 'buying' }],
  ] as const)(
    'falls back to the list of its side (accepted %s) when the feed has no item for it',
    (accepted, landing) => {
      publishChatFeed({ items: [item('offerReceived', 1)], canMarkAllRead: false });
      expect(offerNotificationLanding('gone', accepted)).toEqual(landing);
    },
  );
});

describe('published feed', () => {
  it('opens the landing computed before the offers are seen', () => {
    const seeOffers = vi.fn(() => publishChatFeed({ items: [], canMarkAllRead: false }));
    provideChatFeedActions({ markAllRead: vi.fn(), seeOffers });
    publishChatFeed({ items: [item('offerAccepted', 1)], canMarkAllRead: true });
    const openChat = vi.fn();
    openOffers(openChat);
    expect(seeOffers).toHaveBeenCalledOnce();
    expect(openChat).toHaveBeenCalledWith({ filter: 'buying' });
    expect(seeOffers.mock.invocationCallOrder[0]).toBeLessThan(openChat.mock.invocationCallOrder[0]);
  });

  it('notifies subscribers only when the feed changed', () => {
    let renders = 0;
    const { result } = renderHook(() => {
      renders++;
      return useChatFeed();
    });
    const first = { items: [item('trade', 1)], canMarkAllRead: true };
    act(() => publishChatFeed(first));
    const count = renders;
    expect(result.current).toBe(first);
    act(() => publishChatFeed({ items: [item('trade', 1)], canMarkAllRead: true }));
    expect(renders).toBe(count);
    expect(getChatFeed()).toBe(first);
  });
});
