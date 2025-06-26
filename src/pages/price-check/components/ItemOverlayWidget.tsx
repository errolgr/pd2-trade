import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SquareArrowOutUpRight, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { qualityColor } from "../lib/qualityColor";
import { StatRow } from "./StatRow";
import { useOptions } from "@/hooks/useOptions";
import { openUrl } from '@tauri-apps/plugin-opener';
import { Props } from "../lib/types";
import { useRuneData } from "../hooks/useRuneData";
import { useStatSelection } from "../hooks/useStatSelection";
import { buildGetMarketListingByStashItemQuery, buildGetMarketListingQuery, buildTradeUrl } from "../lib/tradeUrlBuilder";
import { RunePricePopover } from "./RunePricePopover";
import { getStatKey } from "../lib/utils";
import moment from 'moment';
import { HoverPopover } from '@/components/custom/hover-popover';
import { useItems } from "@/hooks/useItems";
import { MarketListingEntry, MarketListingResult } from "@/common/types/pd2-website/GetMarketListingsResponse";
import { usePd2Website } from "@/hooks/pd2website/usePD2Website";

export default function ItemOverlayWidget({ item, statMapper, onClose }: Props) {
  const { settings } = useOptions();
  const { getMarketListings, authData } = usePd2Website();
  const { findOneByName } = useItems();

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

  const pd2Item = useMemo(() => findOneByName(item.name), [item])

  /** Build ProjectDiablo2 trade URL */
  const tradeUrl = useMemo(() => {
    return buildTradeUrl(item, pd2Item, selected, filters, settings, statMapper);
  }, [selected, filters, item, statMapper, settings, pd2Item]);

  const pd2MarketQuery = useMemo(() => {
    return buildGetMarketListingQuery(item, pd2Item, selected, filters, settings, statMapper);
  }, [selected, filters, item, statMapper, settings]);
  

  // Market listings state
  const [marketListingsResult, setMarketListingsResult] = useState<MarketListingResult | null>(null);
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketError, setMarketError] = useState<string | null>(null);

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
            {item.type && <div
                className={'text-lg text-gray-300'}               
                style={{ fontFamily: 'DiabloFont', marginTop: '-5px'}}>
                  {item.type}
              </div>
              }

            
            {item.defense && <Badge variant='outline' className={'text-sm border-gray-300 text-gray-300 rounded-lg mt-1'}>Defense: {item.defense} </Badge>}
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
        <div className="flex flex-row gap-2">
        <Button
          className="w-full mt-2"
          onClick={async () => {
            setMarketError(null);
            setMarketLoading(true);
            setMarketListingsResult(null);
            try {
              const result = await getMarketListings(pd2MarketQuery);
              setMarketListingsResult(result);
            } catch (e: any) {
              setMarketError(e.message || 'Failed to fetch market listings');
            } finally {
              setMarketLoading(false);
            }
          }}
        >
          Search ({selected.size})
        </Button>
        <Button
          className="w-40 mt-2 flex flex-row justify-center gap-2"
          onClick={() => {
            if (tradeUrl) openUrl(tradeUrl);
          }}
        >
          Trade
          <SquareArrowOutUpRight className="w-4 h-4"/>
        </Button>
        </div>

        {/* Market listings table */}
        {marketLoading && <div className="text-center text-sm text-gray-400">Loading market listings...</div>}
        {marketError && <div className="text-center text-sm text-red-400">{marketError}</div>}
        {marketListingsResult && (
          <div className="overflow-x-auto mt-2">
            <div className="mb-2 text-xs text-gray-400">Matches: {marketListingsResult.total}</div>
            <table className="min-w-full text-sm text-left">
              <thead>
                <tr>
                  <th className="px-2 py-1 border-b border-neutral-700">Price</th>
                  <th className="px-2 py-1 border-b border-neutral-700">Listed</th>
                </tr>
              </thead>
              <tbody>
                {marketListingsResult.data.length === 0 && (
                  <tr><td colSpan={2} className="px-2 py-2 text-center text-gray-400">No listings found</td></tr>
                )}
                {marketListingsResult.data.map((listing: MarketListingEntry, idx: number) => (
                  <tr key={listing._id || idx} className={idx % 2 === 0 ? 'bg-neutral-800' : ''}>
                    <td className="px-2 py-1">
                      {listing.hr_price ? (
                        `${listing.hr_price} HR`
                      ) : listing.price && listing.price.length > 40 ? (
                        <HoverPopover content={<Card><div className="text-sm max-w-xs break-words p-2">{listing.price}</div></Card>}>
                          <span className="cursor-pointer underline decoration-dotted">
                            {listing.price.slice(0, 40)}...
                          </span>
                        </HoverPopover>
                      ) : (
                        listing.price || '-'
                      )}
                    </td>
                    <td className="px-2 py-1">
                      {listing.bumped_at ? moment(listing.bumped_at).fromNow() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}