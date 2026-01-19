import { MarketListingQuery } from '@/common/types/pd2-website/GetMarketListingsCommand';
import { MarketSearchFilters } from './types';
import { getFilteredAndMergedModifiers, MERGED_MODIFIERS } from './modifier-utils';

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

  // Price filtering (hr_price) - build constraints first
  const hrPriceConstraints: any = {};
  if (filters.minPrice !== undefined && filters.minPrice !== null) {
    hrPriceConstraints.$gte = filters.minPrice;
  }
  if (filters.maxPrice !== undefined && filters.maxPrice !== null) {
    hrPriceConstraints.$lte = filters.maxPrice;
  }

  // Level filtering (item.requirements.level)
  if (filters.levelMin !== undefined && filters.levelMin !== null) {
    query['item.requirements.level'] = {
      ...(query['item.requirements.level'] || {}),
      $gte: filters.levelMin,
    } as any;
  }
  if (filters.levelMax !== undefined && filters.levelMax !== null) {
    query['item.requirements.level'] = {
      ...(query['item.requirements.level'] || {}),
      $lte: filters.levelMax,
    } as any;
  }

  // Dexterity filtering (item.requirements.dexterity)
  if (filters.dexterityMin !== undefined && filters.dexterityMin !== null) {
    query['item.requirements.dexterity'] = {
      ...(query['item.requirements.dexterity'] || {}),
      $gte: filters.dexterityMin,
    } as any;
  }
  if (filters.dexterityMax !== undefined && filters.dexterityMax !== null) {
    query['item.requirements.dexterity'] = {
      ...(query['item.requirements.dexterity'] || {}),
      $lte: filters.dexterityMax,
    } as any;
  }

  // Strength filtering (item.requirements.strength)
  if (filters.strengthMin !== undefined && filters.strengthMin !== null) {
    query['item.requirements.strength'] = {
      ...(query['item.requirements.strength'] || {}),
      $gte: filters.strengthMin,
    } as any;
  }
  if (filters.strengthMax !== undefined && filters.strengthMax !== null) {
    query['item.requirements.strength'] = {
      ...(query['item.requirements.strength'] || {}),
      $lte: filters.strengthMax,
    } as any;
  }

  // Item level filtering (item.item_level)
  if (filters.itemLevelMin !== undefined && filters.itemLevelMin !== null) {
    query['item.item_level'] = {
      ...(query['item.item_level'] || {}),
      $gte: filters.itemLevelMin,
    } as any;
  }
  if (filters.itemLevelMax !== undefined && filters.itemLevelMax !== null) {
    query['item.item_level'] = {
      ...(query['item.item_level'] || {}),
      $lte: filters.itemLevelMax,
    } as any;
  }

  // Seller account filter
  if (filters.sellerAccount && filters.sellerAccount.trim()) {
    // Try to match by username or in_game_account
    query['user.username'] = {
      $regex: filters.sellerAccount.trim(),
      $options: 'i',
    } as any;
  }

  // Sale type filtering - apply after price constraints
  if (filters.saleType && filters.saleType !== 'any') {
    switch (filters.saleType) {
      case 'hr_only':
        // Has hr_price and price string matches hr_price or no price string
        hrPriceConstraints.$exists = true;
        hrPriceConstraints.$gt = 0;
        // Note: Price string matching might need to be done client-side or via complex query
        break;
      case 'price_with_note':
        // Has hr_price and price string that doesn't match hr_price
        hrPriceConstraints.$exists = true;
        hrPriceConstraints.$gt = 0;
        query['price'] = {
          $exists: true,
          $ne: null,
          $regex: '.+', // Non-empty string
        } as any;
        break;
      case 'no_listed_price':
        // No hr_price or hr_price is 0/null - this conflicts with price filters, so skip if price filters exist
        if (Object.keys(hrPriceConstraints).length === 0) {
          query['$or'] = [{ hr_price: { $exists: false } }, { hr_price: null }, { hr_price: 0 }] as any;
        }
        break;
    }
  }

  // Apply hr_price constraints if any
  if (Object.keys(hrPriceConstraints).length > 0) {
    query['hr_price'] = hrPriceConstraints as any;
  }

  // Modifier filters
  if (filters.modifiers && filters.modifiers.length > 0) {
    // Check if we have any merged modifiers (which need special handling)
    const hasMergedModifiers = filters.modifiers.some((filterMod) => {
      const mergedModifier = MERGED_MODIFIERS.find((m) => m.name === filterMod.name);
      return mergedModifier && mergedModifier.originalNames.length > 1;
    });

    if (hasMergedModifiers && filters.modifiers.length === 1) {
      // Single merged modifier - use $elemMatch directly (without $all) - this works!
      const filterMod = filters.modifiers[0];
      const valuesConstraint: any = {};
      if (filterMod.min !== undefined && filterMod.min !== null) {
        valuesConstraint.$gte = Number(filterMod.min);
      }
      if (filterMod.max !== undefined && filterMod.max !== null) {
        valuesConstraint.$lte = Number(filterMod.max);
      }

      const mergedModifier = MERGED_MODIFIERS.find((m) => m.name === filterMod.name);
      if (mergedModifier && mergedModifier.originalNames.length > 1) {
        const orConditions = mergedModifier.originalNames.map((originalName) => ({
          name: originalName,
        }));

        const elemMatch: any = {
          $or: orConditions,
        };

        if (Object.keys(valuesConstraint).length > 0) {
          elemMatch['values.0'] = valuesConstraint;
        }

        query['item.modifiers'] = { $elemMatch: elemMatch } as any;
      }
    } else {
      // Multiple modifiers or non-merged modifiers - use $all with $elemMatch
      const modifierQueries: any[] = [];

      filters.modifiers.forEach((filterMod) => {
        // Build values constraint object if min/max are provided
        const valuesConstraint: any = {};
        if (filterMod.min !== undefined && filterMod.min !== null) {
          valuesConstraint.$gte = Number(filterMod.min);
        }
        if (filterMod.max !== undefined && filterMod.max !== null) {
          valuesConstraint.$lte = Number(filterMod.max);
        }

        // Check if this is a merged modifier by looking in MERGED_MODIFIERS
        const mergedModifier = MERGED_MODIFIERS.find((m) => m.name === filterMod.name);

        if (mergedModifier && mergedModifier.originalNames.length > 1) {
          // For merged modifiers in $all context, we'll use separate $elemMatch entries
          // (since $or inside $elemMatch doesn't work with $all)
          mergedModifier.originalNames.forEach((originalName) => {
            const elemMatch: any = {
              name: originalName,
            };

            if (Object.keys(valuesConstraint).length > 0) {
              elemMatch['values.0'] = valuesConstraint;
            }

            modifierQueries.push({ $elemMatch: elemMatch });
          });
        } else {
          // Regular modifier (single name) or skill modifier with ID
          const elemMatch: any = {
            name: filterMod.name,
          };

          if (Object.keys(valuesConstraint).length > 0) {
            elemMatch['values.0'] = valuesConstraint;
          }

          modifierQueries.push({ $elemMatch: elemMatch });
        }
      });

      if (modifierQueries.length > 0) {
        query['item.modifiers'] = { $all: modifierQueries };
      }
    }
  }

  return query as MarketListingQuery;
}
