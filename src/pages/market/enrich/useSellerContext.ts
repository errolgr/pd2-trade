import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import {
  presenceLabel,
  shortAgo,
  traderPresence,
  useTraderProfile,
  type TraderPresence,
  type TraderProfile,
} from '@/pages/chat/hooks/useTraderProfile';
import { useNow } from './useNow';

/** Other listings previewed on the seller card. */
export const SELLER_PREVIEW_LIMIT = 6;

export interface SellerContext {
  /** idle: signed out / no seller id; error: their listings could not be loaded. */
  status: TraderProfile['status'];
  username: string | null;
  /** In-game account `/w *account` reaches, when the listing resolved it. */
  inGameAccount: string | null;
  /** Their other live listings (this one excluded), newest bumped first, at most SELLER_PREVIEW_LIMIT. */
  others: MarketListingEntry[];
  /** All their other live listings, also those past the preview. */
  othersTotal: number;
  presence: TraderPresence;
  /** 'In game now' / 'Online 12m ago' / 'Last seen 3d ago' / 'Unknown'. */
  presenceText: string;
  inGame: boolean;
  /** Online on the site or in game within the last hour. */
  online: boolean;
  /** Newest site/in-game stamp (epoch ms), null when unknown. */
  lastOnlineAt: number | null;
  /** Website account creation (epoch ms), null when unknown. */
  accountCreatedAt: number | null;
  /** "2y ago" / "3mo ago" since the account was created, null when unknown. */
  accountAgeText: string | null;
}

/**
 * A listing's seller: their other live listings and presence (the chat trader profile: fetched once per seller
 * via getMarketListings({ user_id }) and cached app-wide, shared with the chat's Trader sidebar), plus the
 * account age from `listing.user.created_at`. The listing's own last-online stamps count toward presence
 * while their listings load.
 */
export function useSellerContext(listing: MarketListingEntry | null | undefined): SellerContext {
  const now = useNow();

  const profile = useTraderProfile(listing?.user_id || undefined, now);

  const listingId = listing?._id;
  const othersAll = profile.listings.filter((l) => l._id !== listingId);
  const includesSelf = othersAll.length !== profile.listings.length;
  const presence = traderPresence(listing ? [listing, ...profile.listings] : profile.listings, now);
  const created = listing?.user?.created_at ? Date.parse(listing.user.created_at) : NaN;
  const accountCreatedAt = Number.isFinite(created) && created > 0 ? created : null;
  return {
    status: profile.status,
    username: listing?.user?.username || null,
    inGameAccount: listing?.user?.in_game_account || null,
    others: othersAll.slice(0, SELLER_PREVIEW_LIMIT),
    othersTotal: Math.max(othersAll.length, profile.total - (includesSelf ? 1 : 0)),
    presence,
    presenceText: presenceLabel(presence, now),
    inGame: presence.kind === 'ingame',
    online: presence.kind === 'ingame' || presence.kind === 'online',
    lastOnlineAt: presence.kind === 'unknown' ? null : presence.at,
    accountCreatedAt,
    accountAgeText: accountCreatedAt === null ? null : shortAgo(accountCreatedAt, now),
  };
}
