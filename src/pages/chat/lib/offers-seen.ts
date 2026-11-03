/**
 * The offers badge on the chat button counts what is new since you last looked at the offers:
 * - PD2's unacknowledged offer notifications, offers received and accepted (useOfferNotifications);
 * - open trade whispers you received since then;
 * - the fallback for a missed `offer_accepted` push: your offers the overlay first saw accepted in the offer lists
 *   since then (ChatPrefs.acceptedOffers), unless a notification already stands for them.
 *
 * Looked at: the chat panel showed the Selling or Buying list, the Offers button was clicked or Mark all read was
 * used (everything up to then: ChatPrefs.offersSeenAt), or the thread was open on screen (its own items:
 * ThreadPrefs.offersSeenAt, stored under every id of the thread).
 */
import type { TradeOffer } from '@/hooks/useTradeOffers';
import { prefsFor, setThreadPrefs, type ChatPrefs } from '@/lib/chat-prefs';
import { isOpenTrade, type WhisperPerson, type WhisperTrade } from '@/lib/whisper-history';
import { whisperThreadId } from './identity';

/** Accepted offers remembered, newest first (the Buying list holds your 10 newest offers). */
export const ACCEPTED_OFFERS_KEPT = 50;

export interface NewTrade {
  person: WhisperPerson;
  trade: WhisperTrade;
}

/** The id of the thread an offer shows in (buildInbox), one its thread preferences are stored under. */
export const offerThreadId = (offer: TradeOffer) => (offer.userId ? `user:${offer.userId}` : `offer:${offer.id}`);

/** When the items of the thread known by `threadId` were last looked at (epoch ms, 0: never). */
const seenAt = (prefs: ChatPrefs, threadId: string) =>
  Math.max(prefs.offersSeenAt ?? 0, prefsFor(prefs, [threadId]).offersSeenAt ?? 0);

/** Up to when the offers were looked at (epoch ms, 0: never): everywhere, or in the thread known by `threadIds`. */
export const offersSeenUpTo = (prefs: ChatPrefs, threadIds?: readonly string[]) =>
  threadIds ? Math.min(...threadIds.map((id) => seenAt(prefs, id))) : (prefs.offersSeenAt ?? 0);

/** The open trade whispers `people` sent you since they were last looked at. */
export const newTrades = (prefs: ChatPrefs, people: readonly WhisperPerson[], now: number): NewTrade[] =>
  people.flatMap((person) => {
    const seen = seenAt(prefs, whisperThreadId(person.key));
    return person.trades
      .filter((trade) => trade.isIncoming && isOpenTrade(trade, now) && trade.timestamp > seen)
      .map((trade) => ({ person, trade }));
  });

/** One of your offers, accepted by the seller on a listing that is still up. */
export const isAcceptedOffer = (offer: TradeOffer) =>
  !offer.isIncoming && offer.acceptedOfferId === offer.id && !offer.listingClosed;

/**
 * Your offers first seen accepted (in the lists) since they were last looked at, leaving out those on
 * `notifiedListings` (an unacknowledged `offer_accepted` notification stands for them).
 */
export const newAcceptedOffers = (
  prefs: ChatPrefs,
  outgoing: readonly TradeOffer[],
  notifiedListings: ReadonlySet<string>,
): TradeOffer[] =>
  outgoing.filter(
    (offer) =>
      isAcceptedOffer(offer) &&
      !(offer.listingId && notifiedListings.has(offer.listingId)) &&
      (prefs.acceptedOffers?.[offer.id] ?? 0) > seenAt(prefs, offerThreadId(offer)),
  );

/**
 * Records your offers seen accepted for the first time: at `now`, or as old (0) when an `offer_accepted`
 * notification for their listing came in (`notifiedListings`) or tracking starts (the first time any of your
 * offers come in). Keeps the newest ACCEPTED_OFFERS_KEPT; returns `prefs` itself when nothing changes.
 */
export function recordAcceptedOffers(
  prefs: ChatPrefs,
  outgoing: readonly TradeOffer[],
  notifiedListings: ReadonlySet<string>,
  now: number,
): ChatPrefs {
  const known = prefs.acceptedOffers;
  if (!known && outgoing.length === 0) return prefs;
  const accepted = outgoing.filter((offer) => isAcceptedOffer(offer) && known?.[offer.id] === undefined);
  if (known && accepted.length === 0) return prefs;
  const entries = [
    ...Object.entries(known ?? {}),
    ...accepted.map(
      (offer) => [offer.id, known && !(offer.listingId && notifiedListings.has(offer.listingId)) ? now : 0] as const,
    ),
  ]
    .sort((a, b) => b[1] - a[1])
    .slice(0, ACCEPTED_OFFERS_KEPT);
  return { ...prefs, acceptedOffers: Object.fromEntries(entries) };
}

/**
 * Marks everything up to `at` looked at: with `threadIds` (every id of the open thread) only that thread's items;
 * else all of them, which drops the threads' own marks it covers. Returns `prefs` itself when nothing changes.
 */
export function markOffersSeen(prefs: ChatPrefs, at: number, threadIds?: readonly string[]): ChatPrefs {
  if (threadIds) {
    const marked = threadIds.every((id) => (prefs.threads[id]?.offersSeenAt ?? 0) >= at);
    return marked ? prefs : setThreadPrefs(prefs, threadIds, { offersSeenAt: at });
  }
  let next = prefs;
  if ((prefs.offersSeenAt ?? 0) < at) next = { ...prefs, offersSeenAt: at };
  for (const [id, thread] of Object.entries(prefs.threads)) {
    if (thread.offersSeenAt !== undefined && thread.offersSeenAt <= at) {
      next = setThreadPrefs(next, [id], { offersSeenAt: undefined });
    }
  }
  return next;
}
