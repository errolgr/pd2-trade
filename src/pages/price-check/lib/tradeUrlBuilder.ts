import type { Item, Stat, StatFilterInput } from './interfaces';
import { DAMAGE_PAIRS, type DamagePair, StatId, statIdToProperty } from './stat-mappings';
import { buildStatRows } from './stat-rows';
import { isOSkill, skillByName, skillParamSlots } from './stat-ranges';
import { classSkillNameToIdMap, fuzzyClassSubSkillByName, getSkillTabIndex } from '@/assets/class-skills';
import { ItemCharmMap, ItemQuality } from '@/common/types/Item';
import { getTypeFromBaseType, getStatKey, parseCodeValue } from './utils';
import { modifierByName } from '@/assets/modifiers';
import { MarketListingQuery } from '@/common/types/pd2-website/GetMarketListingsCommand';
import { ItemType as PD2Item } from '@/assets/itemFuzzySearch';
import { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';

export function buildTradeUrl(
  item: Item,
  mappedItem: PD2Item,
  selected: Set<string>,
  filters: Record<string, StatFilterInput>,
  settings: any,
  statMapper?: (statId: number, stat: Stat) => string | undefined,
  searchMode: number = 0,
  matchedItemType?: { typeLabel: string; typeValue: string; bases: Array<{ label: string; value: string }> } | null,
  isArchive: boolean = false,
  corruptedState: number = 0,
  qualityOverride?: string,
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
  const sortedStats = buildStatRows(item);

  [...selected].forEach((key) => {
    const stat = sortedStats.find((s) => getStatKey(s) === key);
    // Pseudo stats are no site property (the market service filters them: priceCheckToMarketFilters)
    if (!stat || stat.pseudo) return;

    const f = filters[key] ?? {};
    let propKey = 'stat_undefined';

    if ('skill' in stat && stat.skill && !stat.skillParam) {
      const skillEntry = skillByName(stat.skill);
      if (skillEntry) {
        propKey = `${isOSkill(item, stat) ? 'item_nonclassskill' : 'item_singleskill'}{${skillEntry.id}}`;
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

    // Damage pair rows: the site's min and max damage properties, one per input pair.
    const pair = DAMAGE_PAIRS.find((p) => p.id === stat.stat_id);
    if (pair) {
      for (const [id, lo, hi] of [
        [pair.min, f.min, f.max],
        [pair.max, f.maxMin, f.maxMax],
      ] as const) {
        const key = getPropertyKey(id, stat, statMapper);
        if (lo) searchParams.append(`properties[${key}][min]`, lo);
        if (hi) searchParams.append(`properties[${key}][max]`, hi);
      }
      return;
    }

    if (f.min) searchParams.append(`properties[${propKey}][min]`, f.min);
    if (f.max) searchParams.append(`properties[${propKey}][max]`, f.max);
  });

  // Basic item meta
  searchParams.set('quality', qualityOverride ?? item.quality);

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
  filters: Record<string, StatFilterInput>,
  settings: any,
  statMapper?: (statId: number, stat: Stat) => string | undefined,
  isArchive: boolean = false,
  searchMode: number = 0,
  matchedItemType?: { typeLabel: string; typeValue: string; bases: Array<{ label: string; value: string }> } | null,
  corruptedState: number = 0,
  limit: number = 10,
  offset: number = 0,
  corruptionNames?: string[],
  qualityOverride?: string,
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
    'item.quality.name': qualityOverride ?? item.quality,
  };

  const sortedStats = buildStatRows(item);
  const modifiers: any[] = [];

  // Handle corrupted state separately - check it even if not in selected (for injected stats)
  // corruptedState: 0 = both (no filter), 1 = corrupted only, 2 = non-corrupted only
  if (corruptedState === 1) {
    query['item.corrupted'] = true;
  } else if (corruptedState === 2) {
    query['item.corrupted'] = false;
  }
  // If corruptedState === 0, don't add any corrupted filter

  // Handle corruption names filter - filter by specific corruptions
  // Use $all to require ALL corruptions to be present, not just one
  if (corruptionNames && corruptionNames.length > 0) {
    query['item.corruptions'] = { $all: corruptionNames };
  }

  [...selected].forEach((key) => {
    const stat = sortedStats.find((s) => getStatKey(s) === key);
    // Pseudo stats are no PD2 modifier (the market service filters them: priceCheckToMarketFilters)
    if (!stat || stat.pseudo) return;
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
    if (stat.stat_id === StatId.Ethereal) {
      query['item.is_ethereal'] = true;
      return;
    }

    // Skill stats (charges carry a skill too, but are a skill-parameterised modifier: below)
    if ('skill' in stat && stat.skill && !stat.skillParam) {
      const skillEntry = skillByName(stat.skill);
      if (skillEntry) {
        // Single skill, or an o-skill (no "(Class Only)" on the line)
        const mod: any = {
          name: isOSkill(item, stat) ? 'item_nonclassskill' : 'item_singleskill',
          'values.0': skillEntry.id,
        };
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

    // Damage pair rows ("Adds 4-14 fire damage")
    const pair = DAMAGE_PAIRS.find((p) => p.id === stat.stat_id);
    if (pair) {
      modifiers.push(...damagePairMatches(pair, f));
      return;
    }

    // Normal stat
    if (stat.stat_id !== undefined) {
      const prop = statIdToProperty[stat.stat_id];
      if (prop) {
        const mod: any = { name: prop };
        // Skill-parameterised modifiers (auras, chance to cast, charges) pin the skill (by id, or by the line when
        // no id is known) and roll the level. Skill-event modifiers the clipboard exports with an id (values
        // [level, skill, chance], e.g. "Melee Attacks Deal Splash Damage" [1, 358, 100]) roll the chance the
        // clipboard reports as the value.
        const skill = stat.skillParam;
        const slots = skill ? skillParamSlots(stat.stat_id) : null;
        if (skill && slots) {
          if (skill.ids.length === 0) mod.label = { $regex: skill.line };
          else mod[slots.param] = skill.ids.length === 1 ? skill.ids[0] : { $in: skill.ids };
        }
        const slot = slots ? slots.roll : modifierByName[prop]?.encoding === 2 ? 'values.2' : 'values.0';
        if ((f.min !== undefined && f.min !== '') || (f.max !== undefined && f.max !== '')) {
          mod[slot] = {};
          if (f.min !== undefined && f.min !== '') mod[slot].$gte = Number(f.min);
          if (f.max !== undefined && f.max !== '') mod[slot].$lte = Number(f.max);
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
      const name = item.runeword || mappedItem?.name || item.name;
      if (name) query['item.name'] = { $regex: name, $options: 'i' };
    } else {
      // Check if item is a base quality that supports toggle
      const isBaseQuality =
        item.quality === ItemQuality.Rare ||
        item.quality === ItemQuality.Magic ||
        item.quality === ItemQuality.Crafted ||
        item.quality === ItemQuality.Normal ||
        item.quality === ItemQuality.Superior;

      if (isBaseQuality && searchMode === 1 && matchedItemType) {
        // Mode 1: Search by typeLabel (category type) - only for base qualities. Grouped types ("Fist Weapon":
        // `{"$in": ["h2h", "h2h2"]}`) query as their `$in` object: PD2 matches the JSON string literally.
        query['item.base.type_code'] = parseCodeValue(matchedItemType.typeValue);
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
        // Uniques, Sets: Always use name search (original functionality). Nameless items (Inferior quality) get no
        // name filter: PD2 answers an empty $regex with a 500 ("$regex has to be a string").
        if (item.name) query['item.name'] = { $regex: mappedItem?.name || item.name, $options: 'i' };
      }
    }
  }

  if (modifiers.length > 0) {
    query['item.modifiers'] = { $all: modifiers };
  }

  return query as MarketListingQuery;
}

export function buildGetMarketListingByStashItemQuery(
  items: GameStashItem[],
  userId: string,
): MarketListingQuery | null {
  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  // Filter out items without hash and map to hashes
  const hashes = items.map((item) => item.hash).filter((hash): hash is string => hash != null && hash !== undefined);

  // Return null early if there are no valid hashes
  if (hashes.length === 0) {
    return null;
  }

  // Limit to 20 hashes to avoid API errors (API has a limit on $in array size)
  const limitedHashes = hashes.slice(0, 20);
  if (hashes.length > 20) {
    console.warn(
      `[buildGetMarketListingByStashItemQuery] Found ${hashes.length} matching items, but API query is limited to 20 hashes. Only the first 20 items will be checked for existing listings.`,
    );
  }

  const query: Partial<MarketListingQuery> = {
    $resolve: { user: { in_game_account: true } },
    type: 'item',
    $limit: 10,
    $skip: 0,
    accepted_offer_id: null,
    updated_at: { $gte: threeDaysAgo.toISOString() },
    $sort: { bumped_at: -1 },
    user_id: userId,
    'item.hash': { $in: limitedHashes },
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
  const key = statMapper?.(id, stat) || statIdToProperty[id] || `stat_${id}`;
  // The site's keys pin leading params only: item_aura{98}; chance to cast and charges filter any skill.
  const pinned = stat.skillParam?.ids.length === 1 && skillParamSlots(id).param === 'values.0';
  return pinned ? `${key}{${stat.skillParam!.ids[0]}}` : key;
}

/** `{ $gte, $lte }` from two inputs, or undefined when both are empty. */
function bounds(lo: string | undefined, hi: string | undefined): { $gte?: number; $lte?: number } | undefined {
  if (!lo && !hi) return undefined;
  return { ...(lo ? { $gte: Number(lo) } : {}), ...(hi ? { $lte: Number(hi) } : {}) };
}

/** Physical min/max damage: separate market modifiers, under every name the market uses. */
const MIN_DAMAGE_MODS = ['min_damage', 'mindamage', 'secondary_mindamage'];
const MAX_DAMAGE_MODS = ['max_damage', 'maxdamage', 'secondary_maxdamage'];

/**
 * Market `$elemMatch`es for a damage pair row. Elemental pairs are one market modifier (`firedam`, values
 * [min, max, …]) under a few names; physical damage is two modifiers.
 */
export function damagePairMatches(
  pair: DamagePair,
  f: StatFilterInput,
): Array<{ $elemMatch: Record<string, unknown> }> {
  const minBounds = bounds(f.min, f.max);
  const maxBounds = bounds(f.maxMin, f.maxMax);
  if (pair.market) {
    return [
      {
        $elemMatch: {
          name: { $in: pair.market },
          ...(minBounds && { 'values.0': minBounds }),
          ...(maxBounds && { 'values.1': maxBounds }),
        },
      },
    ];
  }
  return [
    { $elemMatch: { name: { $in: MIN_DAMAGE_MODS }, ...(minBounds && { 'values.0': minBounds }) } },
    { $elemMatch: { name: { $in: MAX_DAMAGE_MODS }, ...(maxBounds && { 'values.0': maxBounds }) } },
  ];
}
