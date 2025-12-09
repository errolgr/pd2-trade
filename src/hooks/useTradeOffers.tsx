import { useEffect, useState, useCallback } from 'react';
import { usePd2Website } from './pd2website/usePD2Website';
import { useOptions } from './useOptions';
import { TradeMessageData } from '@/components/trade/TradeMessage';
import { fetch as tauriFetch } from '@/lib/browser-http';
import { handleApiResponse } from './pd2website/usePD2Website';
import { ISettings } from './useOptions';
import { AuthData } from '@/common/types/pd2-website/AuthResponse';
import qs from 'qs';

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
}

interface UseTradeOffersReturn {
  incomingOffers: TradeMessageData[];
  outgoingOffers: TradeMessageData[];
  loading: boolean;
  refresh: () => void;
  revokeOffer: (offerId: string) => Promise<void>;
}

function buildUrlWithQuery(base: string, query?: Record<string, any>) {
  if (!query) return base;
  const queryString = axiosStyleSerializer(query);
  return queryString ? `${base}?${queryString}` : base;
}

function axiosStyleSerializer(obj) {
  return qs
    .stringify(obj, 
      { 
        arrayFormat:      'indices',  // foo[]=1&foo[]=2
        encodeValuesOnly: true         // keys like [$in] stay literal}
      }
    )
}

// Get incoming offers (listings with offers)
const getIncomingOffers = async (settings: ISettings, authData: AuthData): Promise<TradeMessageData[]> => {
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
      'Authorization': `Bearer ${settings.pd2Token}`,
    },
  });

  const result = await handleApiResponse(response);
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
          });
        }
      });
    }
  });

  return offers;
};

// Get outgoing offers (offers made by user)
const getOutgoingOffers = async (settings: ISettings, authData: AuthData): Promise<TradeMessageData[]> => {
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
      'Authorization': `Bearer ${settings.pd2Token}`,
    },
  });

  const result = await handleApiResponse(response);
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
const revokeOffer = async (settings: ISettings, offerId: string): Promise<void> => {
  const response = await tauriFetch(`https://api.projectdiablo2.com/market/offer/${offerId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${settings.pd2Token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ rejected: true }),
  });
  await handleApiResponse(response);
};

export const useTradeOffers = (): UseTradeOffersReturn => {
  const { settings } = useOptions();
  const { authData } = usePd2Website();
  const [incomingOffers, setIncomingOffers] = useState<TradeMessageData[]>([]);
  const [outgoingOffers, setOutgoingOffers] = useState<TradeMessageData[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchIncomingOffers = useCallback(async () => {
    if (!authData?.user?._id || !settings?.pd2Token) {
      return;
    }

    setLoading(true);
    try {
      const offers = await getIncomingOffers(settings, authData);
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
      const offers = await getOutgoingOffers(settings, authData);
      setOutgoingOffers(offers);
    } catch (error) {
      console.error('Failed to fetch outgoing offers:', error);
      setOutgoingOffers([]);
    } finally {
      setLoading(false);
    }
  }, [authData, settings]);

  useEffect(() => {
    if (authData?.user?._id && settings?.pd2Token) {
      fetchIncomingOffers();
      fetchOutgoingOffers();
    }
  }, [authData?.user?._id, settings?.pd2Token, fetchIncomingOffers, fetchOutgoingOffers]);

  const handleRevokeOffer = useCallback(async (offerId: string) => {
    if (!settings?.pd2Token) {
      return;
    }

    try {
      await revokeOffer(settings, offerId);
      // Refresh offers after revoking
      await fetchOutgoingOffers();
    } catch (error) {
      console.error('Failed to revoke offer:', error);
      throw error;
    }
  }, [settings, fetchOutgoingOffers]);

  return {
    incomingOffers,
    outgoingOffers,
    loading,
    refresh: () => {
      fetchIncomingOffers();
      fetchOutgoingOffers();
    },
    revokeOffer: handleRevokeOffer,
  };
};

