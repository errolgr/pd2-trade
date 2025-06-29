import { Item as GameStashItem } from "./pd2-website/GameStashResponse";
import { Item as PriceCheckItem } from "@/pages/price-check/lib/interfaces";
import { MarketListingQuery } from "./pd2-website/GetMarketListingsCommand";
import { EventProps } from "./EventPayload";
import { MarketListingResponse } from "./pd2-website/GetMarketListingsResponse";

export interface FindMarketplaceListingsRequest extends EventProps {
    stashItem: GameStashItem;
    price: number;
    note: string;
    type: 'note' | 'negotiable' | 'exact';
}

export interface FindMArketListingResponse extends EventProps {
    result: MarketListingResponse
}

export interface FindMatchingItemsRequest extends EventProps {
    item: PriceCheckItem;
}

export interface FindMatchingItemsResult extends EventProps {
    result?: GameStashItem[]
}

export interface GetMarketPlaceListingsRequest extends EventProps {
    query: MarketListingQuery;
}

export interface FindMarketplaceListingsResult extends EventProps {
    stashItem: GameStashItem;
    price: number;
    note: string;
    type: 'note' | 'negotiable' | 'exact';
}

export interface FindMatchingItemsRequest extends EventProps {
    item: PriceCheckItem;
}

export interface GetMarketPlaceListingsRequest extends EventProps {
    query: MarketListingQuery;
}

export interface ListSpecificItemResult extends EventProps {
    success: boolean;
}

// Payload for updating a market listing (generic patch)
export interface UpdateMarketListingPayload extends EventProps {
  hash: string;
  bumped_at?: string;
  // other patchable fields can be added here
}

// Result payload for updating a market listing
export interface UpdateMarketListingResultPayload extends EventProps {
  success?: boolean;
  error?: string;
}

// Payload for updating a stash item by hash
export interface UpdateStashItemByHashPayload extends EventProps {
  hash: string;
  update: Record<string, any>;
}

// Result payload for updating a stash item by hash
export interface UpdateStashItemByHashResultPayload extends EventProps {
  success?: boolean;
  error?: string;
}

export enum ToastActionType {
  OPEN_MARKET_LISTING = 'OPEN_MARKET_LISTING',
  UPDATE_AVAILABLE = 'UPDATE_AVAILABLE'
}

export interface CustomToastPayload {
    title?: string;
    description?: string;
    action?: {
        label: string;
        type: ToastActionType;
        data?: any; // Additional data needed for the action (e.g., listing ID)
    };
}

export interface GenericToastPayload {
    title?: string;
    description?: string;
    duration?: number;
}
