import React, {useCallback, useMemo, useState, useEffect} from "react";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {X, ArrowRightLeft} from "lucide-react";
import {ScrollArea} from "@/components/ui/scroll-area";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
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
import {classSkillNameToIdMap, classSubSkillNameToIdMap} from "@/assets/class-skills";
import { openUrl } from '@tauri-apps/plugin-opener';
import { cn } from "@/lib/utils";

// Rune name to API identifier mapping
const RUNE_API_MAP: Record<string, string> = {
  "El Rune": "el-rune",
  "Eld Rune": "eld-rune", 
  "Tir Rune": "tir-rune",
  "Nef Rune": "nef-rune",
  "Eth Rune": "eth-rune",
  "Ith Rune": "ith-rune",
  "Tal Rune": "tal-rune",
  "Ral Rune": "ral-rune",
  "Ort Rune": "ort-rune",
  "Thul Rune": "thul-rune",
  "Amn Rune": "amn-rune",
  "Sol Rune": "sol-rune",
  "Shael Rune": "shael-rune",
  "Dol Rune": "dol-rune",
  "Hel Rune": "hel-rune",
  "Io Rune": "io-rune",
  "Lum Rune": "lum-rune",
  "Ko Rune": "ko-rune",
  "Fal Rune": "fal-rune",
  "Lem Rune": "lem-rune",
  "Pul Rune": "pul-rune",
  "Um Rune": "um-rune",
  "Mal Rune": "mal-rune",
  "Ist Rune": "ist-rune",
  "Gul Rune": "gul-rune",
  "Vex Rune": "vex-rune",
  "Ohm Rune": "ohm-rune",
  "Lo Rune": "lo-rune",
  "Sur Rune": "sur-rune",
  "Ber Rune": "ber-rune",
  "Jah Rune": "jah-rune",
  "Cham Rune": "cham-rune",
  "Zod Rune": "zod-rune"
};

interface RuneData {
  itemName: string;
  proper: string;
  dataByIngestionDate: Array<{
    date: string;
    trueDate: string;
    numListings: number;
    price: number;
  }>;
}

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
  const [runeData, setRuneData] = useState<Record<string, RuneData>>({});
  const [loadingRunes, setLoadingRunes] = useState(false);
  const [selectedRuneBreakdown, setSelectedRuneBreakdown] = useState<string | null>(null);
  const { settings } = useOptions();

  // Fetch rune data when component mounts
  useEffect(() => {
    const fetchRuneData = async () => {
      setLoadingRunes(true);
      const runePromises = Object.entries(RUNE_API_MAP).map(async ([runeName, apiId]) => {
        try {
          const response = await fetch(`https://api.pd2.tools/api/economy/item?item=${apiId}`);
          if (response.ok) {
            const data = await response.json();
            return [runeName, data];
          }
        } catch (error) {
          console.error(`Failed to fetch data for ${runeName}:`, error);
        }
        return [runeName, null];
      });

      const results = await Promise.all(runePromises);
      const runeDataMap: Record<string, RuneData> = {};
      results.forEach(([runeName, data]) => {
        if (data) {
          runeDataMap[runeName as string] = data as RuneData;
        }
      });
      setRuneData(runeDataMap);
      setLoadingRunes(false);
    };

    fetchRuneData();
  }, []);

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


  // sort once with useMemo so it's cheap
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
        const classEntry = classSkillNameToIdMap[stat.skill.toLowerCase()];
        if (classEntry) {
          propKey = `item_addclassskills{${classEntry.id}}`;
        }
        const subClassEntry = classSubSkillNameToIdMap[stat.skill.toLowerCase()];
        if (subClassEntry) {
          propKey = `item_addskill_tab{${subClassEntry.id}}`;
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
  }, [selected, filters, item, statMapper]);

  // Get latest rune data for display
  const getLatestRuneData = (runeName: string) => {
    const data = runeData[runeName];
    if (!data || !data.dataByIngestionDate.length) return null;
    return data.dataByIngestionDate[data.dataByIngestionDate.length - 1];
  };

  // Sort runes by price for display
  const sortedRunes = useMemo(() => {
    return Object.keys(RUNE_API_MAP)
      .map(runeName => ({
        name: runeName,
        data: getLatestRuneData(runeName)
      }))
      .filter(rune => rune.data !== null)
      .sort((a, b) => (b.data?.price || 0) - (a.data?.price || 0));
  }, [runeData]);

  // Calculate rune values with cascading pricing for low listings
  const calculatedRuneValues = useMemo(() => {
    const runeValues: Array<{
      name: string;
      price: number;
      numListings: number;
      isCalculated: boolean;
      originalPrice?: number;
    }> = [];

    sortedRunes.forEach((rune, index) => {
      const data = rune.data;
      if (!data) return;

      if (data.numListings >= 10) {
        // Use actual price if 10+ listings
        runeValues.push({
          name: rune.name,
          price: data.price,
          numListings: data.numListings,
          isCalculated: false
        });
      } else {
        // Use cascading pricing for low listings
        let calculatedPrice = data.price;
        let isCalculated = false;
        let originalPrice = data.price;

        // Look for the next rune above (regardless of listings) to calculate from
        if (index > 0) {
          const aboveRune = sortedRunes[index - 1];
          if (aboveRune.data) {
            // Get the price of the rune above (whether calculated or actual)
            const aboveRunePrice = runeValues.find(r => r.name === aboveRune.name)?.price || aboveRune.data.price;
            calculatedPrice = aboveRunePrice * 0.5;
            isCalculated = true;
          }
        }

        runeValues.push({
          name: rune.name,
          price: calculatedPrice,
          numListings: data.numListings,
          isCalculated,
          originalPrice
        });
      }
    });

    return runeValues;
  }, [sortedRunes]);

  // Calculate breakdown combinations for a selected rune
  const getRuneBreakdown = (targetRuneName: string) => {
    const targetRune = calculatedRuneValues.find(r => r.name === targetRuneName);
    if (!targetRune) return [];

    const targetValue = targetRune.price;
    const combinations: Array<{
      runes: Array<{ name: string; price: number; count: number }>;
      totalValue: number;
      difference: number;
    }> = [];

    // Get all runes with lower or equal value
    const availableRunes = calculatedRuneValues
      .filter(r => r.price <= targetValue && r.name !== targetRuneName)
      .sort((a, b) => b.price - a.price);

    // Simple combination finder - try different combinations
    const findCombinations = (currentRunes: Array<{ name: string; price: number; count: number }>, remainingValue: number, startIndex: number) => {
      if (remainingValue <= 0.1) { // Allow small difference for rounding
        const totalValue = currentRunes.reduce((sum, r) => sum + (r.price * r.count), 0);
        combinations.push({
          runes: [...currentRunes],
          totalValue,
          difference: Math.abs(targetValue - totalValue)
        });
        return;
      }

      for (let i = startIndex; i < availableRunes.length; i++) {
        const rune = availableRunes[i];
        const maxCount = Math.floor(remainingValue / rune.price);
        
        for (let count = 1; count <= maxCount && count <= 3; count++) { // Limit to 3 of same rune
          const newRemaining = remainingValue - (rune.price * count);
          const existingRuneIndex = currentRunes.findIndex(r => r.name === rune.name);
          
          if (existingRuneIndex >= 0) {
            currentRunes[existingRuneIndex].count += count;
          } else {
            currentRunes.push({ name: rune.name, price: rune.price, count });
          }
          
          findCombinations(currentRunes, newRemaining, i + 1);
          
          if (existingRuneIndex >= 0) {
            currentRunes[existingRuneIndex].count -= count;
            if (currentRunes[existingRuneIndex].count <= 0) {
              currentRunes.splice(existingRuneIndex, 1);
            }
          } else {
            currentRunes.pop();
          }
        }
      }
    };

    findCombinations([], targetValue, 0);

    // Sort by difference (closest matches first) and limit results
    return combinations
      .sort((a, b) => a.difference - b.difference)
      .slice(0, 5); // Show top 5 combinations
  };

  const selectedRuneCombinations = useMemo(() => {
    if (!selectedRuneBreakdown) return [];
    return getRuneBreakdown(selectedRuneBreakdown);
  }, [selectedRuneBreakdown, calculatedRuneValues]);

  /** -------------------
   *  Render
   *  -----------------*/
  return (
    <Card className="w-screen h-screen shadow-2xl bg-neutral-900/95 border-neutral-700 rounded-none">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-neutral-700 bg-neutral-800/50">
        {/* Rune Information Popover */}
        
        <Popover>
          <PopoverTrigger>
            <Button variant="ghost" size="sm" className="flex items-center gap-2 h-6">
              <ArrowRightLeft className="h-2 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 overflow-y-auto">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Current Rune Prices</h4>
              {loadingRunes ? (
                <div className="text-sm text-gray-500">Loading rune data...</div>
              ) : (
                <div className="space-y-1">
                  {calculatedRuneValues.map((rune) => (
                    <div key={rune.name} className="flex justify-between items-center text-sm">
                      <button
                        onClick={() => setSelectedRuneBreakdown(selectedRuneBreakdown === rune.name ? null : rune.name)}
                        className={cn(
                          "font-medium text-left hover:text-blue-400 transition-colors",
                          selectedRuneBreakdown === rune.name && "text-blue-400"
                        )}
                      >
                        {rune.name}
                      </button>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "font-medium",
                          rune.isCalculated ? "text-yellow-500" : "text-green-500"
                        )}>
                          {rune.price} HR
                          {rune.isCalculated && <span className="text-xs ml-1">*</span>}
                        </span>
                        <span className="text-gray-500 text-xs">
                          ({rune.numListings} listings)
                        </span>
                      </div>
                    </div>
                  ))}
                  
                  {/* Breakdown combinations */}
                  {selectedRuneBreakdown && selectedRuneCombinations.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-600">
                      <h5 className="font-semibold text-sm mb-2">
                        {selectedRuneBreakdown} Breakdown:
                      </h5>
                      <div className="space-y-2">
                        {selectedRuneCombinations.map((combo, index) => (
                          <div key={index} className="text-xs bg-gray-800 p-2 rounded">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-gray-300">
                                {combo.runes.map(r => `${r.count}x ${r.name}`).join(" + ")}
                              </span>
                              <span className="text-green-400">
                                = {combo.totalValue.toFixed(1)} HR
                              </span>
                            </div>
                            {combo.difference > 0.1 && (
                              <div className="text-gray-500">
                                Diff: {combo.difference.toFixed(1)} HR
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {calculatedRuneValues.some(r => r.isCalculated) && (
                    <div className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-600">
                      * Calculated as 0.5x the value of the rune above (when &lt;10 listings)
                    </div>
                  )}
                  
                  {/* Attribution */}
                  <div className="text-xs text-gray-500 mt-3 pt-2 border-t border-gray-600 text-center">
                    Powered by <a href="https://pd2.tools" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">pd2.tools</a>
                  </div>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>

      </div>

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
        <ScrollArea className="pr-2">
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
            if (tradeUrl) openUrl(tradeUrl);
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