/**
 * Market listing links in chat messages. The site's "I'm interested" message links
 * https://projectdiablo2.com/market/listing/<id>?display="<name>" (with or without www).
 */
const MARKET_LISTING_URL =
  /https?:\/\/(?:www\.)?projectdiablo2\.com\/market\/listing\/([a-f0-9]+)(?:\?display=((?:"[^"]+")|(?:[^\s"<>]+)))?/gi;

export interface MarketLink {
  start: number;
  end: number;
  url: string;
  listingId: string;
  displayName: string | null;
}

export type MessageSegment =
  | { type: 'text'; content: string }
  | { type: 'link'; content: string; url: string; listingId: string };

/** Every listing link in `text`, in order. A malformed percent escape in the display name is kept as typed. */
export function findMarketLinks(text: string): MarketLink[] {
  return Array.from(text.matchAll(MARKET_LISTING_URL), (match) => {
    let displayName: string | null = null;
    if (match[2]) {
      const raw = match[2].replace(/^["']|["']$/g, '');
      try {
        displayName = decodeURIComponent(raw);
      } catch {
        displayName = raw;
      }
    }
    return {
      start: match.index,
      end: match.index + match[0].length,
      url: match[0],
      listingId: match[1],
      displayName,
    };
  });
}

/**
 * Splits a message into text and listing links. When the display name already appears before its URL
 * ("interested in your Shako https://…?display=Shako") that mention becomes the link and the raw URL is dropped.
 */
export function parseMessage(text: string): MessageSegment[] {
  const segments: MessageSegment[] = [];
  let lastIndex = 0;

  for (const { start, end, url, listingId, displayName } of findMarketLinks(text)) {
    const before = text.substring(lastIndex, start);
    const mention = displayName ? before.lastIndexOf(displayName) : -1;

    if (displayName && mention !== -1) {
      if (mention > 0) segments.push({ type: 'text', content: before.substring(0, mention) });
      segments.push({ type: 'link', content: displayName, url, listingId });
      const between = before.substring(mention + displayName.length);
      if (between.trim()) segments.push({ type: 'text', content: between });
    } else {
      if (before) segments.push({ type: 'text', content: before });
      segments.push({
        type: 'link',
        content: displayName || `Market Listing ${listingId.substring(0, 8)}...`,
        url,
        listingId,
      });
    }
    lastIndex = end;
  }

  if (lastIndex < text.length) segments.push({ type: 'text', content: text.substring(lastIndex) });
  return segments.length > 0 ? segments : [{ type: 'text', content: text }];
}

/** Conversation list preview: "📦 <item>" for a message that links a listing, else the message itself. */
export function messagePreview(content: string): string {
  const [link] = findMarketLinks(content);
  if (!link) return content;
  return link.displayName ? `📦 ${link.displayName}` : '📦 Market Listing';
}

/**
 * A composer draft split into the text the user types and the listing links attached to it (shown as pills,
 * never as raw URLs): each link is cut out with the one space `joinDraft` put before it.
 */
export function splitDraft(draft: string): { text: string; links: MarketLink[] } {
  const links = findMarketLinks(draft);
  let text = '';
  let last = 0;
  for (const link of links) {
    const start = link.start > last && draft[link.start - 1] === ' ' ? link.start - 1 : link.start;
    text += draft.slice(last, start);
    last = link.end;
  }
  return { text: text + draft.slice(last), links };
}

/** The draft (and the message sent) for `text` with listing `urls` attached: the links follow the text. */
export function joinDraft(text: string, urls: readonly string[]): string {
  if (urls.length === 0) return text;
  return text ? `${text} ${urls.join(' ')}` : urls.join(' ');
}
