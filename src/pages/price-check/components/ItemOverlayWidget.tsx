import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { qualityColor } from "../lib/qualityColor";
import { StatRow } from "./StatRow";
import { useOptions } from "@/hooks/useOptions";
import { openUrl } from '@tauri-apps/plugin-opener';
import { Props } from "../lib/types";
import { useRuneData } from "../hooks/useRuneData";
import { useStatSelection } from "../hooks/useStatSelection";
import { buildTradeUrl } from "../lib/tradeUrlBuilder";
import { RunePricePopover } from "./RunePricePopover";
import { getStatKey } from "../lib/utils";

export default function ItemOverlayWidget({ item, statMapper, onClose }: Props) {
  const { settings } = useOptions();
  
  // Use custom hooks for state management
  const {
    loadingRunes,
    calculatedRuneValues,
    selectedRuneBreakdown,
    selectedRuneCombinations,
    setSelectedRuneBreakdown
  } = useRuneData();

  const {
    selected,
    filters,
    sortedStats,
    updateFilter,
    toggle
  } = useStatSelection(item);

  /** Build ProjectDiablo2 trade URL */
  const tradeUrl = useMemo(() => {
    return buildTradeUrl(item, selected, filters, settings, statMapper);
  }, [selected, filters, item, statMapper, settings]);

  /** -------------------
   *  Render
   *  -----------------*/
  return (
    <Card className="w-screen h-screen shadow-2xl bg-neutral-900/95 border-neutral-700 rounded-none">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-neutral-700 bg-neutral-800/50">
        {/* Rune Information Popover */}
        <RunePricePopover
          loadingRunes={loadingRunes}
          calculatedRuneValues={calculatedRuneValues}
          selectedRuneBreakdown={selectedRuneBreakdown}
          selectedRuneCombinations={selectedRuneCombinations}
          onRuneBreakdownSelect={setSelectedRuneBreakdown}
        />
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