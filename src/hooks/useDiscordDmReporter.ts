import { useEffect, useRef } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import { listen } from '@/lib/browser-events';
import { holdListener } from '@/lib/listener';
import { isThreadMuted, loadChatPrefs } from '@/lib/chat-prefs';
import { inputIdleMs } from '@/lib/diablo-focus';
import { createDmReporter, type TradeEvent, UNKNOWN_SENDER } from '@/lib/discord-dm';
import { normalizeName as personKey } from '@/lib/whisper-history';
import { whisperThreadId } from '@/pages/chat/lib/identity';
import { usePd2Website } from './pd2website/usePD2Website';
import { toOfferNotification } from './pd2website/useOfferNotifications';
import type { TradeOffer } from './useTradeOffers';
import type { ISettings } from './useOptions';

/** How long an offer push waits for the offer lists to name its sender before it is reported without one. */
export const OFFER_SENDER_WAIT_MS = 15_000;
/** An offer older than this (vs. its notification) is not the one the notification is about. */
const OFFER_MATCH_SLACK_MS = 60_000;

let signedInToken: string | undefined;

/**
 * The app's one DM reporter (the settings page refreshes its cached prefs): reports trade events for the signed-in
 * user while they are away from the keyboard.
 */
export const dmReporter = createDmReporter({ getToken: () => signedInToken, idleMs: inputIdleMs });

const report = (event: TradeEvent) => void dmReporter.report(event);

interface WhisperEvent {
  from: string;
  message: string;
  itemName?: string;
  isJoin: boolean;
  isIncoming: boolean;
}

interface ChatMessagePush {
  _id: string;
  sender_id: string;
  conversation_id: string;
  content: string;
  sender?: { _id?: string; display_name?: string; username?: string };
}

interface PendingOffer {
  listingId: string;
  at: number;
  text?: string;
  timer: ReturnType<typeof setTimeout>;
}

/** The incoming offer on `listingId` a notification at `at` is about: the newest one made since. */
export function offerFor(offers: readonly TradeOffer[], listingId: string, at: number): TradeOffer | undefined {
  return offers
    .filter((o) => o.isIncoming && o.listingId === listingId && o.timestamp.getTime() >= at - OFFER_MATCH_SLACK_MS)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
}

/** The `POST /api/notify` event of an offer notification (and its offer, once the lists have it). */
export function offerEvent(text: string | undefined, listingId: string | undefined, offer?: TradeOffer): TradeEvent {
  return {
    type: 'offer',
    from: offer?.playerName ?? offer?.accountName,
    fallbackFrom: offer?.accountName ?? UNKNOWN_SENDER,
    account: offer?.accountName,
    message: text,
    itemName: offer?.itemName,
    listingId: listingId ?? offer?.listingId,
    offerText: offer?.price,
  };
}

/**
 * Exactly one instance (AppController): reports in-game whispers, offers on your listings and website chat messages to
 * pd2trader.com while you are away (no input for the `awayMinutes` of your Discord DM settings), so its bot DMs them to
 * your linked Discord account. Muted chat threads and ignored players are not reported. Fire-and-forget: toasts and
 * sounds (useSocketNotifications) never wait for it.
 */
export function useDiscordDmReporter(settings: ISettings | undefined) {
  const { isConnected, subscribeSocket, incomingOffers, authData } = usePd2Website();
  const token = settings?.pd2Token;
  useEffect(loadChatPrefs, []);

  useEffect(() => {
    signedInToken = token || undefined;
    dmReporter.invalidate();
  }, [token]);

  const ownUserId = authData?.user?._id;
  const incomingRef = useRef(incomingOffers);
  const pendingRef = useRef(new Map<string, PendingOffer>());
  const seenRef = useRef(new Set<string>());
  const firstTime = (id: string) => {
    if (seenRef.current.has(id)) return false;
    seenRef.current.add(id);
    if (seenRef.current.size > 200) seenRef.current = new Set([...seenRef.current].slice(-100));
    return true;
  };

  // In-game whispers (the chat log, Rust)
  const ignoreList = settings?.whisperIgnoreList;
  useEffect(() => {
    if (!isTauri() || !token) return;
    return holdListener(
      listen<WhisperEvent>('whisper-received', (event) => {
        const whisper = event.payload;
        if (!whisper.isIncoming || whisper.isJoin) return;
        const key = personKey(whisper.from);
        if (key === 'announcements') return;
        if ((ignoreList ?? []).some((name) => personKey(name) === key)) return;
        if (isThreadMuted([whisperThreadId(key)])) return;
        report({ type: 'whisper', from: whisper.from, message: whisper.message, itemName: whisper.itemName });
      }),
      'whisper-received (Discord DMs)',
    );
  }, [token, ignoreList]);

  // Offers on your listings: named once the offer lists (refreshed on the push) have the offer
  useEffect(() => {
    if (!isConnected || !token) return;
    const pending = pendingRef.current;
    const off = subscribeSocket<unknown>('system/notification_pushed', (raw) => {
      const notification = toOfferNotification(raw, Date.now());
      if (notification?.type !== 'offer_received' || !firstTime(notification.id)) return;
      const { listingId, text, at } = notification;
      const offer = listingId ? offerFor(incomingRef.current, listingId, at) : undefined;
      if (!listingId || offer) {
        if (!offer?.userId || !isThreadMuted([`user:${offer.userId}`])) report(offerEvent(text, listingId, offer));
        return;
      }
      const timer = setTimeout(() => {
        pending.delete(notification.id);
        report(offerEvent(text, listingId));
      }, OFFER_SENDER_WAIT_MS);
      pending.set(notification.id, { listingId, at, text, timer });
    });
    return () => {
      off();
      pending.forEach((p) => clearTimeout(p.timer));
      pending.clear();
    };
  }, [isConnected, subscribeSocket, token]);

  // The offer lists changed (refreshed after an offer push): name the offers waiting for their sender
  useEffect(() => {
    incomingRef.current = incomingOffers;
    for (const [id, p] of pendingRef.current) {
      const offer = offerFor(incomingOffers, p.listingId, p.at);
      if (!offer) continue;
      clearTimeout(p.timer);
      pendingRef.current.delete(id);
      if (offer.userId && isThreadMuted([`user:${offer.userId}`])) continue;
      report(offerEvent(p.text, p.listingId, offer));
    }
  }, [incomingOffers]);

  // Website chat messages from someone else
  useEffect(() => {
    if (!isConnected || !token) return;
    return subscribeSocket<ChatMessagePush>('social/message_pushed', (msg) => {
      if (!msg._id || !msg.sender_id || !msg.conversation_id || msg.sender_id === ownUserId) return;
      if (!firstTime(msg._id)) return;
      if (isThreadMuted([msg.conversation_id, `user:${msg.sender_id}`])) return;
      report({
        type: 'site_message',
        from: msg.sender?.username,
        fallbackFrom: msg.sender?.display_name ?? UNKNOWN_SENDER,
        message: msg.content,
      });
    });
  }, [isConnected, subscribeSocket, token, ownUserId]);
}
