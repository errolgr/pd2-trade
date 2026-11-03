import type { ChatMessage } from '@pd2-trader/plugin-sdk';
import type { Message } from '@/common/types/pd2-website/ChatTypes';
import type { TradeMessageEvent, WhisperEvent } from '@/lib/whisper-history';
import type { TimelineEntry } from '@/pages/chat/lib/inbox';
import { whisperedItemName } from '@/pages/delist/trade-match';

/** Plain-JSON views of chat lines for `chat.decorate` / `chat.action` and the `chat.message` event. */

const TRADE_WHISPER = /^Hi, I'm interested in your\b/i;
const LISTED_FOR = /\blisted for\s+(.+?)[\s.!?]*$/i;

let gameSeq = 0;
/** Chat log lines carry no id: time plus a per-session counter (two lines can share a millisecond). */
const gameLineId = (now: number) => `game:${now.toString(36)}:${(++gameSeq).toString(36)}`;

function withOptional(message: ChatMessage, itemName: string | null | undefined, priceText: string | null | undefined) {
  const item = itemName?.trim();
  const price = priceText?.trim();
  if (item) message.itemName = item;
  if (price) message.priceText = price;
  return message;
}

/** A "Hi, I'm interested in your…" whisper (`trade-message`), in or out. */
export function fromTradeMessageEvent(event: TradeMessageEvent, now: number): ChatMessage {
  return withOptional(
    {
      id: gameLineId(now),
      channel: 'trade',
      direction: event.isIncoming ? 'in' : 'out',
      sender: event.accountName || event.characterName || event.playerName,
      text: event.message,
      at: new Date(now).toISOString(),
    },
    event.itemName,
    event.price,
  );
}

/** Any whisper (`whisper-received`); join notices are not chat lines (null). */
export function fromWhisperEvent(event: WhisperEvent, now: number): ChatMessage | null {
  if (event.isJoin) return null;
  return withOptional(
    {
      id: gameLineId(now),
      channel: event.isTrade ? 'trade' : 'whisper',
      direction: event.isIncoming ? 'in' : 'out',
      sender: event.from,
      text: event.message,
      at: new Date(now).toISOString(),
    },
    event.itemName,
    undefined,
  );
}

/** A pd2trader.com message pushed by the socket; `currentUserId` decides its direction. */
export function fromWebsiteMessage(message: Message, currentUserId: string | undefined): ChatMessage {
  return {
    id: message._id,
    channel: 'website',
    direction: message.sender_id === currentUserId ? 'out' : 'in',
    sender: message.sender?.username ?? message.sender_id,
    text: message.content,
    at: message.created_at,
  };
}

/**
 * A chat thread message (either source); event rows (settled offers and trades) are not messages (null).
 * `names` are the thread's other side and, for your own messages, you.
 */
export function fromTimelineEntry(entry: TimelineEntry, names: { other: string; self?: string }): ChatMessage | null {
  if (entry.offer || entry.trade) return null;
  const direction = entry.own ? 'out' : 'in';
  const sender = entry.own
    ? (entry.message?.sender?.username ?? names.self ?? '')
    : (entry.message?.sender?.username ?? names.other);
  const base = { id: entry.key, direction, sender, text: entry.content, at: entry.createdAt } as const;
  if (entry.source === 'website') return { ...base, channel: 'website' };
  if (!TRADE_WHISPER.test(entry.content)) return { ...base, channel: 'whisper' };
  return withOptional(
    { ...base, channel: 'trade' },
    whisperedItemName({ message: entry.content }),
    LISTED_FOR.exec(entry.content)?.[1],
  );
}
