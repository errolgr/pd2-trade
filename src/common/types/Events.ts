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
