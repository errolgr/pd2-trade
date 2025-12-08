import { useState, useMemo } from "react";
import { Stat } from "../lib/interfaces";
import { StatId, statRemap, statRemapByName, PRIORITY_STATS, STRIP_STATS } from "../lib/stat-mappings";
import { getStatKey } from "../lib/utils";
import { useOptions } from "@/hooks/useOptions";

/**
 * Combines enhanced minimum damage (stat_id 18) and enhanced maximum damage (stat_id 17)
 * into a single "Enhanced Damage" stat (stat_id 998)
 */
function combineEnhancedDamageStats(stats: Stat[], itemType?: string, rangeMargin: number = 0.05): Stat[] {
  const minDamageStat = stats.find(s => s.stat_id === 18); // item_mindamage_percent
  const maxDamageStat = stats.find(s => s.stat_id === 17); // item_maxdamage_percent
  const existingEnhancedDamageStat = stats.find(s => s.stat_id === 998);

  // Filter out stats 17, 18, and any existing 998 to avoid duplicates
  const filteredStats = stats.filter(s => s.stat_id !== 17 && s.stat_id !== 18 && s.stat_id !== 998);

  // Helper function to apply range margin
  const applyRangeMargin = (value: number | undefined, range: { min?: number; max?: number } | undefined) => {
    if (!value) return range;
    const margin = Math.ceil(value * rangeMargin);
    return {
      min: range?.min !== undefined ? Math.max(value - margin, range.min) : value - margin,
      max: range?.max !== undefined ? Math.min(value + margin, range.max) : value + margin,
    };
  };

  // For jewels, enhanced damage is always 5-40%
  const isJewel = itemType === "Jewel";
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
      name: "% Enhanced Damage",
      value: combinedValue,
      range: isJewel ? combinedRange : applyRangeMargin(combinedValue, combinedRange),
      ...(isCorrupted && { corrupted: true }),
    };
    return [...filteredStats, combinedStat];
  }

  // If only min damage exists, convert it to the combined stat
  if (minDamageStat) {
    const range = jewelRange ?? minDamageStat.range;
    const combinedStat: Stat = {
      stat_id: 998,
      name: "% Enhanced Damage",
      value: minDamageStat.value,
      range: isJewel ? range : applyRangeMargin(minDamageStat.value, range),
      ...(minDamageStat.corrupted && { corrupted: true }),
    };
    return [...filteredStats, combinedStat];
  }

  // If only max damage exists, convert it to the combined stat
  if (maxDamageStat) {
    const range = jewelRange ?? maxDamageStat.range;
    const combinedStat: Stat = {
      stat_id: 998,
      name: "% Enhanced Damage",
      value: maxDamageStat.value,
      range: isJewel ? range : applyRangeMargin(maxDamageStat.value, range),
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
function combineResistanceStats(stats: Stat[], rangeMargin: number = 0.05): Stat[] {
  const fireResist = stats.find(s => s.stat_id === 39); // fireresist
  const lightResist = stats.find(s => s.stat_id === 41); // lightresist
  const coldResist = stats.find(s => s.stat_id === 43); // coldresist
  const poisonResist = stats.find(s => s.stat_id === 45); // poisonresist
  const existingAllResistStat = stats.find(s => s.stat_id === 999);

  // Check if all four resistance stats exist and have the same value
  const allResistsExist = fireResist && lightResist && coldResist && poisonResist;
  const allSameValue = allResistsExist && 
    fireResist.value === lightResist.value &&
    lightResist.value === coldResist.value &&
    coldResist.value === poisonResist.value;

  // Helper function to apply range margin
  const applyRangeMargin = (value: number | undefined, range: { min?: number; max?: number } | undefined) => {
    if (!value) return range;
    const margin = Math.ceil(value * rangeMargin);
    return {
      min: range?.min !== undefined ? Math.max(value - margin, range.min) : value - margin,
      max: range?.max !== undefined ? Math.min(value + margin, range.max) : value + margin,
    };
  };

  // If all four resistances exist and have the same value, combine them
  if (allSameValue && fireResist) {
    // Filter out individual resistance stats and existing 999 to avoid duplicates
    const filteredStats = stats.filter(s => s.stat_id !== 39 && s.stat_id !== 41 && s.stat_id !== 43 && s.stat_id !== 45 && s.stat_id !== 999);
    
    const combinedValue = fireResist.value;
    // Combine ranges: use the minimum of all mins and maximum of all maxes
    const combinedRange = {
      min: Math.min(
        fireResist.range?.min ?? fireResist.value ?? 0,
        lightResist!.range?.min ?? lightResist!.value ?? 0,
        coldResist!.range?.min ?? coldResist!.value ?? 0,
        poisonResist!.range?.min ?? poisonResist!.value ?? 0
      ),
      max: Math.max(
        fireResist.range?.max ?? fireResist.value ?? 0,
        lightResist!.range?.max ?? lightResist!.value ?? 0,
        coldResist!.range?.max ?? coldResist!.value ?? 0,
        poisonResist!.range?.max ?? poisonResist!.value ?? 0
      ),
    };
    const isCorrupted = fireResist.corrupted || lightResist!.corrupted || coldResist!.corrupted || poisonResist!.corrupted;
    const combinedStat: Stat = {
      stat_id: 999,
      name: "All Resistances",
      value: combinedValue,
      range: applyRangeMargin(combinedValue, combinedRange),
      ...(isCorrupted && { corrupted: true }),
    };
    return [...filteredStats, combinedStat];
  }

  // If values are not the same, keep individual stats as normal
  // Only filter out existing 999 if it exists (to avoid duplicates)
  if (existingAllResistStat) {
    return stats.filter(s => s.stat_id !== 999);
  }

  // Return stats as-is if no combination needed and no existing 999
  return stats;
}

/**
 * Combines strength, energy, dexterity, and vitality stats (stat_ids 0, 1, 2, 3)
 * into a single "All Attributes" stat (stat_id 1002) when they all have the same value
 */
function combineAttributeStats(stats: Stat[], rangeMargin: number = 0.05): Stat[] {
  const strengthStat = stats.find(s => s.stat_id === 0); // strength
  const energyStat = stats.find(s => s.stat_id === 1); // energy
  const dexterityStat = stats.find(s => s.stat_id === 2); // dexterity
  const vitalityStat = stats.find(s => s.stat_id === 3); // vitality
  const existingAllAttributesStat = stats.find(s => s.stat_id === StatId.AllAttributes);

  // Check if all four attribute stats exist and have the same value
  const allAttributesExist = strengthStat && energyStat && dexterityStat && vitalityStat;
  const allSameValue = allAttributesExist && 
    strengthStat.value === energyStat.value &&
    energyStat.value === dexterityStat.value &&
    dexterityStat.value === vitalityStat.value;

  // Helper function to apply range margin
  const applyRangeMargin = (value: number | undefined, range: { min?: number; max?: number } | undefined) => {
    if (!value) return range;
    const margin = Math.ceil(value * rangeMargin);
    return {
      min: range?.min !== undefined ? Math.max(value - margin, range.min) : value - margin,
      max: range?.max !== undefined ? Math.min(value + margin, range.max) : value + margin,
    };
  };

  // If all four attributes exist and have the same value, combine them
  if (allSameValue && strengthStat) {
    // Filter out individual attribute stats and existing 1002 to avoid duplicates
    const filteredStats = stats.filter(s => s.stat_id !== 0 && s.stat_id !== 1 && s.stat_id !== 2 && s.stat_id !== 3 && s.stat_id !== StatId.AllAttributes);
    
    const combinedValue = strengthStat.value;
    // Combine ranges: use the minimum of all mins and maximum of all maxes
    const combinedRange = {
      min: Math.min(
        strengthStat.range?.min ?? strengthStat.value ?? 0,
        energyStat!.range?.min ?? energyStat!.value ?? 0,
        dexterityStat!.range?.min ?? dexterityStat!.value ?? 0,
        vitalityStat!.range?.min ?? vitalityStat!.value ?? 0
      ),
      max: Math.max(
        strengthStat.range?.max ?? strengthStat.value ?? 0,
        energyStat!.range?.max ?? energyStat!.value ?? 0,
        dexterityStat!.range?.max ?? dexterityStat!.value ?? 0,
        vitalityStat!.range?.max ?? vitalityStat!.value ?? 0
      ),
    };
    const isCorrupted = strengthStat.corrupted || energyStat!.corrupted || dexterityStat!.corrupted || vitalityStat!.corrupted;
    const combinedStat: Stat = {
      stat_id: StatId.AllAttributes,
      name: "All Attributes",
      value: combinedValue,
      range: applyRangeMargin(combinedValue, combinedRange),
      ...(isCorrupted && { corrupted: true }),
    };
    return [...filteredStats, combinedStat];
  }

  // If values are not the same, keep individual stats as normal
  // Only filter out existing 1002 if it exists (to avoid duplicates)
  if (existingAllAttributesStat) {
    return stats.filter(s => s.stat_id !== StatId.AllAttributes);
  }

  // Return stats as-is if no combination needed and no existing 1002
  return stats;
}

export function useStatSelection(item: any) {
  const { settings } = useOptions();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<Record<string, { value?: string; min?: string; max?: string }>>({});
  // Corrupted state: 0 = both, 1 = corrupted only, 2 = non-corrupted only
  const [corruptedState, setCorruptedState] = useState<number>(0);

  // Get range margin from settings (convert percentage 0-100 to decimal 0-1)
  // Default to 5% (0.05) if not set
  const rangeMargin = useMemo(() => {
    const fillStatValue = settings?.fillStatValue ?? 5;
    return fillStatValue / 100;
  }, [settings?.fillStatValue]);

  // Sort stats once with useMemo so it's cheap
  const sortedStats = useMemo(() => {
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

    // Apply name-based remapping first (e.g., "to Strength" -> stat_id 0)
    // This must happen before combining attributes so the combination can find the remapped stats
    let combinedStats = (item.stats || []).map((stat: Stat) => {
      if (stat.name in statRemapByName) {
        return {...stat, ...statRemapByName[stat.name]};
      }
      return stat;
    });
    
    // Combine enhanced damage stats before processing
    combinedStats = combineEnhancedDamageStats(combinedStats, item.type, rangeMargin);
    // Combine attribute stats if applicable
    combinedStats = combineAttributeStats(combinedStats, rangeMargin);
    // Combine resistance stats if applicable
    combinedStats = combineResistanceStats(combinedStats, rangeMargin);

    return [...combinedStats, ...baseStats].sort((a: Stat, b: Stat) => {
      const pa = PRIORITY_STATS.includes(a.stat_id) ? 0 : 1;
      const pb = PRIORITY_STATS.includes(b.stat_id) ? 0 : 1;
      return pa - pb;             // priority first, others after
    }).map((stat: Stat) => {
      if (stat.stat_id in statRemap) {
        return statRemap[stat.stat_id];
      }
      // Note: statRemapByName is already applied earlier, before combining attributes
      // But we still check here in case there are other remappings needed
      if (stat.name in statRemapByName) {
        return {...stat, ...statRemapByName[stat.name]}
      }
      if ("skill" in stat && stat.skill) {
        return {...stat, name: stat.skill} // use skill name as display name
      }
      return stat;
    }).filter((stat) => {
      // Filter out stats by ID
      if (STRIP_STATS.includes(stat.stat_id)) return false;
      // Filter out stats with "an evil force" in the name
      if (stat.name && stat.name.toLowerCase().includes("an evil force")) return false;
      return true;
    });
  }, [item.stats, item.sockets, rangeMargin]);

  const updateFilter = (
    key: string,
    field: "value" | "min" | "max",
    val: string
  ) =>
    setFilters((f) => ({
      ...f,
      [key]: { ...f[key], [field]: val },
    }));

  /** Toggle selection and initialise filter defaults */
  const toggle = (stat: Stat) => {
    const key = getStatKey(stat);
    
    // Special handling for corrupted stat - three states
    if (stat.stat_id === StatId.Corrupted) {
      setCorruptedState((prev) => {
        const next = (prev + 1) % 3; // Cycle: 0 -> 1 -> 2 -> 0
        // Update selected set based on state
        setSelected((sel) => {
          const nextSel = new Set([...sel]);
          if (next === 0) {
            // State 0: both - remove from selected
            nextSel.delete(key);
          } else {
            // State 1 or 2: add to selected
            nextSel.add(key);
          }
          return nextSel;
        });
        return next;
      });
      return;
    }
    
    setSelected((prev) => {
      const next = new Set([...prev]);
      if (next.has(key)) {
        next.delete(key);
        setFilters((f) => {
          const { [key]: _removed, ...rest } = f;
          return rest;
        });
      } else {
        next.add(key);
        setFilters((f) => {
          const v = stat.value ?? 0;

          if (stat.range) {
            const margin = Math.ceil(v * rangeMargin);
            const min = Math.max(v - margin, stat.range.min);
            const max = Math.min(v + margin, stat.range.max);

            return {
              ...f,
              [key]: {
                min: String(min),
                max: String(max),
              },
            };
          }

          return {
            ...f,
            [key]: {
              min: String(v),
              max: String(v),
            },
          };
        });
      }
      return next;
    });
  };

  return {
    selected,
    setSelected,
    filters,
    setFilters,
    sortedStats,
    updateFilter,
    toggle,
    corruptedState,
    setCorruptedState
  };
} 