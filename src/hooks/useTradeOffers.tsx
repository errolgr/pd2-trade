import { useEffect, useState, useCallback } from 'react';
import { TradeMessageData } from '@/components/trade/TradeMessage';
import { fetch as tauriFetch } from '@/lib/browser-http';
import { handleApiResponse } from './pd2website/usePD2Website';
import { ISettings } from './useOptions';
import { AuthData } from '@/common/types/pd2-website/AuthResponse';
import { listen } from '@/lib/browser-events';
import { emit } from '@/lib/browser-events';
import qs from 'qs';
import {
  getDeletedOffers,
  markOfferAsDeleted,
  purgeOldDeletedOffers,
  unmarkOfferAsDeleted,
} from '@/lib/deleted-offers-storage';

interface WebsiteOffer {
  _id: string;
  listing_id?: string;
  offer: string;
  hr_offer?: number;
  user_id: string;
  created_at: string;
  updated_at: string;
  rejected?: boolean;
  user?: {
    _id: string;
    username: string;
    game?: {
      accounts?: string[];
    };
  };
  listing?: {
    _id: string;
    item?: {
      name?: string;
    };
    price?: string;
    hr_price?: number;
    user?: {
      _id: string;
      username: string;
      game?: {
        accounts?: string[];
      };
    };
  };
  listing_archive?: {
    _id: string;
    item?: {
      name?: string;
    };
    price?: string;
    hr_price?: number;
    user?: {
      _id: string;
      username: string;
      game?: {
        accounts?: string[];
      };
    };
  };
}

interface IncomingListing {
  _id: string;
  user_id: string;
  accepted_offer_id?: string | null;
  item?: {
    name?: string;
  };
  price?: string;
  hr_price?: number;
  offers?: WebsiteOffer[];
  user?: {
    _id: string;
    username: string;
    game?: {
      accounts?: string[];
    };
  };
}

interface UseTradeOffersProps {
  settings: ISettings;
  authData: AuthData | null;
  onAuthError?: () => void | Promise<void>;
  isConnected?: boolean;
}

interface UseTradeOffersReturn {
  incomingOffers: TradeMessageData[];
  outgoingOffers: TradeMessageData[];
  hiddenOutgoingOffers: TradeMessageData[];
  loading: boolean;
  refresh: () => void;
  revokeOffer: (offerId: string) => Promise<void>;
  acceptOffer: (listingId: string, offerId: string) => Promise<void>;
  rejectOffer: (offerId: string) => Promise<void>;
  unacceptOffer: (listingId: string) => Promise<void>;
  deleteOutgoingOffer: (offerId: string) => void;
  restoreOutgoingOffer: (offerId: string) => void;
}

function buildUrlWithQuery(base: string, query?: Record<string, any>) {
  if (!query) return base;
  const queryString = axiosStyleSerializer(query);
  return queryString ? `${base}?${queryString}` : base;
}

function axiosStyleSerializer(obj) {
  return qs.stringify(obj, {
    arrayFormat: 'indices', // foo[]=1&foo[]=2
    encodeValuesOnly: true, // keys like [$in] stay literal}
  });
}

// Get incoming offers (listings with offers)
const getIncomingOffers = async (
  settings: ISettings,
  authData: AuthData,
  onAuthError?: () => void | Promise<void>,
): Promise<TradeMessageData[]> => {
  const query = {
    $resolve: {
      user: {
        in_game_account: true,
      },
      offers: {
        user: true,
      },
    },
    user_id: authData.user._id,
    $limit: 250,
    $sort: {
      bumped_at: -1,
    },
  };

  const url = buildUrlWithQuery('https://api.projectdiablo2.com/market/listing', query);
  const response = await tauriFetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${settings.pd2Token}`,
    },
  });

  const result = await handleApiResponse(response, onAuthError);
  const listings: IncomingListing[] = result?.data || [];

  // Convert listings with offers to TradeMessageData
  const offers: TradeMessageData[] = [];
  listings.forEach((listing) => {
    if (listing.offers && listing.offers.length > 0) {
      listing.offers.forEach((offer) => {
        if (!offer.rejected) {
          offers.push({
            id: offer._id,
            isIncoming: true,
            playerName: offer.user?.username || 'Unknown',
            accountName: offer.user?.game?.accounts?.[0],
            characterName: offer.user?.game?.accounts?.[0],
            message: `Offer: ${offer.offer || offer.hr_offer || 'N/A'}`,
            itemName: listing.item?.name,
            price: offer.offer || (offer.hr_offer ? `${offer.hr_offer} HR` : undefined),
            timestamp: new Date(offer.created_at),
            history: [],
            listingId: listing._id,
            userId: offer.user?._id,
            acceptedOfferId: listing.accepted_offer_id || undefined,
          });
        }
      });
    }
  });

  return offers;
};

// Get outgoing offers (offers made by user)
const getOutgoingOffers = async (
  settings: ISettings,
  authData: AuthData,
  onAuthError?: () => void | Promise<void>,
): Promise<TradeMessageData[]> => {
  const query = {
    $resolve: {
      listing: true,
      listing_archive: {
        user: true,
      },
    },
    user_id: authData.user._id,
    $limit: 10,
    $skip: 0,
    $sort: {
      updated_at: -1,
    },
  };

  const url = buildUrlWithQuery('https://api.projectdiablo2.com/market/offer', query);
  const response = await tauriFetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${settings.pd2Token}`,
    },
  });

  const result = await handleApiResponse(response, onAuthError);
  const offers: WebsiteOffer[] = result?.data || [];

  // Convert offers to TradeMessageData
  const tradeOffers: TradeMessageData[] = offers.map((offer) => {
    const listing = offer.listing || offer.listing_archive;
    return {
      id: offer._id,
      isIncoming: false,
      playerName: listing?.user?.username || 'Unknown',
      accountName: listing?.user?.game?.accounts?.[0],
      characterName: listing?.user?.game?.accounts?.[0],
      message: `Offer: ${offer.offer || offer.hr_offer || 'N/A'}`,
      itemName: listing?.item?.name,
      price: offer.offer || (offer.hr_offer ? `${offer.hr_offer} HR` : undefined),
      timestamp: new Date(offer.created_at),
      history: [],
      listingId: listing?._id,
      userId: listing?.user?._id,
    };
  });

  return tradeOffers;
};

// Revoke an offer (PATCH market/offer/:offerId)
const revokeOffer = async (
  settings: ISettings,
  offerId: string,
  onAuthError?: () => void | Promise<void>,
): Promise<void> => {
  const response = await tauriFetch(`https://api.projectdiablo2.com/market/offer/${offerId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${settings.pd2Token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ rejected: true }),
  });
  await handleApiResponse(response, onAuthError);
};

// Accept an offer (PUT market/listing/:listingId)
const acceptOffer = async (
  settings: ISettings,
  listingId: string,
  offerId: string,
  onAuthError?: () => void | Promise<void>,
): Promise<void> => {
  const response = await tauriFetch(`https://api.projectdiablo2.com/market/listing/${listingId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${settings.pd2Token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ accepted_offer_id: offerId }),
  });
  await handleApiResponse(response, onAuthError);
};

// Reject an offer (PUT market/offer/:offerId)
const rejectOffer = async (
  settings: ISettings,
  offerId: string,
  onAuthError?: () => void | Promise<void>,
): Promise<void> => {
  const response = await tauriFetch(`https://api.projectdiablo2.com/market/offer/${offerId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${settings.pd2Token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ rejected: true }),
  });
  await handleApiResponse(response, onAuthError);
};

// Unaccept an offer (PATCH market/listing/:listingId)
const unacceptOffer = async (
  settings: ISettings,
  listingId: string,
  onAuthError?: () => void | Promise<void>,
): Promise<void> => {
  const response = await tauriFetch(`https://api.projectdiablo2.com/market/listing/${listingId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${settings.pd2Token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ accepted_offer_id: null }),
  });
  await handleApiResponse(response, onAuthError);
};

export const useTradeOffers = ({
  settings,
  authData,
  onAuthError,
  isConnected = false,
}: UseTradeOffersProps): UseTradeOffersReturn => {
  const [incomingOffers, setIncomingOffers] = useState<TradeMessageData[]>([]);
  const [outgoingOffers, setOutgoingOffers] = useState<TradeMessageData[]>([]);
  const [hiddenOutgoingOffers, setHiddenOutgoingOffers] = useState<TradeMessageData[]>([]);
  const [loading, setLoading] = useState(false);

  // Purge old deleted offers on mount
  useEffect(() => {
    purgeOldDeletedOffers();
  }, []);

  const fetchIncomingOffers = useCallback(async () => {
    if (!authData?.user?._id || !settings?.pd2Token) {
      return;
    }

    setLoading(true);
    try {
      const offers = await getIncomingOffers(settings, authData, onAuthError);
      setIncomingOffers(offers);
    } catch (error) {
      console.error('Failed to fetch incoming offers:', error);
      setIncomingOffers([]);
    } finally {
      setLoading(false);
    }
  }, [authData, settings]);

  const fetchOutgoingOffers = useCallback(async () => {
    if (!authData?.user?._id || !settings?.pd2Token) {
      return;
    }

    setLoading(true);
    try {
      const offers = await getOutgoingOffers(settings, authData, onAuthError);
      // Get deleted offer IDs from localStorage
      const deletedOfferIds = getDeletedOffers();

      // Only show hidden offers if they still exist in the API response
      // This ensures we don't show offers that have been removed from the website
      const filteredOffers = offers.filter((offer) => !deletedOfferIds.has(offer.id));
      const hiddenOffers = offers.filter((offer) => deletedOfferIds.has(offer.id));

      setOutgoingOffers(filteredOffers);
      setHiddenOutgoingOffers(hiddenOffers);

      // Clean up: Remove deleted offer IDs from localStorage if they're no longer in the API response
      // This happens when offers are removed from the website (after 7 days or manually)
      const offerIdsFromApi = new Set(offers.map((offer) => offer.id));
      const deletedIdsToRemove = Array.from(deletedOfferIds).filter((id) => !offerIdsFromApi.has(id));
      deletedIdsToRemove.forEach((id) => unmarkOfferAsDeleted(id));
    } catch (error) {
      console.error('Failed to fetch outgoing offers:', error);
      setOutgoingOffers([]);
      setHiddenOutgoingOffers([]);
    } finally {
      setLoading(false);
    }
  }, [authData, settings, onAuthError]);

  useEffect(() => {
    if (authData?.user?._id && settings?.pd2Token) {
      fetchIncomingOffers();
      fetchOutgoingOffers();
    }
  }, [authData?.user?._id, settings?.pd2Token, fetchIncomingOffers, fetchOutgoingOffers]);

  // Listen for refresh-offers event (emitted by useSocketNotifications)
  useEffect(() => {
    if (!authData?.user?._id || !settings?.pd2Token) {
      return;
    }

    let unlisten: (() => void) | null = null;

    const setupListener = async () => {
      try {
        unlisten = await listen('refresh-offers', async () => {
          // Refresh both incoming and outgoing offers when notified
          fetchIncomingOffers();
          fetchOutgoingOffers();
        });
      } catch (error) {
        console.error('Failed to set up refresh-offers listener:', error);
      }
    };

    setupListener();

    return () => {
      if (unlisten) {
        unlisten();
        unlisten = null;
      }
    };
  }, [authData?.user?._id, settings?.pd2Token, fetchIncomingOffers, fetchOutgoingOffers]);

  const handleRevokeOffer = useCallback(
    async (offerId: string) => {
      if (!settings?.pd2Token) {
        return;
      }

      try {
        // Find the offer to get details for toast
        const offer = outgoingOffers.find((o) => o.id === offerId);

        // Optimistically remove the offer from the state immediately
        setOutgoingOffers((prev) => prev.filter((o) => o.id !== offerId));

        await revokeOffer(settings, offerId, onAuthError);

        // Show success toast
        await emit('toast-event', {
          title: 'Offer Revoked',
          description: offer ? `Your offer on ${offer.itemName || 'item'} has been revoked` : 'Offer has been revoked',
          variant: 'success',
        });

        // Emit event to refresh offers (handled by the listener)
        await emit('refresh-offers');
      } catch (error) {
        console.error('Failed to revoke offer:', error);
        // Revert optimistic update on error by emitting refresh event
        await emit('refresh-offers');
        // Show error toast
        await emit('toast-event', {
          title: 'Failed to Revoke Offer',
          description: 'An error occurred while revoking the offer',
          variant: 'error',
        });
        throw error;
      }
    },
    [settings, outgoingOffers, onAuthError],
  );

  const handleAcceptOffer = useCallback(
    async (listingId: string, offerId: string) => {
      if (!settings?.pd2Token) {
        return;
      }

      try {
        // Find the offer to get details for toast
        const offer = incomingOffers.find((o) => o.id === offerId && o.listingId === listingId);
        await acceptOffer(settings, listingId, offerId, onAuthError);

        // Show success toast
        await emit('toast-event', {
          title: 'Offer Accepted',
          description: offer
            ? `You accepted ${offer.playerName}'s offer on ${offer.itemName || 'item'}`
            : 'Offer has been accepted',
          variant: 'success',
        });

        // Emit event to refresh offers (handled by the listener)
        await emit('refresh-offers');
      } catch (error) {
        console.error('Failed to accept offer:', error);
        // Show error toast
        await emit('toast-event', {
          title: 'Failed to Accept Offer',
          description: 'An error occurred while accepting the offer',
          variant: 'error',
        });
        throw error;
      }
    },
    [settings, incomingOffers, onAuthError],
  );

  const handleRejectOffer = useCallback(
    async (offerId: string) => {
      if (!settings?.pd2Token) {
        return;
      }

      try {
        // Find the offer to get details for toast
        const offer = incomingOffers.find((o) => o.id === offerId);

        // Optimistically remove the offer from the state immediately
        setIncomingOffers((prev) => prev.filter((o) => o.id !== offerId));

        await rejectOffer(settings, offerId, onAuthError);

        // Show success toast
        await emit('toast-event', {
          title: 'Offer Rejected',
          description: offer
            ? `You rejected ${offer.playerName}'s offer on ${offer.itemName || 'item'}`
            : 'Offer has been rejected',
          variant: 'success',
        });

        // Emit event to refresh offers (handled by the listener)
        await emit('refresh-offers');
      } catch (error) {
        console.error('Failed to reject offer:', error);
        // Revert optimistic update on error by emitting refresh event
        await emit('refresh-offers');
        // Show error toast
        await emit('toast-event', {
          title: 'Failed to Reject Offer',
          description: 'An error occurred while rejecting the offer',
          variant: 'error',
        });
        throw error;
      }
    },
    [settings, incomingOffers, onAuthError],
  );

  const handleUnacceptOffer = useCallback(
    async (listingId: string) => {
      if (!settings?.pd2Token) {
        return;
      }

      try {
        // Find the accepted offer to get details for toast
        const offer = incomingOffers.find((o) => o.listingId === listingId && o.acceptedOfferId === o.id);
        await unacceptOffer(settings, listingId, onAuthError);

        // Show success toast
        await emit('toast-event', {
          title: 'Offer Unaccepted',
          description: offer
            ? `You unaccepted ${offer.playerName}'s offer on ${offer.itemName || 'item'}`
            : 'Offer has been unaccepted',
          variant: 'success',
        });

        // Emit event to refresh offers (handled by the listener)
        await emit('refresh-offers');
      } catch (error) {
        console.error('Failed to unaccept offer:', error);
        // Show error toast
        await emit('toast-event', {
          title: 'Failed to Unaccept Offer',
          description: 'An error occurred while unaccepting the offer',
          variant: 'error',
        });
        throw error;
      }
    },
    [settings, incomingOffers, onAuthError],
  );

  const handleDeleteOutgoingOffer = useCallback(
    (offerId: string) => {
      // Find the offer to get details for toast
      const offer = outgoingOffers.find((o) => o.id === offerId);

      // Mark as deleted in localStorage
      markOfferAsDeleted(offerId);

      // Move from visible to hidden
      if (offer) {
        setOutgoingOffers((prev) => prev.filter((o) => o.id !== offerId));
        setHiddenOutgoingOffers((prev) => [...prev, offer]);
      }

      // Show success toast
      emit('toast-event', {
        title: 'Offer Hidden',
        description: offer
          ? `Your offer on ${offer.itemName || 'item'} has been hidden. It will be removed after 7 days.`
          : 'Offer has been hidden',
        variant: 'success',
      }).catch((err) => {
        console.error('Failed to emit toast event:', err);
      });
    },
    [outgoingOffers],
  );

  const handleRestoreOutgoingOffer = useCallback(
    (offerId: string) => {
      // Find the offer in hidden offers
      const offer = hiddenOutgoingOffers.find((o) => o.id === offerId);

      // Unmark as deleted in localStorage
      unmarkOfferAsDeleted(offerId);

      // Move from hidden to visible
      if (offer) {
        setHiddenOutgoingOffers((prev) => prev.filter((o) => o.id !== offerId));
        setOutgoingOffers((prev) => [...prev, offer]);
      }

      // Show success toast
      emit('toast-event', {
        title: 'Offer Restored',
        description: offer ? `Your offer on ${offer.itemName || 'item'} has been restored` : 'Offer has been restored',
        variant: 'success',
      }).catch((err) => {
        console.error('Failed to emit toast event:', err);
      });
    },
    [hiddenOutgoingOffers],
  );

  // Emit offer count updates whenever offers change
  useEffect(() => {
    const totalCount = incomingOffers.length + outgoingOffers.length;
    emit('trade-offers-count-updated', {
      incomingCount: incomingOffers.length,
      outgoingCount: outgoingOffers.length,
      totalCount,
    }).catch((err) => {
      console.error('[useTradeOffers] Failed to emit trade-offers-count-updated:', err);
    });
  }, [incomingOffers.length, outgoingOffers.length]);

  return {
    incomingOffers,
    outgoingOffers,
    hiddenOutgoingOffers,
    loading,
    refresh: () => {
      fetchIncomingOffers();
      fetchOutgoingOffers();
    },
    revokeOffer: handleRevokeOffer,
    acceptOffer: handleAcceptOffer,
    rejectOffer: handleRejectOffer,
    unacceptOffer: handleUnacceptOffer,
    deleteOutgoingOffer: handleDeleteOutgoingOffer,
    restoreOutgoingOffer: handleRestoreOutgoingOffer,
  };
};
