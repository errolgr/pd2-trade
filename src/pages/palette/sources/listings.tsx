import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUp, MessagesSquare, Pencil, Store, Trash2 } from 'lucide-react';
import { itemQualityClass } from '@pd2-trader/ui';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { useOptions } from '@/hooks/useOptions';
import type { TradeOffer } from '@/hooks/useTradeOffers';
import { t } from '@/i18n';
import { reportApiError } from '@/lib/error-reporting';
import { ListingThumb } from '@/pages/chat/components/ListingCard';
import { offerStatus } from '@/pages/chat/components/ThreadDeals';
import { offerThreadId } from '@/pages/chat/lib/offers-seen';
import { useNow } from '@/pages/market/enrich/useNow';
import { itemDisplayName } from '@/pages/market/lib/listing';
import { canBump } from '@/pages/quick-list/listings/my-listings';
import {
  bumpListing,
  deleteListing,
  getMyListings,
  listingsRealm,
  loadMyListings,
  useMyListings,
  type ListingActionsApi,
} from '@/pages/quick-list/listings/my-listings-store';
import { baseName, PriceText } from '@/pages/quick-list/listings/ListingPieces';
import { bestTier } from '../lib/match';
import type { PaletteItem, PaletteRef, PaletteRunContext, PaletteSource } from '../lib/types';

const ICON = 'h-4 w-4';

export type ListingsEntry = { kind: 'offer'; offer: TradeOffer } | { kind: 'listing'; listing: MarketListingEntry };

/** Offers waiting for your answer: made on your listings, not accepted, declined or closed. */
export const pendingOffers = (offers: readonly TradeOffer[]) =>
  offers.filter((offer) => offer.isIncoming && offerStatus(offer) === 'open');

/** Pending offers (newest first), then listings (as stored): the group's order when nothing decides otherwise. */
function allEntries(listings: readonly MarketListingEntry[], offers: readonly TradeOffer[]): ListingsEntry[] {
  return [
    ...[...offers]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .map((offer): ListingsEntry => ({ kind: 'offer', offer })),
    ...listings.map((listing): ListingsEntry => ({ kind: 'listing', listing })),
  ];
}

/**
 * Listings by item name (and base), offers by item and trader name: best tier (prefix > word start > contains)
 * first, then offers before listings, newest offer first.
 */
export function rankListings(
  listings: readonly MarketListingEntry[],
  offers: readonly TradeOffer[],
  query: string,
  limit: number,
): ListingsEntry[] {
  return allEntries(listings, offers)
    .map((entry, order) => {
      const texts =
        entry.kind === 'listing'
          ? [itemDisplayName(entry.listing.item), entry.listing.item.name, entry.listing.item.base?.name ?? '']
          : [entry.offer.itemName ?? '', entry.offer.playerName, entry.offer.accountName ?? ''];
      return { entry, order, tier: bestTier(texts, query) };
    })
    .filter((r) => r.tier > 0)
    .sort((a, b) => b.tier - a.tier || a.order - b.order)
    .slice(0, limit)
    .map((r) => r.entry);
}

export function listingsRef(entry: ListingsEntry): PaletteRef {
  return entry.kind === 'listing'
    ? {
        id: `listings:listing:${entry.listing._id}`,
        group: 'listings',
        title: itemDisplayName(entry.listing.item),
        data: { listingId: entry.listing._id },
      }
    : {
        id: `listings:offer:${entry.offer.id}`,
        group: 'listings',
        title: t('chat:deals.offerFrom', { name: entry.offer.playerName }),
        data: { offerId: entry.offer.id },
      };
}

/** The listings and offers `refs` point at, in their order; refs to sold, delisted or answered ones drop out. */
export function resolveListingsRefs(
  listings: readonly MarketListingEntry[],
  offers: readonly TradeOffer[],
  refs: readonly PaletteRef[],
): ListingsEntry[] {
  return refs.flatMap((ref): ListingsEntry[] => {
    const { listingId, offerId } = ref.data ?? {};
    const listing = typeof listingId === 'string' ? listings.find((l) => l._id === listingId) : undefined;
    if (listing) return [{ kind: 'listing', listing }];
    const offer = typeof offerId === 'string' ? offers.find((o) => o.id === offerId) : undefined;
    return offer ? [{ kind: 'offer', offer }] : [];
  });
}

/** The quick list's Manage tab on this listing (`edit`: with its price editor open). */
const showListing = (ctx: PaletteRunContext, listingId: string, edit?: boolean) =>
  ctx.openPanel('quickList', edit ? { listingId, edit } : { listingId }, { placement: 'gameCenter' });

function toItem(
  entry: ListingsEntry,
  { api, listings, now }: { api: ListingActionsApi; listings: readonly MarketListingEntry[]; now: number },
): PaletteItem {
  const ref = listingsRef(entry);
  if (entry.kind === 'offer') {
    const { offer } = entry;
    const listed = offer.listingId ? listings.find((l) => l._id === offer.listingId) : undefined;
    return {
      ref,
      subtitle: offer.itemName,
      icon: <ArrowDownLeft className={`${ICON} text-warning`} />,
      trailing: offer.price && <span className="font-semibold text-foreground tabular-nums">{offer.price}</span>,
      // Like the offers feed: the offer's thread (by any id it is known by)
      primary: {
        id: 'openOffer',
        label: t('quickList:palette.openOffer'),
        icon: <MessagesSquare className={ICON} />,
        run: (ctx) => ctx.openPanel('chat', { threadId: offerThreadId(offer) }, { focus: true }),
      },
      actions: listed
        ? [
            {
              id: 'showListing',
              label: t('quickList:palette.showListing'),
              icon: <Store className={ICON} />,
              run: (ctx) => showListing(ctx, listed._id),
            },
          ]
        : undefined,
    };
  }

  const { listing } = entry;
  return {
    ref,
    titleClassName: itemQualityClass(listing.item.quality?.name, {
      runeword: listing.item.is_runeword,
      name: listing.item.name,
    }),
    subtitle: baseName(listing) ?? undefined,
    icon: <ListingThumb listing={listing}
      className="size-5 rounded-sm"
      artClassName="max-h-4.5 max-w-4.5" />,
    trailing: <PriceText listing={listing} />,
    primary: {
      id: 'showListing',
      label: t('quickList:palette.showListing'),
      icon: <Store className={ICON} />,
      run: (ctx) => showListing(ctx, listing._id),
    },
    // The Manage tab's buttons: Bump (off cooldown only), Edit price (its editor, opened there), Remove
    actions: [
      ...(canBump(listing, now)
        ? [
            {
              id: 'bump',
              label: t('quickList:listing.bumpToTop'),
              icon: <ArrowUp className={ICON} />,
              run: async () => {
                await bumpListing(api, listing, 'palette');
              },
            },
          ]
        : []),
      {
        id: 'editPrice',
        label: t('quickList:listing.editPrice'),
        icon: <Pencil className={ICON} />,
        run: (ctx) => showListing(ctx, listing._id, true),
      },
      {
        id: 'remove',
        label: t('quickList:listing.removeListing'),
        icon: <Trash2 className={ICON} />,
        run: async () => {
          await deleteListing(api, listing);
        },
      },
    ],
  };
}

/**
 * Your market listings (the Manage tab's, shared through my-listings-store; fetched once per opening only when
 * none are loaded for this realm) and the offers waiting on them. Scoped with nothing typed: all of them.
 */
export const useListingsSource: PaletteSource = ({ query, scope, limit, refs }) => {
  const { authData, getMarketListings, updateMarketListing, updateItemByHash, deleteMarketListing, incomingOffers } =
    usePd2Website();
  const { settings } = useOptions();
  // Like the chat panel: a PD2 token
  const signedIn = !!authData?.accessToken;
  const userId = authData?.user?._id;
  const hardcore = settings?.mode === 'hardcore';
  const ladder = settings?.ladder === 'ladder';
  const realm = userId ? listingsRealm(userId, hardcore, ladder) : null;
  const stored = useMyListings();
  const listings = realm && stored.realm === realm ? stored.listings : null;

  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!signedIn || !userId || getMyListings().realm === realm) return;
    let live = true;
    setLoading(true);
    loadMyListings(getMarketListings, userId, hardcore, ladder)
      .catch((err: unknown) =>
        reportApiError(err instanceof Error ? err : new Error(String(err)), 'pd2-website', '/market/listing', undefined, {
          source: 'palette',
        }),
      )
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [signedIn, userId, hardcore, ladder, realm, getMarketListings]);

  const offers = useMemo(() => pendingOffers(incomingOffers ?? []), [incomingOffers]);
  const api = useMemo<ListingActionsApi>(
    () => ({ updateMarketListing, updateItemByHash, deleteMarketListing }),
    [updateMarketListing, updateItemByHash, deleteMarketListing],
  );

  // Ticking clock read in render (react-hooks/purity), so bump eligibility and ages stay fresh.
  const now = useNow();

  return useMemo(() => {
    if (!signedIn) return { items: [], loading: false, signedOut: true };
    if (limit === 0) return { items: [], loading };
    const mine = listings ?? [];
    const entries = query
      ? rankListings(mine, offers, query, limit)
      : scope
        ? allEntries(mine, offers).slice(0, limit)
        : resolveListingsRefs(mine, offers, refs);
    const context = { api, listings: mine, now };
    return { items: entries.map((entry) => toItem(entry, context)), loading };
  }, [signedIn, limit, loading, listings, offers, query, scope, refs, api, now]);
};
