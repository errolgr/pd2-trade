import { describe, expect, it } from 'vitest';
import type { Conversation, Message } from '@/common/types/pd2-website/ChatTypes';
import type { TradeOffer } from '@/hooks/useTradeOffers';
import { OPEN_TRADE_MS, type WhisperPerson } from '@/lib/whisper-history';
import type { ChatMessage } from '../hooks/useChatStore';
import { setThreadPrefs, EMPTY_PREFS } from '@/lib/chat-prefs';
import {
  buildInbox,
  buildTimeline,
  threadAliases,
  threadWhisperAccount,
  visibleThreads,
  type InboxInput,
} from './inbox';

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

  it('gives an offers-only user the profile the offer resolved, and links whispers from any of their accounts', () => {
    const bryan = {
      _id: 'bryan',
      username: 'bryan',
      created_at: '2023-09-28T05:06:13.767Z',
      game: { accounts: ['Bryan', 'SGSF-Bryan'], beta_accounts: ['BryanBeta'] },
    };
    const threads = inbox({
      people: { 'sgsf-bryan': person('sgsf-bryan', { accountName: 'SGSF-Bryan' }) },
      offers: [offer({ userId: 'bryan', playerName: 'bryan', accountName: 'Bryan', user: bryan, isIncoming: false })],
    });
    expect(threads.map((t) => [t.id, t.people.map((p) => p.key)])).toEqual([['user:bryan', ['sgsf-bryan']]]);
    expect(threads[0].participant).toBe(bryan);
    expect(threads[0].accounts).toEqual(['Bryan', 'SGSF-Bryan', 'BryanBeta']);
  });

  it('gives a contact opened from the market a thread only when no other thread has that user', () => {
    const threads = inbox({
      conversations: [conversation('c-bob', { id: 'bob', username: 'bob' })],
      offers: [offer({ userId: 'dave', playerName: 'dave' })],
      contacts: [
        { userId: 'bob', name: 'bob' },
        { userId: 'dave', name: 'dave' },
        { userId: 'erin', name: 'erin' },
      ],
    });
    expect(threads.map((t) => t.id).sort()).toEqual(['c-bob', 'user:dave', 'user:erin']);
    expect(threads.find((t) => t.id === 'user:erin')).toMatchObject({
      name: 'erin',
      userId: 'erin',
      latest: undefined,
    });
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

  it('applies thread preferences found under any of its ids: pinned first, muted, archived until a newer message', () => {
    let prefs = setThreadPrefs(EMPTY_PREFS, ['whisper:bobacc'], { pinnedAt: 1, muted: true });
    prefs = setThreadPrefs(prefs, ['c-carl'], { archivedAt: ago(20) });
    prefs = setThreadPrefs(prefs, ['c-dora'], { archivedAt: ago(20) });
    const threads = inbox({
      prefs,
      conversations: [
        conversation(
          'c-bob',
          { id: 'bob', username: 'bob', accounts: ['BobAcc'] },
          {
            latest_message: message('m1', 'bob', 'old', 60),
          },
        ),
        conversation(
          'c-carl',
          { id: 'carl', username: 'carl' },
          { latest_message: message('m2', 'carl', 'before', 30) },
        ),
        conversation(
          'c-dora',
          { id: 'dora', username: 'dora' },
          { latest_message: message('m3', 'dora', 'after', 10) },
        ),
      ],
    });
    expect(threads.map((t) => [t.id, t.pinned, t.muted, t.archived])).toEqual([
      ['c-bob', true, true, false],
      ['c-dora', false, false, false],
      ['c-carl', false, false, true],
    ]);
    expect(visibleThreads(threads, 'all', '').map((t) => t.id)).toEqual(['c-bob', 'c-dora']);
    expect(visibleThreads(threads, 'archived', '').map((t) => t.id)).toEqual(['c-carl']);
    expect(visibleThreads(threads, 'all', ' DORA ').map((t) => t.id)).toEqual(['c-dora']);
  });

  it('knows a thread by its id, conversation, user and the whisper names of its people and accounts', () => {
    const [thread] = inbox({
      conversations: [conversation('c1', { id: 'u1', username: 'web', accounts: ['*Acc1'] })],
      people: { acc1: person('acc1', { characterName: 'Sorc' }) },
    });
    expect(threadAliases(thread).sort()).toEqual(['c1', 'user:u1', 'whisper:acc1', 'whisper:sorc'].sort());
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

  it('places your settled offers by the time you made them, as unread-free events, honouring the paging cutoff', () => {
    const offer = (id: string, minutes: number): TradeOffer => ({
      id,
      isIncoming: false,
      playerName: 'bob',
      itemName: 'Ber',
      price: '1 ber',
      timestamp: new Date(ago(minutes)),
      listingClosed: true,
    });
    const offers = [offer('o-mid', 20), offer('o-old', 200)];
    const keys = (hasOlder: boolean) => buildTimeline(website, [whispers], ME, hasOlder, offers).map((e) => e.key);
    expect(keys(false)).toEqual([
      'offer:o-old',
      'w:bob:w-old',
      'a',
      'offer:o-mid',
      'w:bob:w-mid',
      'b',
      'w:bob:w-new',
      'tmp-1',
    ]);
    expect(keys(true)).not.toContain('offer:o-old');
    const entry = buildTimeline(website, [], ME, false, offers).find((e) => e.key === 'offer:o-mid');
    expect(entry).toMatchObject({ own: true, unread: false, offer: { id: 'o-mid' } });
  });

  it('shows only whispers for a whisper-only thread', () => {
    expect(buildTimeline([], [whispers], ME, false).map((e) => e.key)).toEqual([
      'w:bob:w-old',
      'w:bob:w-mid',
      'w:bob:w-new',
    ]);
  });

  it('flags unread entries: incoming whispers after readAt and website messages from them not read by me', () => {
    const read = person('bob', {
      readAt: ago(20),
      messages: [
        { id: 'w1', isIncoming: true, message: 'seen', timestamp: ago(30) },
        { id: 'w2', isIncoming: true, message: 'new', timestamp: ago(15) },
      ],
    });
    const entries = buildTimeline(
      [message('a', 'bob', 'read', 25, { reader_ids: [ME] }), message('b', 'bob', 'unread', 5), website[1]],
      [read],
      ME,
      false,
    );
    expect(entries.map((e) => [e.content, e.unread])).toEqual([
      ['seen', false],
      ['read', false],
      ['new', true],
      ['unread', true],
      ['second website', false],
    ]);
  });
});
