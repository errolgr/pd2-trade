import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { itemDisplayName, sellerAccount } from './listing';

/**
 * Default whisper body (the price check's wording). Placeholders: `{item}`, `{price}`, `{seller}` (website
 * username), `{account}` (in-game account).
 */
export const DEFAULT_WHISPER_TEMPLATE = "Hi, I'm interested in your {item} listed for {price}";

/** Listing text is user-supplied: one line, no control characters, bounded length. */
function oneLine(text: string | undefined, max = 80): string {
  const noControl = Array.from(text ?? '', (ch) => {
    const code = ch.charCodeAt(0);
    return code < 0x20 || code === 0x7f ? ' ' : ch;
  }).join('');
  const clean = noControl.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

/**
 * `/w *<account> <message>` for the game chat. The account is sellerAccount (falling back to the website
 * username, as the price check does); the message is `template` with placeholders filled. When the listing has
 * no price, the default template drops its "listed for" clause.
 */
export function buildWhisper(listing: MarketListingEntry, template: string = DEFAULT_WHISPER_TEMPLATE): string {
  const account = oneLine(sellerAccount(listing) || listing.user?.username);
  const price = listing.hr_price > 0 ? `${listing.hr_price} HR` : oneLine(listing.price);
  const body = (price || template !== DEFAULT_WHISPER_TEMPLATE ? template : "Hi, I'm interested in your {item}")
    .replace(/\{item\}/g, oneLine(listing.item ? itemDisplayName(listing.item) : 'item'))
    .replace(/\{price\}/g, price)
    .replace(/\{seller\}/g, oneLine(listing.user?.username))
    .replace(/\{account\}/g, account)
    .replace(/\s+/g, ' ')
    .trim();
  return `/w *${account} ${body}`.trim();
}
