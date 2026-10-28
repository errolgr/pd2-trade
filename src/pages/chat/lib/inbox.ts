/**
 * The unified inbox: one thread per person, merging website conversations, in-game whispers (linked to a
 * website user by their registered accounts, see identity.ts) and website offers (by user id).
 */
import type { Conversation, Message, Participant } from '@/common/types/pd2-website/ChatTypes';
import type { TradeOffer } from '@/hooks/useTradeOffers';
import { EMPTY_PREFS, isArchived, prefsFor, type ChatPrefs } from '@/lib/chat-prefs';
import { isOpenTrade, nameAliases, unreadWhispers, whisperTarget, type WhisperPerson } from '@/lib/whisper-history';
import type { ChatMessage } from '../hooks/useChatStore';
import { otherParticipant, participantName } from '../components/chat-parts';
import { knownAccounts, linkSender, whisperThreadId } from './identity';
import { messagePreview } from './market-links';

/** 'archived' shows only archived threads; the others leave them out. */
export type InboxFilter = 'all' | 'selling' | 'buying' | 'archived';
export type MessageSource = 'website' | 'whisper';

/** The newest item of a thread, across its sources. */
export interface InboxPreview {
  text: string;
  /** Epoch ms. */
  at: number;
  own: boolean;
  source: MessageSource;
  /** The website message it is, for read receipts. */
  message?: Message;
}

export interface InboxThread {
  /**
   * The conversation id; `user:<id>` for a website user with offers, or one messaged from elsewhere (the market),
   * but no conversation; `whisper:<key>`.
   */
  id: string;
  name: string;
  conversation?: Conversation;
  /** The website user's profile: the conversation's other participant, else the user an offer resolved. */
  participant?: Participant;
  /** The website user on the other side, if known (website DMs can reach them). */
  userId?: string;
  /** Whisper senders linked to this thread. */
  people: WhisperPerson[];
  /** Website offers with this user, both directions. */
  offers: TradeOffer[];
  /** Every in-game account known for the website user (see knownAccounts); whispers from them link here. */
  accounts: string[];
  latest?: InboxPreview;
  unread: number;
  /** Has incoming offers or open incoming trade whispers. */
  selling: boolean;
  /** Has outgoing offers or open outgoing trade whispers. */
  buying: boolean;
  /** Client-only preferences (lib/chat-prefs). */
  pinned: boolean;
  muted: boolean;
  archived: boolean;
}

export interface InboxInput {
  conversations: readonly Conversation[];
  currentUserId: string | undefined;
  people: Readonly<Record<string, WhisperPerson>>;
  /** Visible website offers, incoming and outgoing. */
  offers: readonly TradeOffer[];
  now: number;
  prefs?: ChatPrefs;
  /**
   * Website users opened from elsewhere (a seller in the market) who get a thread even without any history.
   * `user` seeds the thread's participant so an in-game-only trader resolved from their account (see
   * useResolvedSellers) brings its registered game accounts along, letting whispers link in via linkSender.
   */
  contacts?: readonly { userId: string; name: string; user?: Participant }[];
}

/** Pinned threads first (newest first among them), then the rest newest first (threads without any message last). */
export function buildInbox({
  conversations,
  currentUserId,
  people,
  offers,
  now,
  prefs = EMPTY_PREFS,
  contacts = [],
}: InboxInput): InboxThread[] {
  const threads = new Map<string, InboxThread>();
  const byUser = new Map<string, InboxThread>();
  const add = (thread: InboxThread) => {
    threads.set(thread.id, thread);
    if (thread.userId && !byUser.has(thread.userId)) byUser.set(thread.userId, thread);
    return thread;
  };

  // Fresh fields for a new thread (filled in once every source is merged)
  const blank = () => ({
    people: [],
    offers: [],
    accounts: [],
    unread: 0,
    selling: false,
    buying: false,
    pinned: false,
    muted: false,
    archived: false,
  });

  for (const conversation of conversations) {
    const participant = otherParticipant(conversation, currentUserId);
    add({
      id: conversation._id,
      name: participantName(participant),
      conversation,
      participant,
      userId: participant?._id,
      ...blank(),
    });
  }

  for (const offer of offers) {
    let thread = offer.userId ? byUser.get(offer.userId) : undefined;
    if (!thread) {
      thread = add({
        id: offer.userId ? `user:${offer.userId}` : `offer:${offer.id}`,
        name: offer.playerName,
        userId: offer.userId,
        ...blank(),
      });
    }
    thread.offers.push(offer);
    // An offer-only thread still knows who they are: username, joined date, every account their whispers can come from
    thread.participant ??= offer.user;
  }

  // Accounts a contact's user brings to a thread that already has them (its conversation partner may list none)
  const contactAccounts = new Map<string, { accountName: string }[]>();
  for (const contact of contacts) {
    const existing = byUser.get(contact.userId);
    if (!existing) {
      add({
        id: `user:${contact.userId}`,
        name: contact.name,
        userId: contact.userId,
        participant: contact.user,
        ...blank(),
      });
      continue;
    }
    existing.participant ??= contact.user;
    const accounts = contact.user?.game?.accounts ?? [];
    if (accounts.length > 0)
      contactAccounts.set(
        existing.id,
        accounts.map((accountName) => ({ accountName })),
      );
  }

  // Accounts once every offer is in: a conversation partner may only show accounts on their offers
  const candidates = [...threads.values()].map((thread) => {
    thread.accounts = knownAccounts(thread.participant, [...thread.offers, ...(contactAccounts.get(thread.id) ?? [])]);
    return { threadId: thread.id, accounts: thread.accounts };
  });

  for (const person of Object.values(people)) {
    const linked = linkSender(person, candidates);
    const thread =
      (linked && threads.get(linked)) ||
      threads.get(whisperThreadId(person.key)) ||
      add({ id: whisperThreadId(person.key), name: person.playerName, ...blank() });
    thread.people.push(person);
  }

  for (const thread of threads.values()) {
    const items: InboxPreview[] = [];
    const latestMessage = thread.conversation?.latest_message;
    if (latestMessage) {
      items.push({
        text: messagePreview(latestMessage.content),
        at: Date.parse(latestMessage.created_at) || 0,
        own: latestMessage.sender_id === currentUserId,
        source: 'website',
        message: latestMessage,
      });
    }
    for (const person of thread.people) {
      const last = person.messages.at(-1);
      if (last) items.push({ text: last.message, at: last.timestamp, own: !last.isIncoming, source: 'whisper' });
    }
    for (const offer of thread.offers) {
      items.push({
        text: `${offer.isIncoming ? 'Offer' : 'Your offer'}: ${offer.price ?? '?'}${offer.itemName ? ` for ${offer.itemName}` : ''}`,
        at: offer.timestamp.getTime(),
        own: !offer.isIncoming,
        source: 'website',
      });
    }
    thread.latest = items.reduce<InboxPreview | undefined>((a, b) => (a && a.at >= b.at ? a : b), undefined);
    thread.unread =
      (thread.conversation?.unread_count || 0) + thread.people.reduce((sum, p) => sum + unreadWhispers(p), 0);
    const openTrades = thread.people.flatMap((p) => p.trades.filter((t) => isOpenTrade(t, now)));
    thread.selling = thread.offers.some((o) => o.isIncoming) || openTrades.some((t) => t.isIncoming);
    thread.buying = thread.offers.some((o) => !o.isIncoming) || openTrades.some((t) => !t.isIncoming);
    const threadPrefs = prefsFor(prefs, threadAliases(thread));
    thread.pinned = threadPrefs.pinnedAt !== undefined;
    thread.muted = !!threadPrefs.muted;
    thread.archived = isArchived(threadPrefs, thread.latest?.at ?? 0);
  }

  return [...threads.values()].sort(
    (a, b) => Number(b.pinned) - Number(a.pinned) || (b.latest?.at ?? 0) - (a.latest?.at ?? 0),
  );
}

/**
 * Every id a thread is known by: its id, its conversation, its website user and `whisper:<name>` for each
 * name of its whisper senders and each account known for its user. Thread preferences are stored under all
 * of them; a notification finds a thread by any of them.
 */
export function threadAliases(
  thread: Pick<InboxThread, 'id' | 'conversation' | 'userId' | 'people' | 'accounts'>,
): string[] {
  const ids = new Set([thread.id]);
  if (thread.conversation) ids.add(thread.conversation._id);
  if (thread.userId) ids.add(`user:${thread.userId}`);
  for (const name of [
    ...thread.people.flatMap((p) => [p.key, p.accountName, p.characterName, p.playerName]),
    ...thread.accounts,
  ]) {
    for (const key of nameAliases(name)) ids.add(whisperThreadId(key));
  }
  return [...ids];
}

/** The list rows for a filter and search text (name, username, in-game names, latest message). */
export function visibleThreads(threads: readonly InboxThread[], filter: InboxFilter, search: string) {
  const query = search.toLowerCase().trim();
  return threads.filter(
    (thread) =>
      (filter === 'archived'
        ? thread.archived
        : !thread.archived && (filter === 'all' || (filter === 'selling' ? thread.selling : thread.buying))) &&
      (!query ||
        [
          thread.name,
          thread.participant?.username,
          ...thread.people.map((person) => person.playerName),
          thread.latest?.text,
        ].some((text) => text?.toLowerCase().includes(query))),
  );
}

/**
 * Whom `/w *<account>` from a thread reaches: its whisper sender (linked by one of `thread.accounts`), else
 * the first account known for its website user; undefined when no account is known.
 */
export const threadWhisperAccount = (thread: Pick<InboxThread, 'people' | 'accounts'>) =>
  thread.people[0] ? whisperTarget(thread.people[0]) : thread.accounts[0];

/** One message of a thread's timeline, from either source, or one of your settled offers. */
export interface TimelineEntry {
  /** Stable list key (a website send keeps its client id across the server ack). */
  key: string;
  source: MessageSource;
  own: boolean;
  content: string;
  /** ISO timestamp. */
  createdAt: string;
  /** Website messages: send status, read receipts, retry. */
  message?: ChatMessage;
  /** A whisper copied from the overlay that the game log has not shown as sent yet. */
  copied?: boolean;
  /** From them and not read yet. */
  unread: boolean;
  /** An offer you made that is no longer open: an event row at the time you made it, not a message. */
  offer?: TradeOffer;
}

/**
 * Website messages (kept in their order: confirmed, then pending sends) interleaved with the whispers of
 * `people` and the `offers` (your settled ones) by time. While older website pages are still unloaded,
 * whispers and offers before the oldest loaded website message are left out, so paging back never slips
 * website messages in above entries already shown.
 */
export function buildTimeline(
  website: readonly ChatMessage[],
  people: readonly WhisperPerson[],
  currentUserId: string | undefined,
  hasOlder: boolean,
  offers: readonly TradeOffer[] = [],
): TimelineEntry[] {
  const oldestWebsite = website.length > 0 && hasOlder ? Date.parse(website[0].created_at) : -Infinity;
  const others = [
    ...people.flatMap((person) =>
      person.messages.map(
        (m): TimelineEntry => ({
          key: `w:${person.key}:${m.id}`,
          source: 'whisper',
          own: !m.isIncoming,
          content: m.message,
          createdAt: new Date(m.timestamp).toISOString(),
          copied: m.copied,
          unread: m.isIncoming && m.timestamp > person.readAt,
        }),
      ),
    ),
    ...offers.map(
      (offer): TimelineEntry => ({
        key: `offer:${offer.id}`,
        source: 'website',
        own: true,
        content: '',
        createdAt: offer.timestamp.toISOString(),
        unread: false,
        offer,
      }),
    ),
  ]
    .filter((entry) => Date.parse(entry.createdAt) >= oldestWebsite)
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));

  const entries: TimelineEntry[] = [];
  let w = 0;
  for (const message of website) {
    const at = Date.parse(message.created_at);
    while (w < others.length && Date.parse(others[w].createdAt) < at) entries.push(others[w++]);
    const own = message.sender_id === currentUserId;
    entries.push({
      key: message.clientId ?? message._id,
      source: 'website',
      own,
      content: message.content,
      createdAt: message.created_at,
      message,
      unread: !own && !message.status && !!currentUserId && !message.reader_ids?.includes(currentUserId),
    });
  }
  return entries.concat(others.slice(w));
}
