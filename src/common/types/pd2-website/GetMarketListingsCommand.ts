export const CommandCode = 424;

export type MarketListingCommand = [
    "find",
    "market/listing",
    MarketListingQuery
  ];
  
  export interface MarketListingQuery {
    $resolve: {
      user: {
        in_game_account: boolean;
      };
    };
    type: "item";
    $limit: number;
    $skip: number;
    accepted_offer_id: null;
    updated_at: {
      $gte: string;             // ISO timestamp
    };
    $sort: {
      bumped_at: -1 | 1;        // sort order
    };
    "item.modifiers"?: {
      $all: Array<{
        $elemMatch: {
          name: string;
          "values.0": {
            $gte: number;
            $lte: number;
          };
        };
      }>;
    };
    is_hardcore: boolean;
    is_ladder: boolean;
    "item.quality.name": string;
    "item.name": {
      $regex: string;
      $options: string;
    };
    "item.is_ethereal": boolean;
    "item.corrupted": boolean;
    "item.is_identified": boolean;
  }
  