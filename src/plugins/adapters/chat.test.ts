import { describe, expect, it } from 'vitest';
import type { Message } from '@/common/types/pd2-website/ChatTypes';
import type { TimelineEntry } from '@/pages/chat/lib/inbox';
import { fromTimelineEntry, fromTradeMessageEvent, fromWebsiteMessage, fromWhisperEvent } from './chat';

const NOW = Date.parse('2026-11-03T12:00:00Z');

describe('fromTradeMessageEvent', () => {
  it('maps a trade whisper with its item and price, preferring the account name', () => {
    const msg = fromTradeMessageEvent(
      {
        isIncoming: true,
        playerName: 'BobSorc',
        accountName: 'BobAcc',
        characterName: 'BobSorc',
        message: "Hi, I'm interested in your Shako listed for 2 ist",
        itemName: 'Shako',
        price: '2 ist',
      },
      NOW,
    );
    expect(msg).toEqual({
      id: expect.stringMatching(/^game:/),
      channel: 'trade',
      direction: 'in',
      sender: 'BobAcc',
      text: "Hi, I'm interested in your Shako listed for 2 ist",
      at: '2026-11-03T12:00:00.000Z',
      itemName: 'Shako',
      priceText: '2 ist',
    });
  });

  it("leaves out the watcher's null item and price and gives each line its own id", () => {
    const event = { isIncoming: false, playerName: 'Bob', accountName: null, message: 'Hi', itemName: null, price: null };
    const a = fromTradeMessageEvent(event, NOW);
    const b = fromTradeMessageEvent(event, NOW);
    expect(a).not.toHaveProperty('itemName');
    expect(a).not.toHaveProperty('priceText');
    expect(a).toMatchObject({ direction: 'out', sender: 'Bob' });
    expect(a.id).not.toBe(b.id);
  });
});

describe('fromWhisperEvent', () => {
  it('maps a plain whisper and skips join notices', () => {
    expect(
      fromWhisperEvent({ isTrade: false, from: 'tharok', message: 'still here', isJoin: false, isIncoming: false }, NOW),
    ).toMatchObject({ channel: 'whisper', direction: 'out', sender: 'tharok', text: 'still here' });
    expect(fromWhisperEvent({ isTrade: false, from: 'x', message: 'joined', isJoin: true, isIncoming: true }, NOW)).toBeNull();
  });
});

describe('fromWebsiteMessage', () => {
  it('maps a pushed message, direction from the current user', () => {
    const message = {
      _id: 'm1',
      sender_id: 'u2',
      conversation_id: 'c1',
      content: 'hey',
      reader_ids: [],
      created_at: '2026-11-03T12:00:00.000Z',
      updated_at: '2026-11-03T12:00:00.000Z',
      created_by_id: 'u2',
      sender: { _id: 'u2', username: 'alice', created_at: '' },
    } satisfies Message;
    expect(fromWebsiteMessage(message, 'u1')).toEqual({
      id: 'm1',
      channel: 'website',
      direction: 'in',
      sender: 'alice',
      text: 'hey',
      at: '2026-11-03T12:00:00.000Z',
    });
    expect(fromWebsiteMessage(message, 'u2').direction).toBe('out');
  });
});

describe('fromTimelineEntry', () => {
  const entry = (over: Partial<TimelineEntry>): TimelineEntry => ({
    key: 'w:bob:1',
    source: 'whisper',
    own: false,
    content: 'hello',
    createdAt: '2026-11-03T12:00:00.000Z',
    unread: false,
    ...over,
  });

  it('keys by the entry and names the sender from the thread', () => {
    expect(fromTimelineEntry(entry({}), { other: 'Bob' })).toEqual({
      id: 'w:bob:1',
      channel: 'whisper',
      direction: 'in',
      sender: 'Bob',
      text: 'hello',
      at: '2026-11-03T12:00:00.000Z',
    });
    expect(fromTimelineEntry(entry({ own: true }), { other: 'Bob', self: 'me' })).toMatchObject({
      direction: 'out',
      sender: 'me',
    });
  });

  it('reads item and price from a trade whisper', () => {
    expect(
      fromTimelineEntry(entry({ content: "Hi, I'm interested in your Shako listed for 2 ist." }), { other: 'Bob' }),
    ).toMatchObject({ channel: 'trade', itemName: 'Shako', priceText: '2 ist' });
  });

  it('maps website entries and skips offer/trade event rows', () => {
    expect(fromTimelineEntry(entry({ source: 'website', key: 'm1' }), { other: 'Bob' })).toMatchObject({
      id: 'm1',
      channel: 'website',
    });
    expect(
      fromTimelineEntry(entry({ trade: { outcome: 'sold', settledAt: NOW } as TimelineEntry['trade'] }), { other: 'Bob' }),
    ).toBeNull();
  });
});
