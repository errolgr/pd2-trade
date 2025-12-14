import { openWindowAtCursor } from '@/lib/window';
import { encodeItemForQuickList, isStashItem } from '@/lib/item-utils';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { SettingsIcon, LuggageIcon, SquareArrowOutUpRight, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { qualityColor } from '../lib/qualityColor';
import { StatRow } from './StatRow';
import { useOptions } from '@/hooks/useOptions';
import { openUrl } from '@/lib/browser-opener';
import { Props } from '../lib/types';
import { useEconomyData } from '../hooks/useEconomyData';
import { useStatSelection } from '../hooks/useStatSelection';
import { buildGetMarketListingQuery, buildTradeUrl } from '../lib/tradeUrlBuilder';
import { RunePricePopover } from './RunePricePopover';
import { getStatKey } from '../lib/utils';
import moment from 'moment';
import { HoverPopover } from '@/components/custom/hover-popover';
import { useItems } from '@/hooks/useItems';
import { MarketListingEntry, MarketListingResult } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { emit } from '@/lib/browser-events';
import { Label } from '@/components/ui/label';
import { ButtonGroup } from '@/components/ui/button-group';
import { openCenteredWindow } from '@/lib/window';
import { itemTypes } from '@/common/item-types';
import { ItemQuality } from '@/common/types/Item';
import { incrementMetric, distributionMetric } from '@/lib/sentryMetrics';

export default function ItemOverlayWidget({ item, statMapper, onClose }: Props) {
  const { settings } = useOptions();
  const { getMarketListings, getMarketListingsArchive } = usePd2Website();
  const { findOneByName } = useItems();

  // Use custom hooks for state management
  const { loading, calculatedRuneValues, selectedRuneBreakdown, selectedRuneCombinations, setSelectedRuneBreakdown } =
    useEconomyData();

  const {
    selected,
    filters,
    sortedStats,
    updateFilter,
    setSelected,
    setFilters,
    toggle,
    corruptedState,
    setCorruptedState,
  } = useStatSelection(item);

  const pd2Item = useMemo(() => findOneByName(item.name, item.quality), [item, findOneByName]);

  // Market listings state
  const [marketListingsResult, setMarketListingsResult] = useState<MarketListingResult | null>(null);
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketError, setMarketError] = useState<string | null>(null);
  const [searchArchived, setSearchArchived] = useState(false);

  // Search mode: 0 = category (base), 1 = typeLabel
  const [searchMode, setSearchMode] = useState(0);

  // Find the matched item type entry
  const matchedItemType = useMemo(() => {
    if (!item.type) return null;
    return itemTypes.find((type) => type.bases.some((b) => b.label.toLowerCase() === item.type.toLowerCase()));
  }, [item.type]);

  // Check if item should use toggle (only for base item qualities, not uniques/sets/runewords)
  const shouldUseToggle = useMemo(() => {
    return (
      item.quality === ItemQuality.Rare ||
      item.quality === ItemQuality.Magic ||
      item.quality === ItemQuality.Crafted ||
      item.quality === ItemQuality.Normal ||
      item.quality === ItemQuality.Superior
    );
  }, [item.quality]);

  /** Build ProjectDiablo2 trade URL */
  const tradeUrl = useMemo(() => {
    // Only use searchMode for items that support toggle, otherwise use default (0)
    const effectiveSearchMode = shouldUseToggle ? searchMode : 0;
    return buildTradeUrl(
      item,
      pd2Item,
      selected,
      filters,
      settings,
      statMapper,
      effectiveSearchMode,
      matchedItemType,
      searchArchived,
      corruptedState,
    );
  }, [
    selected,
    filters,
    item,
    statMapper,
    settings,
    pd2Item,
    searchMode,
    matchedItemType,
    shouldUseToggle,
    searchArchived,
    corruptedState,
  ]);

  const pd2MarketQuery = useMemo(() => {
    // Only use searchMode for items that support toggle, otherwise use default (0)
    const effectiveSearchMode = shouldUseToggle ? searchMode : 0;
    return buildGetMarketListingQuery(
      item,
      pd2Item,
      selected,
      filters,
      settings,
      statMapper,
      searchArchived,
      effectiveSearchMode,
      matchedItemType,
      corruptedState,
    );
  }, [
    selected,
    filters,
    item,
    statMapper,
    settings,
    searchArchived,
    pd2Item,
    searchMode,
    matchedItemType,
    shouldUseToggle,
    corruptedState,
  ]);

  useEffect(() => {
    if (item) {
      // clear market listing result if new item is loaded
      setMarketListingsResult(null);
      setSelected(new Set());
      setFilters({});
      setSearchMode(0); // Reset to default mode
      setCorruptedState(0); // Reset corrupted state to default (both)
    }
  }, [item, setSelected, setFilters, setCorruptedState]);

  // Toggle search mode (only for items that support toggle)
  const toggleSearchMode = useCallback(() => {
    if (!shouldUseToggle) return; // Don't toggle for uniques/sets/runewords
    setSearchMode((prev) => {
      // Cycle through: 0 -> 1 -> 0
      // Skip mode 1 if there's no matched item type
      let next = (prev + 1) % 2;
      if (next === 1 && !matchedItemType) {
        next = 0;
      }
      return next;
    });
  }, [matchedItemType, shouldUseToggle]);

  // Get display text for current search mode
  const getSearchModeDisplay = useCallback(() => {
    switch (searchMode) {
      case 0:
        return `Base: ${item.type}`;
      case 1:
        return matchedItemType ? `Type: ${matchedItemType.typeLabel}` : `Base: ${item.type}`;
      default:
        return `Base: ${item.type}`;
    }
  }, [searchMode, item.type, matchedItemType]);

  const openCurrencyValuation = useCallback(async () => {
    await openCenteredWindow('Currency', '/currency', {
      decorations: false,
      focus: true,
      shadow: false,
      width: 640,
      height: 870,
      alwaysOnTop: true,
      skipTaskbar: true,
    });
  }, []);

  const openListWindow = useCallback(async () => {
    const raw = JSON.stringify(item);
    const encodedItem = encodeItemForQuickList(raw);
    const quickListLabel = 'QuickList';
    const safeEncodedItem = encodeURIComponent(encodedItem);

    try {
      // Check if window exists
      const existingWin = await WebviewWindow.getByLabel(quickListLabel);

      if (existingWin) {
        try {
          await existingWin.unminimize();
          await existingWin.show();
          await existingWin.setFocus();
          await existingWin.emit('quick-list-new-item', safeEncodedItem);
          return;
        } catch (err) {
          console.warn('[ItemOverlay] Failed to reuse QuickList window, attempting to recreate:', err);
          try {
            await existingWin.close();
          } catch (closeErr) {
            console.warn('[ItemOverlay] Failed to close zombie window:', closeErr);
          }
        }
      }

      await openWindowAtCursor(quickListLabel, `/quick-list?item=${safeEncodedItem}`, {
        decorations: false,
        transparent: true,
        focus: false,
        shadow: false,
        skipTaskbar: true,
        focusable: true,
        width: 600,
        height: 512,
        resizable: true,
        alwaysOnTop: true,
      });
    } catch (err) {
      console.error('[ItemOverlay] Failed to open QuickList:', err);
    }
  }, [item]);

  const openSettingsPage = useCallback(async () => {
    await emit('open-settings', undefined);
  }, []);

  /** -------------------
   *  Render
   *  -----------------*/
  return (
    <Card className="w-screen h-screen shadow-2xl bg-neutral-900/95 border-neutral-700 rounded-none">
      {/* Top Bar */}
      <div
        data-tauri-drag-region
        id="titlebar-drag-handle"
        className="flex items-center justify-between border-neutral-700 bg-neutral-800/50"
      >
        {/* Rune Information Popover */}
        <div className="flex flex-row items-center">
          <RunePricePopover
            loading={loading}
            calculatedRuneValues={calculatedRuneValues}
            selectedRuneBreakdown={selectedRuneBreakdown}
            selectedRuneCombinations={selectedRuneCombinations}
            onRuneBreakdownSelect={setSelectedRuneBreakdown}
          />
          <Button variant="ghost"
            size="icon"
            onClick={openCurrencyValuation}
            className="self-start h-7 w-7">
            <LuggageIcon className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-row items-center">
          <Button variant="ghost"
            size="icon"
            onClick={openSettingsPage}
            className="self-start h-7 w-7">
            <SettingsIcon className="h-2 w-2" />
          </Button>

          <Button variant="ghost"
            size="icon"
            onClick={onClose}
            className="self-start h-7 w-7">
            <X className="h-2 w-2" />
          </Button>
        </div>
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
            {item.type && (
              <div
                className={`text-lg text-gray-300 ${shouldUseToggle ? 'cursor-pointer hover:text-gray-100 transition-colors' : ''}`}
                style={{ fontFamily: 'DiabloFont', marginTop: '-5px' }}
                onClick={shouldUseToggle ? toggleSearchMode : undefined}
                title={shouldUseToggle ? 'Click to toggle search mode' : undefined}
              >
                {shouldUseToggle ? getSearchModeDisplay() : `Base: ${item.type}`}
              </div>
            )}

            {item.defense && (
              <Badge variant="outline"
                className={'text-sm border-gray-300 text-gray-300 rounded-lg mt-1'}>
                Defense: {item.defense}{' '}
              </Badge>
            )}
          </div>
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
                corruptedState={corruptedState}
              />
            ))}
          </div>
        </ScrollArea>
        {/* Search button */}
        <div className="flex flex-col gap-2">
          <div className="flex flex-row gap-2 w-full mt-2">
            <ButtonGroup>
              <Button
                variant="secondary"
                className=""
                onClick={async () => {
                  setMarketError(null);
                  setMarketLoading(true);
                  setMarketListingsResult(null);
                  const startTime = performance.now();
                  try {
                    const result = searchArchived
                      ? await getMarketListingsArchive(pd2MarketQuery)
                      : await getMarketListings(pd2MarketQuery);
                    const duration = performance.now() - startTime;
                    setMarketListingsResult(result);

                    incrementMetric('item_overlay.market_search', 1, {
                      status: 'success',
                      archived: searchArchived.toString(),
                      search_mode: shouldUseToggle ? searchMode.toString() : '0',
                    });
                    distributionMetric('item_overlay.market_search_duration_ms', duration);
                    distributionMetric('item_overlay.market_search_results_count', result.total);
                    distributionMetric('item_overlay.market_search_results_returned', result.data.length);
                  } catch (e: any) {
                    const duration = performance.now() - startTime;
                    incrementMetric('item_overlay.market_search', 1, {
                      status: 'error',
                      archived: searchArchived.toString(),
                      search_mode: shouldUseToggle ? searchMode.toString() : '0',
                    });
                    distributionMetric('item_overlay.market_search_duration_ms', duration);
                    console.log(e.message || 'Failed to fetch market listings');
                    setMarketError(e.message || 'Failed to fetch market listings');
                  } finally {
                    setMarketLoading(false);
                  }
                }}
              >
                Search
              </Button>
              <Button
                variant="secondary"
                className="flex flex-row justify-center gap-2 px-3"
                onClick={() => {
                  if (tradeUrl) {
                    incrementMetric('item_overlay.trade_url_opened', 1, {
                      archived: searchArchived.toString(),
                      search_mode: shouldUseToggle ? searchMode.toString() : '0',
                    });
                    openUrl(tradeUrl);
                  }
                }}
              >
                <SquareArrowOutUpRight className="w-4 h-4" />
              </Button>
            </ButtonGroup>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      variant="secondary"
                      className="flex flex-row justify-center gap-2"
                      onClick={openListWindow}
                      disabled={!isStashItem(item)}
                    >
                      List
                    </Button>
                  </span>
                </TooltipTrigger>
                {!isStashItem(item) && (
                  <TooltipContent side="top">
                    <p>Item must be in your shared stash to list.</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex flex-row items-center gap-2 mt-1">
            <Switch
              id="archived-toggle"
              checked={searchArchived}
              onCheckedChange={(checked) => {
                setSearchArchived(checked);
              }}
            />
            <Label htmlFor="archived-toggle"
              className="text-sm text-gray-300">
              Show Expired
            </Label>
          </div>
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
                  <tr>
                    <td colSpan={2}
                      className="px-2 py-2 text-center text-gray-400">
                      No listings found
                    </td>
                  </tr>
                )}
                {marketListingsResult.data.map((listing: MarketListingEntry, idx: number) => (
                  <tr key={listing._id || idx}
                    className={idx % 2 === 0 ? 'bg-neutral-800' : ''}>
                    <td className="px-2 py-1 flex flex-row items-center">
                      {listing.hr_price ? (
                        `${listing.hr_price} HR`
                      ) : listing.price && listing.price.length > 40 ? (
                        <HoverPopover
                          content={
                            <Card>
                              <div className="text-sm max-w-xs break-words p-2">{listing.price}</div>
                            </Card>
                          }
                        >
                          <span className="cursor-pointer underline decoration-dotted">
                            {listing.price.slice(0, 40)}...
                          </span>
                        </HoverPopover>
                      ) : (
                        listing.price || '-'
                      )}
                      {/* Red dot for corruption with hover popover */}
                      {listing.item?.corruptions?.length > 0 && (
                        <HoverPopover
                          content={
                            <Card>
                              <div className="text-xs p-2">
                                <div className="font-bold mb-1 text-red-500">Corruptions:</div>
                                <ul className="list-disc pl-4">
                                  {listing.item.modifiers?.filter((mod: any) => mod.corrupted).length > 0
                                    ? listing.item.modifiers
                                        .filter((mod: any) => mod.corrupted)
                                        .map((mod: any, i: number) =>
                                          mod.name === 'item_numsockets' ? (
                                            <li key={i}>{`Sockets ${listing.item.socket_count}`}</li>
                                          ) : (
                                            <li key={i}>{mod.label}</li>
                                          ),
                                        )
                                    : listing.item.corruptions.map((c: string, i: number) =>
                                        c === 'item_numsockets' ? (
                                          <li key={i}>{`Sockets ${listing.item.socket_count}`}</li>
                                        ) : (
                                          <li key={i}>{c}</li>
                                        ),
                                      )}
                                </ul>
                              </div>
                            </Card>
                          }
                        >
                          <span className="inline-block align-middle ml-2 w-2 h-2 rounded-full bg-red-500 cursor-pointer" />
                        </HoverPopover>
                      )}
                    </td>
                    <td className="px-2 py-1">{listing.bumped_at ? moment(listing.bumped_at).fromNow() : '-'}</td>
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
