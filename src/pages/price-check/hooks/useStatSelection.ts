import { useState, useMemo } from "react";
import { Stat } from "../lib/interfaces";
import { StatId, statRemap, statRemapByName, PRIORITY_STATS, STRIP_STATS } from "../lib/stat-mappings";
import { getStatKey } from "../lib/utils";
import { RANGE_MARGIN } from "../lib/types";

export function useStatSelection(item: any) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<Record<string, { value?: string; min?: string; max?: string }>>({});

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
  }, [item.stats, item.sockets]);

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
            const margin = Math.ceil(v * RANGE_MARGIN);
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
    toggle
  };
} 