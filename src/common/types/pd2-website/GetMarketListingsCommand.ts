export const CommandCode = 424;

export type MarketListingCommand = ['find', 'market/listing', MarketListingQuery];

/**
 * What the listing endpoints accept: the typed query the price check/quick list build, or any feathers query
 * (the market browser builds its own from MarketFilters).
 */
export type MarketListingFindQuery = MarketListingQuery | Record<string, unknown>;

export interface MarketListingQuery {
  $resolve: {
    user: {
      in_game_account: boolean;
    };
  };
  'item.hash'?: any;
  _id?: any;
  user_id?: string;
  type: 'item';
  $limit: number;
  $skip: number;
  accepted_offer_id: null;
  updated_at: {
    $gte: string; // ISO timestamp
  };
  /** One sort key: newest / oldest bump, or HR price. */
  $sort: { bumped_at: -1 | 1 } | { hr_price: -1 | 1 };
  /** Only priced listings (an ascending price sort would rank the unpriced, HR 0, first). */
  hr_price?: { $gt: number };
  'item.modifiers'?: {
    $all: Array<{
      $elemMatch: {
        name: string;
        'values.0': {
          $gte: number;
          $lte: number;
        };
      };
    }>;
  };
  is_hardcore: boolean;
  is_ladder: boolean;
  'item.quality.name': string | { $in: string[] };
  'item.name': {
    $regex: string;
    $options: string;
  };
  'item.is_ethereal': boolean;
  'item.corrupted': boolean;
  'item.is_identified': boolean;
  'item.corruptions'?: {
    $all: string[];
  };
}
