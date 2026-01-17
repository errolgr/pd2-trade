import { MarketListingQuery } from '@/common/types/pd2-website/GetMarketListingsCommand';
import { MarketSearchFilters } from './types';

export function buildMarketSearchQuery(
  filters: MarketSearchFilters,
  settings: { mode: 'hardcore' | 'softcore'; ladder: 'ladder' | 'non-ladder' },
  limit: number = 20,
  offset: number = 0,
): MarketListingQuery {
  const now = new Date();
  const daysAgo = filters.searchArchived ? 14 : 3;
  const dateThreshold = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

  const query: Partial<MarketListingQuery> = {
    $resolve: { user: { in_game_account: true } },
    type: 'item',
    $limit: limit,
    $skip: offset,
    accepted_offer_id: null,
    updated_at: { $gte: dateThreshold.toISOString() },
    $sort: { bumped_at: -1 },
    is_hardcore: filters.isHardcore ?? settings.mode === 'hardcore',
    is_ladder: filters.isLadder ?? settings.ladder === 'ladder',
  };

  // Text search - regex on item name
  if (filters.searchText.trim()) {
    query['item.name'] = {
      $regex: filters.searchText.trim(),
      $options: 'i', // case insensitive
    };
  }

  // Quality filter
  if (filters.quality) {
    query['item.quality.name'] = filters.quality;
  }

  // Item type (type_code) filter
  if (filters.itemType) {
    try {
      // Handle JSON strings for $in queries (e.g., '{"$in": ["scha", "mcha", "lcha", "torc"]}')
      if (filters.itemType.startsWith('{') || filters.itemType.startsWith('[')) {
        const parsed = JSON.parse(filters.itemType);
        query['item.base.type_code'] = parsed as any;
      } else {
        query['item.base.type_code'] = filters.itemType as any;
      }
    } catch {
      // If parsing fails, use as string
      query['item.base.type_code'] = filters.itemType as any;
    }
  }

  // Base code filter
  if (filters.baseCode && filters.baseCode !== 'Any') {
    query['item.base_code'] = filters.baseCode;
  }

  // Corrupted filter
  if (filters.corrupted === 'true') {
    query['item.corrupted'] = true;
  } else if (filters.corrupted === 'false') {
    query['item.corrupted'] = false;
  }
  // 'both' means no filter

  // Ethereal filter
  if (filters.ethereal === 'true') {
    query['item.is_ethereal'] = true;
  } else if (filters.ethereal === 'false') {
    query['item.is_ethereal'] = false;
  }
  // 'both' means no filter

  // Identified filter
  if (filters.identified === 'true') {
    query['item.is_identified'] = true;
  } else if (filters.identified === 'false') {
    query['item.is_identified'] = false;
  }
  // 'both' means no filter

  // Socket count filter
  if (filters.socketCountMin !== undefined && filters.socketCountMin !== null) {
    query['item.socket_count'] = {
      ...(query['item.socket_count'] || {}),
      $gte: filters.socketCountMin,
    } as any;
  }
  if (filters.socketCountMax !== undefined && filters.socketCountMax !== null) {
    query['item.socket_count'] = {
      ...(query['item.socket_count'] || {}),
      $lte: filters.socketCountMax,
    } as any;
  }

  // Seller account filter
  if (filters.sellerAccount && filters.sellerAccount.trim()) {
    // Note: This would need to query by username, which might require a different approach
    // For now, we'll filter client-side by username
    // If the API supports user_id lookup, we could add that here
  }

  // Note: The following filters need to be done client-side as they may not be directly queryable:
  // - Level (item.level or item.required_level)
  // - Dexterity (item.required_dexterity or in modifiers)
  // - Strength (item.required_strength or in modifiers)
  // - Item Level (item.item_level or item.ilvl)
  // - Price filtering (hr_price)
  // - Sale type filtering
  // We'll filter results after fetching

  return query as MarketListingQuery;
}
