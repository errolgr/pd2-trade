import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import type { ListingFreshness, MarketApi } from './types';

/**
 * What a buyer agreed to when acting on a listing: its price note, HR price and item. A bump alone changes
 * nothing the buyer sees, so it doesn't count.
 */
export function listingChanged(shown: MarketListingEntry, current: MarketListingEntry): boolean {
  return (
    (shown.price ?? '').trim() !== (current.price ?? '').trim() ||
    (shown.hr_price ?? null) !== (current.hr_price ?? null) ||
    (!!shown.item?.hash && !!current.item?.hash && shown.item.hash !== current.item.hash)
  );
}

/**
 * Re-reads a listing from PD2 (search results come from our market service and can trail PD2 by a few seconds)
 * before an offer or whisper: `gone` when PD2 no longer has it or an offer was accepted, `changed` (with the
 * current listing) when its price or item differ, `unknown` when the check itself failed.
 */
export async function verifyListing(
  api: Pick<MarketApi, 'getListing'>,
  shown: MarketListingEntry,
): Promise<ListingFreshness> {
  let current: MarketListingEntry | null;
  try {
    current = await api.getListing(shown._id);
  } catch {
    return { status: 'unknown' };
  }
  if (!current || current.accepted_offer_id) return { status: 'gone' };
  return listingChanged(shown, current) ? { status: 'changed', listing: current } : { status: 'ok', listing: current };
}
