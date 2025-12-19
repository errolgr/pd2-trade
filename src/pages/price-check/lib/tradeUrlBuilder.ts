import { Item, Stat } from './interfaces';
import { StatId, statIdToProperty, statRemap, statRemapByName, PRIORITY_STATS, STRIP_STATS } from './stat-mappings';
import { skillNameToIdMap } from '@/assets/character-skills';
import { classSkillNameToIdMap, fuzzyClassSubSkillByName, getSkillTabIndex } from '@/assets/class-skills';
import { ItemCharmMap, ItemQuality } from '@/common/types/Item';
import { getTypeFromBaseType, getStatKey } from './utils';
import { MarketListingQuery } from '@/common/types/pd2-website/GetMarketListingsCommand';
import { ItemType as PD2Item } from '@/assets/itemFuzzySearch';
import { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';

export function buildTradeUrl(
  item: Item,
  mappedItem: PD2Item,
  selected: Set<string>,
  filters: Record<string, { value?: string; min?: string; max?: string }>,
  settings: any,
  statMapper?: (statId: number, stat: Stat) => string | undefined,
  searchMode: number = 0,
  matchedItemType?: { typeLabel: string; typeValue: string; bases: Array<{ label: string; value: string }> } | null,
  isArchive: boolean = false,
  corruptedState: number = 0,
): string {
  const searchParams = new URLSearchParams();

  // Handle corrupted state separately - check it even if not in selected (for injected stats)
  // corruptedState: 0 = both (no filter), 1 = corrupted only, 2 = non-corrupted only
  if (corruptedState === 1) {
    searchParams.set('corrupted', 'true');
  } else if (corruptedState === 2) {
    searchParams.set('corrupted', 'false');
  }
  // If corruptedState === 0, don't add any corrupted filter

  // Get sorted stats for processing
  const sortedStats = getSortedStats(item);

  [...selected].forEach((key) => {
    const stat = sortedStats.find((s) => getStatKey(s) === key);
    if (!stat) return;

    const f = filters[key] ?? {};
    let propKey = 'stat_undefined';

    if ('skill' in stat && stat.skill) {
      const skillEntry = skillNameToIdMap[stat.skill.toLowerCase()];
      if (skillEntry) {
        propKey = `item_singleskill{${skillEntry.id}}`;
      } else {
        const classEntry = classSkillNameToIdMap[stat.skill.toLowerCase()];
        if (classEntry) {
          propKey = `item_addclassskills{${classEntry.id}}`;
        } else {
          const subClassEntry = fuzzyClassSubSkillByName(stat.skill.toLowerCase());
          if (subClassEntry) {
            propKey = `item_addskill_tab{${getSkillTabIndex(subClassEntry.id)}}`;
          }
        }
      }
    } else if (stat.stat_id !== undefined) {
      propKey = getPropertyKey(stat.stat_id, stat, statMapper);
    }

    if (stat.stat_id === StatId.Socket) {
      if (f.min !== undefined && f.min !== '') {
        searchParams.set('sockets_min', String(f.min));
      }
      if (f.max !== undefined && f.max !== '') {
        searchParams.set('sockets_max', String(f.max));
      }
      return;
    }

    if (stat.stat_id === StatId.Corrupted) {
      // Already handled above, skip here
      return;
    }

    if (stat.stat_id === StatId.Ethereal) {
      searchParams.set('ethereal', 'true');
      return;
    }

    if (f.min) searchParams.append(`properties[${propKey}][min]`, f.min);
    if (f.max) searchParams.append(`properties[${propKey}][max]`, f.max);
  });

  // Basic item meta
  searchParams.set('quality', item.quality);

  // Handle search mode: 0 = category (base), 1 = typeLabel
  // Note: Toggle only applies to base item qualities (Rare, Magic, Crafted, Normal, Superior)
  // Uniques, Sets, and Runewords always use name search
  if (item.type === 'Jewel') {
    searchParams.set('type', 'jewl');
    searchParams.set('base', 'jew');
  } else if (item.type.includes('Charm')) {
    searchParams.set('type', `{"$in": ["scha", "mcha", "lcha", "torc"]}`);
    searchParams.set('base', ItemCharmMap[item.type]);
  } else {
    // Runewords always use name search regardless of base quality
    if (item.isRuneword) {
      searchParams.set('name', item.runeword || mappedItem?.name || item.name);
    } else {
      // Check if item is a base quality that supports toggle
      const isBaseQuality =
        item.quality === ItemQuality.Rare ||
        item.quality === ItemQuality.Magic ||
        item.quality === ItemQuality.Crafted ||
        item.quality === ItemQuality.Normal ||
        item.quality === ItemQuality.Superior;

      if (isBaseQuality && searchMode === 1 && matchedItemType) {
        // Mode 1: Search by typeLabel (category type) - only for base qualities
        const typeValue =
          typeof matchedItemType.typeValue === 'string'
            ? matchedItemType.typeValue
            : JSON.stringify(matchedItemType.typeValue);
        searchParams.set('type', typeValue);
        // Don't set base parameter when searching by typeLabel
      } else if (isBaseQuality) {
        // Mode 0: Default behavior (category/base) - only for base qualities
        const result = getTypeFromBaseType(item.type, false);
        if (result && result?.type && result?.type) {
          const typeValue = typeof result.type === 'string' ? result.type : JSON.stringify(result.type);
          const baseValue = typeof result.base === 'string' ? result.base : JSON.stringify(result.base);
          searchParams.set('type', typeValue);
          // Only set base parameter if it's not "Any"
          if (baseValue !== 'Any') {
            searchParams.set('base', baseValue);
          }
        } else {
          console.warn('[ItemOverlayWidget] No base type found for rare item:', item.name);
        }
      } else {
        // Uniques, Sets: Always use name search (original functionality)
        searchParams.set('name', mappedItem?.name || item.name);
      }
    }
  }

  // Example flags — tweak as needed or make dynamic later
  searchParams.set('is_hardcore', `${settings.mode === 'hardcore'}`);
  searchParams.set('is_ladder', `${settings.ladder === 'ladder'}`);

  return `https://www.projectdiablo2.com/${isArchive ? 'market/archive' : 'market'}?${searchParams.toString()}`;
}

export function buildGetMarketListingQuery(
  item: Item,
  mappedItem: PD2Item,
  selected: Set<string>,
  filters: Record<string, { value?: string; min?: string; max?: string }>,
  settings: any,
  statMapper?: (statId: number, stat: Stat) => string | undefined,
  isArchive: boolean = false,
  searchMode: number = 0,
  matchedItemType?: { typeLabel: string; typeValue: string; bases: Array<{ label: string; value: string }> } | null,
  corruptedState: number = 0,
  limit: number = 10,
  offset: number = 0,
): MarketListingQuery {
  const now = new Date();
  const daysAgo = isArchive ? 14 : 3; // 2 weeks for archive, 3 days for regular
  const dateThreshold = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  const query: Partial<MarketListingQuery> = {
    $resolve: { user: { in_game_account: true } },
    type: 'item',
    $limit: limit,
    $skip: offset,
    accepted_offer_id: null,
    updated_at: { $gte: dateThreshold.toISOString() },
    $sort: { bumped_at: -1 },
    is_hardcore: settings.mode === 'hardcore',
    is_ladder: settings.ladder === 'ladder',
    'item.quality.name': item.quality,
  };

  const sortedStats = getSortedStats(item);
  const modifiers: any[] = [];

  // Handle corrupted state separately - check it even if not in selected (for injected stats)
  // corruptedState: 0 = both (no filter), 1 = corrupted only, 2 = non-corrupted only
  if (corruptedState === 1) {
    query['item.corrupted'] = true;
  } else if (corruptedState === 2) {
    query['item.corrupted'] = false;
  }
  // If corruptedState === 0, don't add any corrupted filter

  [...selected].forEach((key) => {
    const stat = sortedStats.find((s) => getStatKey(s) === key);
    if (!stat) return;
    const f = filters[key] ?? {};

    // Sockets, Corrupted, Ethereal handled as top-level query fields
    if (stat.stat_id === StatId.Socket) {
      if (f.min !== undefined && f.min !== '') {
        query['item.socket_count'] = { ...(query['item.socket_count'] || {}), $gte: Number(f.min) };
      }
      if (f.max !== undefined && f.max !== '') {
        query['item.socket_count'] = { ...(query['item.socket_count'] || {}), $lte: Number(f.max) };
      }
      return;
    }
    if (stat.stat_id === StatId.Corrupted) {
      // Already handled above, skip here
      return;
    }
    if (stat.stat_id === StatId.Ethereal || item.isEthereal) {
      query['item.is_ethereal'] = true;
      return;
    }

    // Skill stats
    if ('skill' in stat && stat.skill) {
      const skillEntry = skillNameToIdMap[stat.skill.toLowerCase()];
      if (skillEntry) {
        // Single skill
        const mod: any = { name: 'item_singleskill', 'values.0': skillEntry.id };
        if ((f.min !== undefined && f.min !== '') || (f.max !== undefined && f.max !== '')) {
          mod['values.1'] = {};
          if (f.min !== undefined && f.min !== '') mod['values.1'].$gte = Number(f.min);
          if (f.max !== undefined && f.max !== '') mod['values.1'].$lte = Number(f.max);
        }
        modifiers.push({ $elemMatch: mod });
        return;
      }
      const classEntry = classSkillNameToIdMap[stat.skill.toLowerCase()];
      if (classEntry) {
        // Class skill
        const mod: any = { name: 'item_addclassskills', 'values.0': classEntry.id };
        if ((f.min !== undefined && f.min !== '') || (f.max !== undefined && f.max !== '')) {
          mod['values.1'] = {};
          if (f.min !== undefined && f.min !== '') mod['values.1'].$gte = Number(f.min);
          if (f.max !== undefined && f.max !== '') mod['values.1'].$lte = Number(f.max);
        }
        modifiers.push({ $elemMatch: mod });
        return;
      }
      const subClassEntry = fuzzyClassSubSkillByName(stat.skill.toLowerCase());
      if (subClassEntry) {
        // Subclass skill
        const mod: any = { name: 'item_addskill_tab', 'values.0': getSkillTabIndex(subClassEntry.id) };
        if ((f.min !== undefined && f.min !== '') || (f.max !== undefined && f.max !== '')) {
          mod['values.1'] = {};
          if (f.min !== undefined && f.min !== '') mod['values.1'].$gte = Number(f.min);
          if (f.max !== undefined && f.max !== '') mod['values.1'].$lte = Number(f.max);
        }
        modifiers.push({ $elemMatch: mod });
        return;
      }
    }

    // Normal stat
    if (stat.stat_id !== undefined) {
      const prop = statIdToProperty[stat.stat_id];
      if (prop) {
        const mod: any = { name: prop };
        if ((f.min !== undefined && f.min !== '') || (f.max !== undefined && f.max !== '')) {
          mod['values.0'] = {};
          if (f.min !== undefined && f.min !== '') mod['values.0'].$gte = Number(f.min);
          if (f.max !== undefined && f.max !== '') mod['values.0'].$lte = Number(f.max);
        }
        modifiers.push({ $elemMatch: mod });
      }
    }
  });

  // Handle search mode: 0 = category (base), 1 = typeLabel
  // Note: Toggle only applies to base item qualities (Rare, Magic, Crafted, Normal, Superior)
  // Uniques, Sets, and Runewords always use name search
  if (item.type === 'Jewel') {
    query['item.base.type_code'] = 'jewl';
    query['item.base_code'] = 'jew';
  } else if (item.type.includes('Charm')) {
    query['item.base.type_code'] = { $in: ['scha', 'mcha', 'lcha', 'torc'] };
    query['item.base_code'] = ItemCharmMap[item.type];
  } else {
    // Runewords always use name search regardless of base quality
    if (item.isRuneword) {
      query['item.name'] = {
        $regex: item.runeword || mappedItem?.name || item.name || '',
        $options: 'i',
      };
    } else {
      // Check if item is a base quality that supports toggle
      const isBaseQuality =
        item.quality === ItemQuality.Rare ||
        item.quality === ItemQuality.Magic ||
        item.quality === ItemQuality.Crafted ||
        item.quality === ItemQuality.Normal ||
        item.quality === ItemQuality.Superior;

      if (isBaseQuality && searchMode === 1 && matchedItemType) {
        // Mode 1: Search by typeLabel (category type) - only for base qualities
        const typeValue =
          typeof matchedItemType.typeValue === 'string'
            ? matchedItemType.typeValue
            : JSON.stringify(matchedItemType.typeValue);
        query['item.base.type_code'] = typeValue as any;
        // Don't set base_code parameter when searching by typeLabel
      } else if (isBaseQuality) {
        // Mode 0: Default behavior (category/base) - only for base qualities
        const result = getTypeFromBaseType(item.type, true);
        if (result && result?.type && result?.type) {
          const typeValue = result.type;
          query['item.base.type_code'] = typeValue as any;
          // Only set base_code parameter if it's not "Any"
          const baseValue = typeof result.base === 'string' ? result.base : JSON.stringify(result.base);
          if (baseValue !== 'Any') {
            query['item.base_code'] = result.base;
          }
        } else {
          console.warn('[ItemOverlayWidget] No base type found for rare item:', item.name);
        }
      } else {
        // Uniques, Sets: Always use name search (original functionality)
        query['item.name'] = {
          $regex: item.name ? `${mappedItem?.name || item.name}` : '',
          $options: 'i',
        };
      }
    }
  }

  if (modifiers.length > 0) {
    query['item.modifiers'] = { $all: modifiers };
  }

  return query as MarketListingQuery;
}

export function buildGetMarketListingByStashItemQuery(items: GameStashItem[], userId: string): MarketListingQuery {
  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const query: Partial<MarketListingQuery> = {
    $resolve: { user: { in_game_account: true } },
    type: 'item',
    $limit: 10,
    $skip: 0,
    accepted_offer_id: null,
    updated_at: { $gte: threeDaysAgo.toISOString() },
    $sort: { bumped_at: -1 },
    user_id: userId,
    'item.hash': { $in: items.map((item) => item.hash) },
  };

  return query as MarketListingQuery;
}

export function buildGetAllUserMarketListingsQuery(
  userId: string,
  isHardcore: boolean,
  isLadder: boolean,
  limit: number = 20,
  skip: number = 0,
): MarketListingQuery {
  const query: Partial<MarketListingQuery> = {
    $resolve: { user: { in_game_account: true } },
    type: 'item',
    $limit: limit,
    $skip: skip,
    accepted_offer_id: null,
    $sort: { bumped_at: -1 },
    user_id: userId,
    is_hardcore: isHardcore,
    is_ladder: isLadder,
  };

  return query as MarketListingQuery;
}

function getPropertyKey(
  id: number,
  stat: Stat,
  statMapper?: (statId: number, stat: Stat) => string | undefined,
): string {
  return statMapper?.(id, stat) || statIdToProperty[id] || `stat_${id}`;
}

/**
 * Combines enhanced minimum damage (stat_id 18) and enhanced maximum damage (stat_id 17)
 * into a single "Enhanced Damage" stat (stat_id 998)
 */
function combineEnhancedDamageStats(stats: Stat[], itemType?: string): Stat[] {
  const minDamageStat = stats.find((s) => s.stat_id === 18); // item_mindamage_percent
  const maxDamageStat = stats.find((s) => s.stat_id === 17); // item_maxdamage_percent
  const existingEnhancedDamageStat = stats.find((s) => s.stat_id === 998);

  // Filter out stats 17, 18, and any existing 998 to avoid duplicates
  const filteredStats = stats.filter((s) => s.stat_id !== 17 && s.stat_id !== 18 && s.stat_id !== 998);

  // For jewels, enhanced damage is always 5-40%
  const isJewel = itemType === 'Jewel';
  const jewelRange = isJewel ? { min: 5, max: 40 } : undefined;

  // If both min and max damage stats exist, combine them
  if (minDamageStat && maxDamageStat) {
    const combinedValue = maxDamageStat.value ?? minDamageStat.value ?? 0;
    const combinedRange = jewelRange ?? {
      min: minDamageStat.range?.min ?? minDamageStat.value ?? 0,
      max: maxDamageStat.range?.max ?? maxDamageStat.value ?? 0,
    };
    const isCorrupted = minDamageStat.corrupted || maxDamageStat.corrupted;
    const combinedStat: Stat = {
      stat_id: 998,
      name: '% Enhanced Damage',
      value: combinedValue,
      range: combinedRange,
      ...(isCorrupted && { corrupted: true }),
    };
    return [...filteredStats, combinedStat];
  }

  // If only min damage exists, convert it to the combined stat
  if (minDamageStat) {
    const range = jewelRange ?? minDamageStat.range;
    const combinedStat: Stat = {
      stat_id: 998,
      name: '% Enhanced Damage',
      value: minDamageStat.value,
      range: range,
      ...(minDamageStat.corrupted && { corrupted: true }),
    };
    return [...filteredStats, combinedStat];
  }

  // If only max damage exists, convert it to the combined stat
  if (maxDamageStat) {
    const range = jewelRange ?? maxDamageStat.range;
    const combinedStat: Stat = {
      stat_id: 998,
      name: '% Enhanced Damage',
      value: maxDamageStat.value,
      range: range,
      ...(maxDamageStat.corrupted && { corrupted: true }),
    };
    return [...filteredStats, combinedStat];
  }

  // If no 17/18 stats but existing 998 exists, keep it (but update range if jewel)
  if (existingEnhancedDamageStat) {
    if (isJewel && existingEnhancedDamageStat.stat_id === 998) {
      const updatedStat: Stat = {
        ...existingEnhancedDamageStat,
        range: jewelRange,
      };
      return [...filteredStats, updatedStat];
    }
    return [...filteredStats, existingEnhancedDamageStat];
  }

  return filteredStats;
}

/**
 * Combines fire, lightning, cold, and poison resist stats (stat_ids 39, 41, 43, 45)
 * into a single "All Resistances" stat (stat_id 999) when they all have the same value
 */
function combineResistanceStats(stats: Stat[]): Stat[] {
  const fireResist = stats.find((s) => s.stat_id === 39); // fireresist
  const lightResist = stats.find((s) => s.stat_id === 41); // lightresist
  const coldResist = stats.find((s) => s.stat_id === 43); // coldresist
  const poisonResist = stats.find((s) => s.stat_id === 45); // poisonresist
  const existingAllResistStat = stats.find((s) => s.stat_id === 999);

  // Check if all four resistance stats exist and have the same value
  const allResistsExist = fireResist && lightResist && coldResist && poisonResist;
  const allSameValue =
    allResistsExist &&
    fireResist.value === lightResist.value &&
    lightResist.value === coldResist.value &&
    coldResist.value === poisonResist.value;

  // If all four resistances exist and have the same value, combine them
  if (allSameValue && fireResist) {
    // Filter out individual resistance stats and existing 999 to avoid duplicates
    const filteredStats = stats.filter(
      (s) => s.stat_id !== 39 && s.stat_id !== 41 && s.stat_id !== 43 && s.stat_id !== 45 && s.stat_id !== 999,
    );

    const combinedValue = fireResist.value;
    // Combine ranges: use the minimum of all mins and maximum of all maxes
    const combinedRange = {
      min: Math.min(
        fireResist.range?.min ?? fireResist.value ?? 0,
        lightResist!.range?.min ?? lightResist!.value ?? 0,
        coldResist!.range?.min ?? coldResist!.value ?? 0,
        poisonResist!.range?.min ?? poisonResist!.value ?? 0,
      ),
      max: Math.max(
        fireResist.range?.max ?? fireResist.value ?? 0,
        lightResist!.range?.max ?? lightResist!.value ?? 0,
        coldResist!.range?.max ?? coldResist!.value ?? 0,
        poisonResist!.range?.max ?? poisonResist!.value ?? 0,
      ),
    };
    const isCorrupted =
      fireResist.corrupted || lightResist!.corrupted || coldResist!.corrupted || poisonResist!.corrupted;
    const combinedStat: Stat = {
      stat_id: 999,
      name: 'All Resistances',
      value: combinedValue,
      range: combinedRange,
      ...(isCorrupted && { corrupted: true }),
    };
    return [...filteredStats, combinedStat];
  }

  // If values are not the same, keep individual stats as normal
  // Only filter out existing 999 if it exists (to avoid duplicates)
  if (existingAllResistStat) {
    return stats.filter((s) => s.stat_id !== 999);
  }

  // Return stats as-is if no combination needed and no existing 999
  return stats;
}

/**
 * Combines strength, energy, dexterity, and vitality stats (stat_ids 0, 1, 2, 3)
 * into a single "All Attributes" stat (stat_id 1002) when they all have the same value
 */
function combineAttributeStats(stats: Stat[]): Stat[] {
  const strengthStat = stats.find((s) => s.stat_id === 0); // strength
  const energyStat = stats.find((s) => s.stat_id === 1); // energy
  const dexterityStat = stats.find((s) => s.stat_id === 2); // dexterity
  const vitalityStat = stats.find((s) => s.stat_id === 3); // vitality
  const existingAllAttributesStat = stats.find((s) => s.stat_id === StatId.AllAttributes);

  // Check if all four attribute stats exist and have the same value
  const allAttributesExist = strengthStat && energyStat && dexterityStat && vitalityStat;
  const allSameValue =
    allAttributesExist &&
    strengthStat.value === energyStat.value &&
    energyStat.value === dexterityStat.value &&
    dexterityStat.value === vitalityStat.value;

  // If all four attributes exist and have the same value, combine them
  if (allSameValue && strengthStat) {
    // Filter out individual attribute stats and existing 1002 to avoid duplicates
    const filteredStats = stats.filter(
      (s) =>
        s.stat_id !== 0 && s.stat_id !== 1 && s.stat_id !== 2 && s.stat_id !== 3 && s.stat_id !== StatId.AllAttributes,
    );

    const combinedValue = strengthStat.value;
    // Combine ranges: use the minimum of all mins and maximum of all maxes
    const combinedRange = {
      min: Math.min(
        strengthStat.range?.min ?? strengthStat.value ?? 0,
        energyStat!.range?.min ?? energyStat!.value ?? 0,
        dexterityStat!.range?.min ?? dexterityStat!.value ?? 0,
        vitalityStat!.range?.min ?? vitalityStat!.value ?? 0,
      ),
      max: Math.max(
        strengthStat.range?.max ?? strengthStat.value ?? 0,
        energyStat!.range?.max ?? energyStat!.value ?? 0,
        dexterityStat!.range?.max ?? dexterityStat!.value ?? 0,
        vitalityStat!.range?.max ?? vitalityStat!.value ?? 0,
      ),
    };
    const isCorrupted =
      strengthStat.corrupted || energyStat!.corrupted || dexterityStat!.corrupted || vitalityStat!.corrupted;
    const combinedStat: Stat = {
      stat_id: StatId.AllAttributes,
      name: 'All Attributes',
      value: combinedValue,
      range: combinedRange,
      ...(isCorrupted && { corrupted: true }),
    };
    return [...filteredStats, combinedStat];
  }

  // If values are not the same, keep individual stats as normal
  // Only filter out existing 1002 if it exists (to avoid duplicates)
  if (existingAllAttributesStat) {
    return stats.filter((s) => s.stat_id !== StatId.AllAttributes);
  }

  // Return stats as-is if no combination needed and no existing 1002
  return stats;
}

function getSortedStats(item: any): Stat[] {
  const baseStats = [];

  // Inject sockets as a pseudo-stat row
  if (item.sockets != null) {
    baseStats.push({
      stat_id: StatId.Socket, // use a unique negative ID to avoid conflicts
      name: 'Sockets',
      value: item.sockets,
      range: { min: item.sockets, max: item.sockets },
    });
  }

  if (item.isEthereal) {
    baseStats.push({
      stat_id: StatId.Ethereal, // use a unique negative ID to avoid conflicts
      name: 'Ethereal',
    });
  }

  // Apply name-based remapping first (e.g., "to Strength" -> stat_id 0)
  // This must happen before combining attributes so the combination can find the remapped stats
  let combinedStats = (item.stats || []).map((stat: Stat) => {
    if (stat.name in statRemapByName) {
      return { ...stat, ...statRemapByName[stat.name] };
    }
    return stat;
  });

  // Combine enhanced damage stats before processing
  combinedStats = combineEnhancedDamageStats(combinedStats, item.type);
  // Combine attribute stats if applicable
  combinedStats = combineAttributeStats(combinedStats);
  // Combine resistance stats if applicable
  combinedStats = combineResistanceStats(combinedStats);

  return [...combinedStats, ...baseStats]
    .sort((a: Stat, b: Stat) => {
      const pa = PRIORITY_STATS.includes(a.stat_id) ? 0 : 1;
      const pb = PRIORITY_STATS.includes(b.stat_id) ? 0 : 1;
      return pa - pb; // priority first, others after
    })
    .map((stat: Stat) => {
      if (stat.stat_id in statRemap) {
        return statRemap[stat.stat_id];
      }
      // Note: statRemapByName is already applied earlier, before combining attributes
      // But we still check here in case there are other remappings needed
      if (stat.name in statRemapByName) {
        return { ...stat, ...statRemapByName[stat.name] };
      }
      if ('skill' in stat && stat.skill) {
        return { ...stat, name: stat.skill }; // use skill name as display name
      }
      return stat;
    })
    .filter((stat) => {
      // Filter out stats by ID
      if (STRIP_STATS.includes(stat.stat_id)) return false;
      // Filter out stats with "an evil force" in the name
      if (stat.name && stat.name.toLowerCase().includes('an evil force')) return false;
      return true;
    });
}
