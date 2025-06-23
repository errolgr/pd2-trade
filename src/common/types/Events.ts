import { Item as GameStashItem } from "./pd2-website/GameStashResponse";
import { Item as PriceCheckItem } from "@/pages/price-check/lib/interfaces";
import { MarketListingQuery } from "./pd2-website/GetMarketListingsCommand";
import { EventProps } from "./EventPayload";

export interface FindMarketplaceListingsRequest extends EventProps {
    stashItem: GameStashItem;
    price: number;
    note: string;
    type: 'note' | 'negotiable' | 'exact';
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

