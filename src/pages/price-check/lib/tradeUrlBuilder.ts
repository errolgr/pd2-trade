import { Item, Stat } from "./interfaces";
import { StatId, statIdToProperty, statRemap, statRemapByName, PRIORITY_STATS, STRIP_STATS } from "./stat-mappings";
import { skillNameToIdMap } from "@/assets/character-skills";
import { classSkillNameToIdMap, classSubSkillNameToIdMap } from "@/assets/class-skills";
import { ItemCharmMap, ItemQuality } from "@/common/types/Item";
import { getTypeFromBaseType, getStatKey } from "./utils";
import { RANGE_MARGIN } from "./types";
import { MarketListingQuery } from "@/common/types/pd2-website/GetMarketListingsCommand";
import { ItemType as PD2Item } from "@/assets/itemFuzzySearch";

export function buildTradeUrl(
  item: Item,
  mappedItem: PD2Item,
  selected: Set<string>,
  filters: Record<string, { value?: string; min?: string; max?: string }>,
  settings: any,
  statMapper?: (statId: number, stat: Stat) => string | undefined
): string {
  const searchParams = new URLSearchParams();

  // Get sorted stats for processing
  const sortedStats = getSortedStats(item);

  [...selected].forEach((key) => {
    const stat = sortedStats.find(s => getStatKey(s) === key);
    if (!stat) return;

    const f = filters[key] ?? {};
    let propKey = "stat_undefined";

    if ('skill' in stat && stat.skill) {
      const skillEntry = skillNameToIdMap[stat.skill.toLowerCase()];
      if (skillEntry) {
        propKey = `item_singleskill{${skillEntry.id}}`;
      }
      const classEntry = classSkillNameToIdMap[stat.skill.toLowerCase()];
      if (classEntry) {
        propKey = `item_addclassskills{${classEntry.id}}`;
      }
      const subClassEntry = classSubSkillNameToIdMap[stat.skill.toLowerCase()];
      if (subClassEntry) {
        propKey = `item_addskill_tab{${subClassEntry.id}}`;
      }

    } else if (stat.stat_id !== undefined) {
      propKey = getPropertyKey(stat.stat_id, stat, statMapper);
    }

    if (stat.stat_id === StatId.Socket) {
      searchParams.set("sockets_min", String(f.min ?? 0));
      searchParams.set("sockets_max", String(f.max ?? 0));
      return;
    }

    if (stat.stat_id === StatId.Corrupted) {
      searchParams.set("corrupted", "true");
      return;
    }

    if(stat.stat_id === StatId.Ethereal) {
      searchParams.set("ethereal", "true");
      return;
    }

    if (f.min) searchParams.append(`properties[${propKey}][min]`, f.min);
    if (f.max) searchParams.append(`properties[${propKey}][max]`, f.max);
  });

  // Basic item meta
  searchParams.set("quality", item.quality);

  if (item.type === "Jewel") {
    searchParams.set("type", "jewl");
    searchParams.set("base", "jew");
  } else if (item.type.includes("Charm")) {
    searchParams.set("type", `{"$in": ["scha", "mcha", "lcha", "torc"]}`);
    searchParams.set("base", ItemCharmMap[item.type]);
  } else {
    if (
      item.quality === ItemQuality.Rare ||
      item.quality === ItemQuality.Magic ||
      item.quality === ItemQuality.Crafted) {
      const result = getTypeFromBaseType(item.type);
      if (result && result?.type && result?.type) {
        searchParams.set("type", result.type);
        searchParams.set("base", result.base);
      } else {
        console.warn("[ItemOverlayWidget] No base type found for rare item:", item.name);
      }
    } else {
      searchParams.set("name", item.isRuneword ? item.runeword : mappedItem?.name || item.name);
    }
  }

  // Example flags — tweak as needed or make dynamic later
  searchParams.set("is_hardcore", `${(settings.mode === 'hardcore')}`);
  searchParams.set("is_ladder", `${(settings.ladder === 'ladder')}`);

  return `https://www.projectdiablo2.com/market/archive?${searchParams.toString()}`;
}

export function buildGetMarketListingQuery(
  item: Item,
  mappedItem: PD2Item, 
  selected: Set<string>,
  filters: Record<string, { value?: string; min?: string; max?: string }>,
  settings: any,
  statMapper?: (statId: number, stat: Stat) => string | undefined
): MarketListingQuery {
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
    is_hardcore: settings.mode === 'hardcore',
    is_ladder: settings.ladder === 'ladder',
    'item.quality.name': item.quality,
  };

  const sortedStats = getSortedStats(item);
  const modifiers: any[] = [];

  [...selected].forEach((key) => {
    const stat = sortedStats.find(s => getStatKey(s) === key);
    if (!stat) return;
    const f = filters[key] ?? {};

    // Sockets, Corrupted, Ethereal handled as top-level query fields
    if (stat.stat_id === StatId.Socket) {
      if (f.min !== undefined) query['item.socket_count'] = { ...(query['item.socket_count'] || {}), $gte: Number(f.min) };
      if (f.max !== undefined) query['item.socket_count'] = { ...(query['item.socket_count'] || {}), $lte: Number(f.max) };
      return;
    }
    if (stat.stat_id === StatId.Corrupted) {
      query['item.corrupted'] = true;
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
        if (f.min !== undefined || f.max !== undefined) {
          mod['values.1'] = {};
          if (f.min !== undefined) mod['values.1'].$gte = Number(f.min);
          if (f.max !== undefined) mod['values.1'].$lte = Number(f.max);
        }
        modifiers.push({ $elemMatch: mod });
        return;
      }
      const classEntry = classSkillNameToIdMap[stat.skill.toLowerCase()];
      if (classEntry) {
        // Class skill
        const mod: any = { name: 'item_addclassskills', 'values.0': classEntry.id };
        if (f.min !== undefined || f.max !== undefined) {
          mod['values.1'] = {};
          if (f.min !== undefined) mod['values.1'].$gte = Number(f.min);
          if (f.max !== undefined) mod['values.1'].$lte = Number(f.max);
        }
        modifiers.push({ $elemMatch: mod });
        return;
      }
      const subClassEntry = classSubSkillNameToIdMap[stat.skill.toLowerCase()];
      if (subClassEntry) {
        // Subclass skill
        const mod: any = { name: 'item_addskill_tab', 'values.0': subClassEntry.id };
        if (f.min !== undefined || f.max !== undefined) {
          mod['values.1'] = {};
          if (f.min !== undefined) mod['values.1'].$gte = Number(f.min);
          if (f.max !== undefined) mod['values.1'].$lte = Number(f.max);
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
        if (f.min !== undefined || f.max !== undefined) {
          mod['values.0'] = {};
          if (f.min !== undefined) mod['values.0'].$gte = Number(f.min);
          if (f.max !== undefined) mod['values.0'].$lte = Number(f.max);
        }
        modifiers.push({ $elemMatch: mod });
      }
    }
  });

  if (item.type === "Jewel") {
    query['item.base.type_code'] = "jewl";
    query['item.base_code'] = "jew";
  } else if (item.type.includes("Charm")) {
    query['item.base.type_code'] = {"$in": ["scha", "mcha", "lcha", "torc"]}
    query['item.base_code'] = ItemCharmMap[item.type]
  } else {
    if (
      item.quality === ItemQuality.Rare ||
      item.quality === ItemQuality.Magic ||
      item.quality === ItemQuality.Crafted) {
      const result = getTypeFromBaseType(item.type);
      if (result && result?.type && result?.type) {
        query['item.base.type_code'] = result.type;
        query['item.base_code'] = result.base;
      } else {
        console.warn("[ItemOverlayWidget] No base type found for rare item:", item.name);
      }
    } else {
      query['item.name'] = {
        $regex: item.name ? `${mappedItem?.name || item.name}` : '',
        $options: 'i',
      }
    }
  } 

  if (modifiers.length > 0) {
    query['item.modifiers'] = { $all: modifiers };
  }

  return query as MarketListingQuery;
}

function getPropertyKey(id: number, stat: Stat, statMapper?: (statId: number, stat: Stat) => string | undefined): string {
  return statMapper?.(id, stat) || statIdToProperty[id] || `stat_${id}`;
}

function getSortedStats(item: any): Stat[] {
  const baseStats = [];

  // Inject sockets as a pseudo-stat row
  if (item.sockets != null) {
    baseStats.push({
      stat_id: StatId.Socket, // use a unique negative ID to avoid conflicts
      name: "Sockets",
      value: item.sockets,
      range: { min: item.sockets, max: item.sockets },
    });
  }

  if (item.isEthereal) {
    baseStats.push({
      stat_id: StatId.Ethereal, // use a unique negative ID to avoid conflicts
      name: "Ethereal"
    });
  }

  return [...item.stats, ...baseStats].sort((a: Stat, b: Stat) => {
    const pa = PRIORITY_STATS.includes(a.stat_id) ? 0 : 1;
    const pb = PRIORITY_STATS.includes(b.stat_id) ? 0 : 1;
    return pa - pb;             // priority first, others after
  }).map((stat: Stat) => {
    if (stat.stat_id in statRemap) {
      return statRemap[stat.stat_id];
    }
    if (stat.name in statRemapByName) {
      return {...stat, ...statRemapByName[stat.name]}
    }
    if ("skill" in stat && stat.skill) {
      return {...stat, name: stat.skill} // use skill name as display name
    }
    return stat;
  }).filter((stat) => !STRIP_STATS.includes(stat.stat_id));
} 