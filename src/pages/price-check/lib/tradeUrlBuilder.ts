import { Stat } from "./interfaces";
import { StatId, statIdToProperty, statRemap, statRemapByName, PRIORITY_STATS, STRIP_STATS } from "./stat-mappings";
import { skillNameToIdMap } from "@/assets/character-skills";
import { classSkillNameToIdMap, classSubSkillNameToIdMap } from "@/assets/class-skills";
import { ItemCharmMap, ItemQuality } from "@/common/types/Item";
import { getTypeFromBaseType, getStatKey } from "./utils";
import { RANGE_MARGIN } from "./types";

export function buildTradeUrl(
  item: any,
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
      searchParams.set("name", item.isRuneword ? item.runeword : item.name);
    }
  }

  // Example flags — tweak as needed or make dynamic later
  searchParams.set("is_hardcore", `${(settings.mode === 'hardcore')}`);
  searchParams.set("is_ladder", `${(settings.ladder === 'ladder')}`);

  return `https://www.projectdiablo2.com/market/archive?${searchParams.toString()}`;
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