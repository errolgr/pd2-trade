import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import type { ListingFreshness, MarketApi } from './types';

/**
 * Re-reads a listing from PD2 (search results come from our market service and can trail PD2 by a few seconds)
 * before an offer or whisper: `gone` when PD2 no longer has it or an offer was accepted, `ok` with PD2's current
 * copy otherwise, `unknown` when the check itself failed.
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
  return { status: 'ok', listing: current };
}
