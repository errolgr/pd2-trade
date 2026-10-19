import { describe, expect, it } from 'vitest';
import type { Conversation, Message } from '@/common/types/pd2-website/ChatTypes';
import type { TradeOffer } from '@/hooks/useTradeOffers';
import { OPEN_TRADE_MS, type WhisperPerson } from '@/lib/whisper-history';
import type { ChatMessage } from '../hooks/useChatStore';
import { buildInbox, buildTimeline, threadWhisperAccount, type InboxInput } from './inbox';

const ME = 'me';
const NOW = Date.parse('2026-10-18T12:00:00Z');
const ago = (minutes: number) => NOW - minutes * 60_000;
const iso = (minutes: number) => new Date(ago(minutes)).toISOString();

const message = (id: string, sender: string, content: string, minutesAgo: number, over: Partial<ChatMessage> = {}) =>
  ({
    _id: id,
    conversation_id: 'c1',
    sender_id: sender,
    content,
    reader_ids: [],
    created_at: iso(minutesAgo),
    updated_at: iso(minutesAgo),
    created_by_id: sender,
    ...over,
  }) satisfies Message;

const conversation = (
  id: string,
  other: { id: string; username: string; accounts?: string[] },
  over: Partial<Conversation> = {},
): Conversation => ({
  _id: id,
  participant_ids: [ME, other.id],
  created_at: iso(1000),
  updated_at: iso(1000),
  created_by_id: ME,
  unread_count: 0,
  participants: [
    { _id: ME, username: 'me', created_at: '' },
    { _id: other.id, username: other.username, created_at: '', game: { accounts: other.accounts ?? [] } },
  ],
  ...over,
});

const person = (key: string, over: Partial<WhisperPerson> = {}): WhisperPerson => ({
  key,
  accountName: key,
  playerName: key,
  messages: [],
  trades: [],
  readAt: 0,
  ...over,
});

const offer = (over: Partial<TradeOffer>): TradeOffer => ({
  id: 'o1',
  isIncoming: true,
  playerName: 'someone',
  itemName: 'Shako',
  price: '2 ist',
  timestamp: new Date(ago(30)),
  listingId: 'l1',
  userId: 'u-x',
  ...over,
});

const inbox = (input: Partial<InboxInput>) =>
  buildInbox({ conversations: [], currentUserId: ME, people: {}, offers: [], now: NOW, ...input });

describe('buildInbox', () => {
  it('merges a linked whisper sender and website offers into the conversation of the same person', () => {
    const threads = inbox({
      conversations: [
        conversation(
          'c-alice',
          { id: 'alice', username: 'Alice', accounts: ['AliceAcc'] },
          {
            unread_count: 1,
            latest_message: message('m1', 'alice', 'hello', 60),
          },
        ),
      ],
      people: {
        aliceacc: person('aliceacc', {
          messages: [{ id: 'w1', isIncoming: true, message: 'whisper hi', timestamp: ago(5) }],
        }),
      },
      offers: [offer({ userId: 'alice', timestamp: new Date(ago(30)) })],
    });
    expect(threads).toHaveLength(1);
    const [alice] = threads;
    expect(alice).toMatchObject({ id: 'c-alice', name: 'Alice', userId: 'alice', unread: 2, selling: true });
    expect(alice.people.map((p) => p.key)).toEqual(['aliceacc']);
    expect(alice.offers.map((o) => o.id)).toEqual(['o1']);
    // The newest item across sources: the whisper
    expect(alice.latest).toMatchObject({ text: 'whisper hi', source: 'whisper', own: false, at: ago(5) });
  });

  it('gives unmatched senders and offers-only users threads of their own, all ordered by their newest item', () => {
    const threads = inbox({
      conversations: [
        conversation('c-bob', { id: 'bob', username: 'bob' }, { latest_message: message('m1', ME, 'sold', 10) }),
        conversation('c-empty', { id: 'carol', username: 'carol' }),
      ],
      people: { zed: person('zed', { messages: [{ id: 'w', isIncoming: false, message: 'inv', timestamp: ago(1) }] }) },
      offers: [
        offer({ id: 'o9', userId: 'dave', playerName: 'dave', isIncoming: false, timestamp: new Date(ago(20)) }),
      ],
    });
    expect(threads.map((t) => [t.id, t.name, t.latest?.text])).toEqual([
      ['whisper:zed', 'zed', 'inv'],
      ['c-bob', 'bob', 'sold'],
      ['user:dave', 'dave', 'Your offer: 2 ist for Shako'],
      ['c-empty', 'carol', undefined],
    ]);
    expect(threads[1].latest).toMatchObject({ own: true, source: 'website' });
  });

  it('links a whisper sender to an offers-only user by the account on the offer', () => {
    const threads = inbox({
      people: { daveacc: person('daveacc') },
      offers: [offer({ userId: 'dave', playerName: 'dave', accountName: 'DaveAcc' })],
    });
    expect(threads.map((t) => [t.id, t.people.length])).toEqual([['user:dave', 1]]);
  });

  it("links whispers to a conversation by an account only its partner's offers carry, and whispers go there", () => {
    const input = {
      conversations: [conversation('c-u2', { id: 'u2', username: 'u2web' })],
      offers: [offer({ userId: 'u2', accountName: 'Thumoi' })],
    };
    const [before] = inbox(input);
    expect(before.accounts).toEqual(['Thumoi']);
    expect(threadWhisperAccount(before)).toBe('Thumoi');

    const threads = inbox({ ...input, people: { thumoi: person('thumoi', { accountName: 'Thumoi' }) } });
    expect(threads.map((t) => [t.id, t.people.map((p) => p.key)])).toEqual([['c-u2', ['thumoi']]]);
    expect(threadWhisperAccount(threads[0])).toBe('Thumoi');
  });

  it('marks threads selling/buying from offers and open trade whispers', () => {
    const trade = (isIncoming: boolean, age = 0, dismissed?: true) => ({
      id: `t${Number(isIncoming)}${age}`,
      isIncoming,
      message: 'Hi',
      timestamp: NOW - age,
      dismissed,
    });
    const threads = inbox({
      people: {
        seller: person('seller', { trades: [trade(true)] }),
        buyer: person('buyer', { trades: [trade(false)] }),
        stale: person('stale', { trades: [trade(true, OPEN_TRADE_MS), trade(false, 0, true)] }),
      },
      offers: [offer({ id: 'in', userId: 'u1' }), offer({ id: 'out', userId: 'u2', isIncoming: false })],
    });
    const flags = Object.fromEntries(threads.map((t) => [t.id, [t.selling, t.buying]]));
    expect(flags).toEqual({
      'whisper:seller': [true, false],
      'whisper:buyer': [false, true],
      'whisper:stale': [false, false],
      'user:u1': [true, false],
      'user:u2': [false, true],
    });
  });
});

describe('buildTimeline', () => {
  const whispers = person('bob', {
    messages: [
      { id: 'w-old', isIncoming: true, message: 'very old whisper', timestamp: ago(120) },
      { id: 'w-mid', isIncoming: true, message: 'whisper between', timestamp: ago(15) },
      { id: 'w-new', isIncoming: false, message: 'copied reply', timestamp: ago(1), copied: true },
    ],
  });
  const website = [
    message('a', 'bob', 'first website', 30),
    message('b', ME, 'second website', 10),
    message('tmp-1', ME, 'pending send', 0, { clientId: 'tmp-1', status: 'sending' }),
  ];

  it('interleaves website messages and whispers by time, keeping pending sends with their time', () => {
    const entries = buildTimeline(website, [whispers], ME, false);
    expect(entries.map((e) => [e.source, e.own, e.content])).toEqual([
      ['whisper', false, 'very old whisper'],
      ['website', false, 'first website'],
      ['whisper', false, 'whisper between'],
      ['website', true, 'second website'],
      ['whisper', true, 'copied reply'],
      ['website', true, 'pending send'],
    ]);
    expect(entries[4].copied).toBe(true);
    expect(entries[5]).toMatchObject({ key: 'tmp-1', message: { status: 'sending' } });
  });

  it('leaves out whispers older than the loaded website page while older pages remain', () => {
    const entries = buildTimeline(website, [whispers], ME, true);
    expect(entries.map((e) => e.content)).not.toContain('very old whisper');
    expect(entries).toHaveLength(5);
  });

  it('shows only whispers for a whisper-only thread', () => {
    expect(buildTimeline([], [whispers], ME, false).map((e) => e.key)).toEqual([
      'w:bob:w-old',
      'w:bob:w-mid',
      'w:bob:w-new',
    ]);
  });
});
