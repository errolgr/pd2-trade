import { describe, expect, it } from 'vitest';
import type { TradeOffer } from '@/hooks/useTradeOffers';
import { EMPTY_PREFS, setThreadPrefs, type ChatPrefs } from '@/lib/chat-prefs';
import { OPEN_TRADE_MS, type WhisperPerson, type WhisperTrade } from '@/lib/whisper-history';
import {
  ACCEPTED_OFFERS_KEPT,
  markOffersSeen,
  newAcceptedOffers,
  newTrades,
  recordAcceptedOffers,
} from './offers-seen';

const NOW = Date.parse('2026-10-18T12:00:00Z');
const ago = (minutes: number) => NOW - minutes * 60_000;

const trade = (id: string, minutesAgo: number, over: Partial<WhisperTrade> = {}): WhisperTrade => ({
  id,
  isIncoming: true,
  message: 'wtb',
  timestamp: ago(minutesAgo),
  ...over,
});

const person = (key: string, trades: WhisperTrade[]): WhisperPerson => ({
  key,
  accountName: key,
  playerName: key,
  messages: [],
  trades,
  readAt: 0,
});

const offer = (id: string, over: Partial<TradeOffer> = {}): TradeOffer => ({
  id,
  isIncoming: false,
  playerName: 'seller',
  itemName: 'Shako',
  price: '2 ist',
  timestamp: new Date(ago(30)),
  listingId: `l-${id}`,
  userId: `u-${id}`,
  acceptedOfferId: id,
  ...over,
});

const NONE = new Set<string>();

describe('newTrades', () => {
  it('counts incoming open trades newer than the global and the thread seen marks', () => {
    const alice = person('alice', [
      trade('t1', 5),
      trade('t2', 5, { isIncoming: false }),
      trade('t3', 5, { dismissed: true }),
      trade('t4', OPEN_TRADE_MS / 60_000 + 1),
      trade('t5', 50),
    ]);
    const bob = person('bob', [trade('b1', 20), trade('b2', 2)]);
    let prefs: ChatPrefs = { ...EMPTY_PREFS, offersSeenAt: ago(60) };
    prefs = setThreadPrefs(prefs, ['whisper:bob'], { offersSeenAt: ago(10) });
    const found = newTrades(prefs, [alice, bob], NOW).map((t) => t.trade.id);
    expect(found).toEqual(['t1', 't5', 'b2']);
    expect(newTrades({ ...prefs, offersSeenAt: ago(30) }, [alice], NOW).map((t) => t.trade.id)).toEqual(['t1']);
  });
});

describe('markOffersSeen', () => {
  it('marks only the thread, under all of its ids', () => {
    const next = markOffersSeen(EMPTY_PREFS, 5, ['c1', 'user:u1']);
    expect(next.offersSeenAt).toBeUndefined();
    expect(next.threads).toEqual({ c1: { offersSeenAt: 5 }, 'user:u1': { offersSeenAt: 5 } });
  });

  it('marks everything, dropping covered thread marks but keeping later ones and other preferences', () => {
    let prefs = setThreadPrefs(EMPTY_PREFS, ['a'], { offersSeenAt: 3, pinnedAt: 1 });
    prefs = setThreadPrefs(prefs, ['b'], { offersSeenAt: 10 });
    prefs = setThreadPrefs(prefs, ['c'], { offersSeenAt: 5 });
    const next = markOffersSeen(prefs, 5);
    expect(next.offersSeenAt).toBe(5);
    expect(next.threads).toEqual({ a: { pinnedAt: 1 }, b: { offersSeenAt: 10 } });
  });
  it('returns the same prefs when nothing changes', () => {
    const thread = markOffersSeen(EMPTY_PREFS, 5, ['c1', 'user:u1']);
    expect(markOffersSeen(thread, 4, ['c1', 'user:u1'])).toBe(thread);
    const global: ChatPrefs = { ...EMPTY_PREFS, offersSeenAt: 9 };
    expect(markOffersSeen(global, 7)).toBe(global);
  });
});

describe('recordAcceptedOffers', () => {
  it('records offers already accepted when tracking starts as old', () => {
    const next = recordAcceptedOffers(EMPTY_PREFS, [offer('o1'), offer('o2', { acceptedOfferId: 'x' })], NONE, NOW);
    expect(next.acceptedOffers).toEqual({ o1: 0 });
  });

  it('starts tracking with no accepted offer, and records later ones at now', () => {
    const started = recordAcceptedOffers(EMPTY_PREFS, [offer('o1', { acceptedOfferId: undefined })], NONE, NOW);
    expect(started.acceptedOffers).toEqual({});
    const next = recordAcceptedOffers(started, [offer('o1'), offer('o2')], new Set(['l-o2']), NOW);
    expect(next.acceptedOffers).toEqual({ o1: NOW, o2: 0 });
  });

  it('returns the same prefs when nothing changes', () => {
    expect(recordAcceptedOffers(EMPTY_PREFS, [], NONE, NOW)).toBe(EMPTY_PREFS);
    const prefs: ChatPrefs = { ...EMPTY_PREFS, acceptedOffers: { o1: 4 } };
    const ignored = [
      offer('o1'),
      offer('o2', { isIncoming: true }),
      offer('o3', { acceptedOfferId: 'other' }),
      offer('o4', { listingClosed: true }),
    ];
    expect(recordAcceptedOffers(prefs, ignored, NONE, NOW)).toBe(prefs);
  });

  it('keeps the newest ones', () => {
    const known = Object.fromEntries(Array.from({ length: ACCEPTED_OFFERS_KEPT }, (_, i) => [`k${i}`, i + 1]));
    const next = recordAcceptedOffers({ ...EMPTY_PREFS, acceptedOffers: known }, [offer('o1')], NONE, NOW);
    expect(Object.keys(next.acceptedOffers!)).toHaveLength(ACCEPTED_OFFERS_KEPT);
    expect(next.acceptedOffers!.o1).toBe(NOW);
    expect(next.acceptedOffers!.k0).toBeUndefined();
  });
});

describe('newAcceptedOffers', () => {
  it('counts offers recorded after they were seen, unless notified, old, or their thread was seen', () => {
    let prefs: ChatPrefs = {
      ...EMPTY_PREFS,
      offersSeenAt: 10,
      acceptedOffers: { o1: 20, o2: 5, o3: 20, o4: 0, o5: 20 },
    };
    prefs = setThreadPrefs(prefs, ['user:u-o5'], { offersSeenAt: 30 });
    const outgoing = ['o1', 'o2', 'o3', 'o4', 'o5', 'o6'].map((id) => offer(id));
    expect(newAcceptedOffers(prefs, outgoing, new Set(['l-o3'])).map((o) => o.id)).toEqual(['o1']);
  });
});
