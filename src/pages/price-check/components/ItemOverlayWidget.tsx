import React, {useCallback, useMemo, useState} from "react";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {X} from "lucide-react";
import {ScrollArea} from "@/components/ui/scroll-area";
import {
  PRIORITY_STATS,
  statIdToProperty,
  statRemap,
  statRemapByName,
  StatId,
  STRIP_STATS
} from "../utils/stat-mappings";
import { Item, Stat } from "../utils/interfaces";
import { qualityColor } from "../utils/qualityColor";
import { StatRow } from "./StatRow";
import {skillNameToIdMap} from "@/assets/character-skills";
import {ItemCharmMap, ItemQuality} from "@/common/types/Item";
import {itemTypes} from "@/common/item-types";
import {useOptions} from "@/hooks/useOptions";

interface Props {
  item: Item;
  statMapper?: (statId: number, stat: Stat) => string | undefined; // allow override
  onClose?: () => void;
}
const RANGE_MARGIN = 0.05; // 20% by default, make this configurable if needed

export default function ItemOverlayWidget({ item, statMapper, onClose }: Props) {
  // selected – IDs of stats the user wants to filter on.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<Record<string, { value?: string; min?: string; max?: string }>>({});
  const { settings } = useOptions();

  /** Resolve stat_id → property key understood by trade site */
  const getPropertyKey = (id: number, stat: Stat): string =>
    statMapper?.(id, stat) || statIdToProperty[id] || `stat_${id}`;

  const getStatKey = (stat: Stat): string => {
    if ('skill' in stat && stat.skill) return `skill:${stat.skill.toLowerCase()}`;
    return `id:${stat.stat_id}`;
  };

  const updateFilter = (
    key: string,
    field: "value" | "min" | "max",
    val: string
  ) =>
    setFilters((f) => ({
      ...f,
      [key]: { ...f[key], [field]: val },
    }));


  // sort once with useMemo so it’s cheap
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

    return [...item.stats,...baseStats].sort((a, b) => {
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



  /** Build ProjectDiablo2 trade URL */
  const tradeUrl = useMemo(() => {
    const searchParams = new URLSearchParams();

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
      } else if (stat.stat_id !== undefined) {
        propKey = getPropertyKey(stat.stat_id, stat);
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
      if (item.quality === ItemQuality.Rare) {
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
    searchParams.set("is_hardcore", `${(settings.mode === 'softcore')}`);
    searchParams.set("is_ladder", `${(settings.ladder === 'ladder')}`);

    return `https://www.projectdiablo2.com/market/archive?${searchParams.toString()}`;
  }, [selected, filters, item, statMapper]);




  /** -------------------
   *  Render
   *  -----------------*/
  return (
    <Card className="w-[34rem] max-h-[92vh] shadow-2xl bg-neutral-900/95 border-neutral-700">
      {/* Header */}
      <div className={'flex flex-col gap-1'}>
        <CardHeader className="flex flex-row items-start gap-4 justify-between">
          <div className={'flex flex-col'}>
            <CardTitle
              className={`flex-1 text-xl font-bold flex items-center gap-2 ${qualityColor(item.quality)}`}
              style={{ fontFamily: 'DiabloFont' }}
            >
              {item.isRuneword ? item.runeword : item.name}
              {item.isRuneword && <Badge>Runeword</Badge>}
            </CardTitle>
            {item.type && <div className={'text-gray-500'}>{item.type}</div>}
            {item.defense && <div className={'text-sm'}>Defense: {item.defense} </div>}
          </div>

          <Button variant="ghost"
            size="icon"
            onClick={onClose}
            className="self-start">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
      </div>

      {/* Body */}
      <CardContent className="space-y-4">
        <ScrollArea className="h-72 pr-2">
          <div className="space-y-2">
            {sortedStats.map((s) => (
              <StatRow
                toggle={toggle}
                key={getStatKey(s)}
                stat={s}
                nested={false}
                updateFilter={updateFilter}
                filters={filters}
                selected={selected}
              />
            ))}
          </div>
        </ScrollArea>
        {/* Search button */}
        <Button
          className="w-full mt-2"
          onClick={() => {
            if (tradeUrl) window.open(tradeUrl, '_blank');
          }}
        >
          Search ({selected.size})
        </Button>
      </CardContent>
    </Card>
  );
}


function getTypeFromBaseType(baseType: string): { type: string, base: string } | undefined {
  const baseName = baseType.toLowerCase();

  const matchedType = itemTypes.find(type =>
    type.bases.some(b => b.label.toLowerCase() === baseName)
  );

  if (!matchedType) return;

  const base = matchedType.bases.find(b => b.label.toLowerCase() === baseName);
  
  return {type: matchedType.typeValue, base: base.value};
}