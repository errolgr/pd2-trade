import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import type { WhisperTrade } from '@/lib/whisper-history';
import { findMarketLinks } from '@/pages/chat/lib/market-links';
import { itemDisplayName } from '@/pages/market/lib/listing';

/** What a trade whisper says about the item: the chat watcher's parse and the raw message. */
export type WhisperedItem = Pick<WhisperTrade, 'itemName' | 'price' | 'message'>;

/**
 * The whispered item's name: the chat watcher's, else a linked listing's display name, else the text after
 * "interested in your" (the watcher finds no name when the whisper has no "listed for" clause).
 */
export function whisperedItemName(trade: WhisperedItem): string | undefined {
  const parsed = trade.itemName?.trim();
  if (parsed) return parsed;
  const linked = findMarketLinks(trade.message)
    .find((link) => link.displayName)
    ?.displayName?.trim();
  if (linked) return linked;
  return /interested in your\s+(.+?)(?:\s+listed\b.*)?[\s.!?]*$/i.exec(trade.message)?.[1] || undefined;
}

/**
 * A name as both sides spell it: no D2 colour codes, accents, quotes or punctuation, any case and spacing
 * ("Bul-Kathos' Tribal Guardian" and "bul kathos tribal guardian" are one name). A trailing "…" or "..."
 * (whispers cut long names) becomes "…" for {@link sameText}.
 */
export function normalizeItemName(name: string): string {
  return name
    .replace(/ÿc./gi, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/(?:\.\.\.|…)\s*$/, '…')
    .replace(/['‘’`"]/g, '')
    .replace(/[^a-z0-9…]+/g, ' ')
    .trim();
}

/**
 * A price as the whisper carries it: the chat watcher cuts it at the first "." ("2.5 HR" arrives as "2", a
 * trailing full stop goes), so the listing's price is cut the same way before comparing.
 */
function normalizePrice(price: string): string {
  return price.split('.')[0].replace(/\s+/g, ' ').trim().toLowerCase();
}

/** Whispered text against the listing's (both normalized); a whisper cut with "…" matches by prefix. */
function sameText(whispered: string, listed: string): boolean {
  if (!whispered) return false;
  if (!whispered.endsWith('…')) return whispered === listed;
  const prefix = whispered.slice(0, -1).trimEnd();
  return prefix.length > 0 && listed.startsWith(prefix);
}

/**
 * The user's listings a trade whisper is about. A listing linked in the message is exact. Otherwise every
 * listing whose name (as listed, or as the market shows it: "Rare Amulet") matches the whispered one; when
 * several do (charms, jewels, runes, rares), the whispered price narrows them, unless no listing has that price
 * (repriced since). Empty when nothing matches or the whisper names no item.
 */
export function matchTradeListings(
  listings: readonly MarketListingEntry[],
  trade: WhisperedItem,
): MarketListingEntry[] {
  const linkedIds = new Set(findMarketLinks(trade.message).map((link) => link.listingId));
  const linked = listings.filter((listing) => linkedIds.has(listing._id));
  if (linked.length > 0) return linked;

  const name = whisperedItemName(trade);
  if (!name) return [];
  const wanted = normalizeItemName(name);
  const byName = listings.filter((listing) =>
    [listing.item.name ?? '', itemDisplayName(listing.item)].some((listed) =>
      sameText(wanted, normalizeItemName(listed)),
    ),
  );
  const price = trade.price && normalizePrice(trade.price);
  if (byName.length < 2 || !price) return byName;

  const byPrice = byName.filter((listing) =>
    [listing.hr_price > 0 ? `${listing.hr_price} HR` : '', listing.price ?? ''].some((listed) =>
      sameText(price, normalizePrice(listed)),
    ),
  );
  return byPrice.length > 0 ? byPrice : byName;
}
