import { openWindowAtCursor } from '@/lib/window';
import { encodeItemForQuickList, isStashItem } from '@/lib/item-utils';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { useInView } from 'react-intersection-observer';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { SettingsIcon, LuggageIcon, SquareArrowOutUpRight, X, ArrowLeftRight, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { qualityColor } from '../lib/qualityColor';
import { StatRow } from './StatRow';
import { useOptions } from '@/hooks/useOptions';
import { openUrl } from '@/lib/browser-opener';
import { Props } from '../lib/types';
import { useEconomyData } from '../hooks/useEconomyData';
import { useStatSelection } from '../hooks/useStatSelection';
import ItemStatsDisplay from '../../quick-list/components/ItemStatsDisplay';
import { buildGetMarketListingQuery, buildTradeUrl } from '../lib/tradeUrlBuilder';
import { RunePricePopover } from './RunePricePopover';
import { getStatKey } from '../lib/utils';
import moment from 'moment';
import { HoverPopover } from '@/components/custom/hover-popover';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { useItems } from '@/hooks/useItems';
import { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { emit } from '@/lib/browser-events';
import { getSeasonDateConfig } from '@/lib/seasons';
import { Label } from '@/components/ui/label';
import { ButtonGroup } from '@/components/ui/button-group';
import { openCenteredWindow } from '@/lib/window';
import { itemTypes } from '@/common/item-types';
import { ItemQuality } from '@/common/types/Item';
import { incrementMetric, distributionMetric } from '@/lib/sentryMetrics';
import { WindowTitles, WindowLabels } from '@/lib/window-titles';
import {
  fetchItemPrice,
  fetchItemPriceByName,
  fetchCorruptionPrices,
  AveragePriceResponse,
  CorruptionPricesResponse,
} from '@/pages/currency/lib/price-api';
import { statIdToProperty, getStatIdForCorruptionStatKey, StatId } from '../lib/stat-mappings';
import { cubeCorruptions } from '@/assets/cube-corruptions';

export default function ItemOverlayWidget({ item, statMapper, onClose }: Props) {
  const { settings, isLoading: settingsLoading } = useOptions();
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
  const [marketListings, setMarketListings] = useState<MarketListingEntry[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketError, setMarketError] = useState<string | null>(null);
  const [searchArchived, setSearchArchived] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [triggerCorruptionSearch, setTriggerCorruptionSearch] = useState(false);
  const [triggerSocketSearch, setTriggerSocketSearch] = useState(false);
  const [selectedCorruptionNames, setSelectedCorruptionNames] = useState<string[]>([]);
  const ITEMS_PER_PAGE = 20;

  // Average price state for unique items
  const [averagePriceData, setAveragePriceData] = useState<AveragePriceResponse | null>(null);
  const [averagePriceLoading, setAveragePriceLoading] = useState(false);
  const [averagePriceError, setAveragePriceError] = useState<string | null>(null);

  // Corruption prices state
  const [corruptionPrices, setCorruptionPrices] = useState<CorruptionPricesResponse | null>(null);
  const [corruptionPricesLoading, setCorruptionPricesLoading] = useState(false);
  const [showAllCorruptions, setShowAllCorruptions] = useState(false);

  const { ref: loaderRef, inView } = useInView({
    threshold: 0,
    rootMargin: '100px',
  });

  // Search mode: 0 = category (base), 1 = typeLabel
  const [searchMode, setSearchMode] = useState(0);
  // Quality override: null = use item's original quality
  const [qualityOverride, setQualityOverride] = useState<ItemQuality | null>(null);

  /**
   * Extract Rainbow Facet data from item stats
   */
  const extractRainbowFacetData = useCallback(() => {
    // Check if this is a Rainbow Facet - be robust with the name check
    const isFacet =
      item.name?.toLowerCase().includes('rainbow facet') ||
      pd2Item?.key === 'Rainbow Facet' ||
      pd2Item?.name === 'Rainbow Facet';

    if (!isFacet) {
      return null;
    }

    if (!item.stats || item.stats.length === 0) {
      return null;
    }

    // Find damage type modifier to determine type
    // IDs: 48 (fire), 50 (light), 54 (cold), 57 (pois)
    const damageTypeStat = item.stats.find(
      (s) =>
        s.stat_id === 48 || // firemindam
        s.stat_id === 50 || // lightmindam
        s.stat_id === 54 || // coldmindam
        s.stat_id === 57, // poisonmindam
    );

    if (!damageTypeStat) {
      // Try finding by name if ID fails
      const damageTypeStatByName = item.stats.find(
        (s) =>
          s.name?.toLowerCase().includes('fire damage') ||
          s.name?.toLowerCase().includes('lightning damage') ||
          s.name?.toLowerCase().includes('cold damage') ||
          s.name?.toLowerCase().includes('poison damage'),
      );
      if (!damageTypeStatByName) return null;

      // Map name back to type
      let damageType = '';
      let elementSuffix = '';
      if (damageTypeStatByName.name?.toLowerCase().includes('fire')) {
        damageType = 'fire';
        elementSuffix = 'fire';
      } else if (damageTypeStatByName.name?.toLowerCase().includes('lightning')) {
        damageType = 'lightning';
        elementSuffix = 'ltng';
      } else if (damageTypeStatByName.name?.toLowerCase().includes('cold')) {
        damageType = 'cold';
        elementSuffix = 'cold';
      } else if (damageTypeStatByName.name?.toLowerCase().includes('poison')) {
        damageType = 'poison';
        elementSuffix = 'pois';
      }

      if (!damageType) return null;

      // Find mastery and pierce by name
      const masteryStat = item.stats.find(
        (s) => s.name?.toLowerCase().includes('skill damage') && s.name?.toLowerCase().includes(damageType),
      );
      const pierceStat = item.stats.find(
        (s) => s.name?.toLowerCase().includes('enemy') && s.name?.toLowerCase().includes(damageType),
      );

      return {
        damageType,
        damagePercent: masteryStat?.value ?? 0,
        piercePercent: Math.abs(pierceStat?.value ?? 0),
      };
    }

    const damageTypeMap: Record<number, string> = {
      48: 'fire',
      50: 'lightning',
      54: 'cold',
      57: 'poison',
    };

    const elementSuffixMap: Record<number, string> = {
      48: 'fire',
      50: 'ltng',
      54: 'cold',
      57: 'pois',
    };

    const damageType = damageTypeMap[damageTypeStat.stat_id];
    const elementSuffix = elementSuffixMap[damageTypeStat.stat_id];

    if (!damageType || !elementSuffix) return null;

    // Mastery IDs: 329 (fire), 330 (ltng), 331 (cold), 332 (pois)
    const masteryStatIdMap: Record<string, number> = {
      fire: 329,
      ltng: 330,
      cold: 331,
      pois: 332,
    };
    const masteryStatId = masteryStatIdMap[elementSuffix];

    // Pierce IDs: 333 (fire), 334 (ltng), 335 (cold), 336 (pois)
    const pierceStatIdMap: Record<string, number> = {
      fire: 333,
      ltng: 334,
      cold: 335,
      pois: 336,
    };
    const pierceStatId = pierceStatIdMap[elementSuffix];

    const masteryStat =
      item.stats.find((s) => s.stat_id === masteryStatId) ||
      item.stats.find(
        (s) => s.name?.toLowerCase().includes('skill damage') && s.name?.toLowerCase().includes(damageType),
      );

    const pierceStat =
      item.stats.find((s) => s.stat_id === pierceStatId) ||
      item.stats.find((s) => s.name?.toLowerCase().includes('enemy') && s.name?.toLowerCase().includes(damageType));

    const result = {
      damageType,
      damagePercent: masteryStat?.value ?? 0,
      piercePercent: Math.abs(pierceStat?.value ?? 0),
    };
    console.log('[ItemOverlayWidget] Extracted Rainbow Facet data:', result);
    return result;
  }, [item.name, item.stats, pd2Item]);

  /**
   * Get the display name for the item
   */
  const displayTitle = useMemo(() => {
    if (item.isRuneword) return item.runeword;

    const facetData = extractRainbowFacetData();
    if (facetData) {
      const type = facetData.damageType.charAt(0).toUpperCase() + facetData.damageType.slice(1);
      return `${type} Facet ${facetData.damagePercent}/${facetData.piercePercent}`;
    }

    return item.name;
  }, [item.isRuneword, item.runeword, item.name, extractRainbowFacetData]);

  /**
   * Get the icon filename for the current item
   */
  const getItemIcon = useCallback(() => {
    if (!pd2Item?.image?.invfile) return '';

    const facetData = extractRainbowFacetData();
    if (facetData) {
      const facetIconMap: Record<string, string> = {
        fire: 'invgswe5',
        poison: 'invgswe4',
        cold: 'invgswe2',
        lightning: 'invgswe3',
      };
      return facetIconMap[facetData.damageType] || pd2Item.image.invfile;
    }

    return pd2Item.image.invfile;
  }, [pd2Item, extractRainbowFacetData]);

  /**
   * Get the PD2Trader URL for the current item
   */
  const getPd2TraderUrl = useCallback(() => {
    // Only for unique and set items
    if ((item.quality !== ItemQuality.Unique && item.quality !== ItemQuality.Set) || !pd2Item?.name) {
      return '';
    }

    const facetData = extractRainbowFacetData();
    let baseCode = '';

    if (facetData) {
      baseCode = `rainbow_facet_${facetData.damageType}_${facetData.damagePercent}_${facetData.piercePercent}`;
    } else if (averagePriceData?.baseCode) {
      baseCode = averagePriceData.baseCode;
    } else {
      // Normalize the item name (matches server logic for unique/set items)
      baseCode = pd2Item.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    }

    return `https://pd2trader.com/item/${baseCode}`;
  }, [item.quality, pd2Item?.name, averagePriceData, extractRainbowFacetData]);

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

  const availableQualities = useMemo(() => {
    if (!shouldUseToggle) return [];
    return [ItemQuality.Normal, ItemQuality.Superior, ItemQuality.Magic, ItemQuality.Rare, ItemQuality.Crafted].filter(
      (q) => q !== item.quality,
    );
  }, [item.quality, shouldUseToggle]);

  const cycleQuality = useCallback(() => {
    if (availableQualities.length === 0) return;
    setQualityOverride((prev) => {
      if (prev === null) return availableQualities[0];
      const idx = availableQualities.indexOf(prev);
      if (idx === -1 || idx === availableQualities.length - 1) return null;
      return availableQualities[idx + 1];
    });
  }, [availableQualities]);

  const effectiveQuality = qualityOverride ?? item.quality;

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
      shouldUseToggle ? effectiveQuality : undefined,
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
    effectiveQuality,
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
      ITEMS_PER_PAGE,
      page * ITEMS_PER_PAGE,
      selectedCorruptionNames.length > 0 ? selectedCorruptionNames : undefined,
      shouldUseToggle ? effectiveQuality : undefined,
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
    page,
    selectedCorruptionNames,
    effectiveQuality,
  ]);

  useEffect(() => {
    if (item) {
      // clear market listing result if new item is loaded
      setMarketListings([]);
      setTotalCount(0);
      setPage(0);
      setHasMore(false);
      setSelected(new Set());
      setFilters({});
      setSearchMode(0); // Reset to default mode
      setQualityOverride(null); // Reset quality override
      setCorruptedState(0); // Reset corrupted state to default (both)
      setSelectedCorruptionNames([]); // Clear selected corruptions
      // Clear average price data when item or its stats change
      setAveragePriceData(null);
      setAveragePriceError(null);
      // Clear corruption prices
      setCorruptionPrices(null);
      setShowAllCorruptions(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.name, item?.quality, item?.stats, extractRainbowFacetData]);

  // Fetch average price for unique items
  useEffect(() => {
    const fetchAveragePrice = async () => {
      // Only fetch for unique and set items
      if ((item.quality !== ItemQuality.Unique && item.quality !== ItemQuality.Set) || !pd2Item?.name) {
        return;
      }

      setAveragePriceLoading(true);
      setAveragePriceError(null);

      try {
        // Convert settings to API format
        const isLadder = settings.ladder === 'ladder';
        const isHardcore = settings.mode === 'hardcore';
        const seasonConfig = getSeasonDateConfig(settings.selectedSeasonId);
        const priceConfig = {
          isLadder,
          isHardcore,
          ...seasonConfig,
          ...(!seasonConfig.startDate && !seasonConfig.endDate ? { hours: 168 } : {}),
        };

        let priceData: AveragePriceResponse | null;
        const facetData = extractRainbowFacetData();

        if (facetData) {
          // For Rainbow Facets, create baseCode with damage type and percentages
          // Format: "rainbow_facet_{damageType}_{damagePercent}_{piercePercent}"
          const baseCode = `rainbow_facet_${facetData.damageType}_${facetData.damagePercent}_${facetData.piercePercent}`;
          console.log('[ItemOverlayWidget] Fetching price for Rainbow Facet baseCode:', baseCode);
          priceData = await fetchItemPrice(baseCode, priceConfig);
        } else {
          priceData = await fetchItemPriceByName(pd2Item.name, priceConfig);
        }

        if (priceData) {
          setAveragePriceData(priceData);
          setAveragePriceLoading(false);
        } else {
          setAveragePriceError('No price data available');
          setAveragePriceLoading(false);
        }
      } catch (error: any) {
        console.error('[ItemOverlayWidget] Error fetching average price:', error);
        setAveragePriceError(error.message || 'Failed to fetch price data');
        setAveragePriceLoading(false);
      }
    };

    fetchAveragePrice();
  }, [
    item.quality,
    item.stats,
    pd2Item?.name,
    settings.ladder,
    settings.mode,
    settings.selectedSeasonId,
    extractRainbowFacetData,
  ]);

  // Fetch corruption prices when average price data is available
  useEffect(() => {
    const fetchCorruptionData = async () => {
      // Only fetch for unique and set items with price data
      if (
        (item.quality !== ItemQuality.Unique && item.quality !== ItemQuality.Set) ||
        !pd2Item?.name ||
        !averagePriceData
      ) {
        return;
      }

      setCorruptionPricesLoading(true);

      try {
        const isLadder = settings.ladder === 'ladder';
        const isHardcore = settings.mode === 'hardcore';
        const seasonConfig = getSeasonDateConfig(settings.selectedSeasonId);
        const priceConfig = {
          isLadder,
          isHardcore,
          ...seasonConfig,
          ...(!seasonConfig.startDate && !seasonConfig.endDate ? { hours: 168 } : {}),
        };

        let corruptionData;
        const facetData = extractRainbowFacetData();

        if (facetData) {
          const baseCode = `rainbow_facet_${facetData.damageType}_${facetData.damagePercent}_${facetData.piercePercent}`;
          console.log('[ItemOverlayWidget] Fetching corruption prices for Rainbow Facet baseCode:', baseCode);
          corruptionData = await fetchCorruptionPrices({ baseCode }, priceConfig);
        } else {
          corruptionData = await fetchCorruptionPrices({ itemName: pd2Item.name }, priceConfig);
        }

        if (corruptionData) {
          setCorruptionPrices(corruptionData);
        }
      } catch (error: any) {
        console.error('[ItemOverlayWidget] Error fetching corruption prices:', error);
      } finally {
        setCorruptionPricesLoading(false);
      }
    };

    fetchCorruptionData();
  }, [
    item.quality,
    item.stats,
    pd2Item?.name,
    averagePriceData,
    settings.ladder,
    settings.mode,
    extractRainbowFacetData,
  ]);

  // Helper function to format corruption name the same way the server does
  const formatCorruptionName = useCallback((corruptionNames: string[]): string => {
    return corruptionNames
      .map((c) => {
        let formatted = c.trim();
        formatted = formatted.replace(/^item_/, '');
        formatted = formatted.replace(/_/g, ' ');
        formatted = formatted
          .split(' ')
          .map((word) => {
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
          })
          .join(' ');
        return formatted;
      })
      .join(', ');
  }, []);

  // Get item's corruptions using stat_id 360/361 to look up in cube-corruptions.ts
  const itemCorruptions = useMemo(() => {
    if (!item.stats) return null;
    if ((item.quality !== ItemQuality.Unique && item.quality !== ItemQuality.Set) || !pd2Item) return null;

    console.log(pd2Item);
    // Look for stat_id 360 or 361 (corruption flags)
    const corruptionStat = item.stats.find((stat) => stat.stat_id === 360);
    if (!corruptionStat || corruptionStat.value === undefined) {
      console.log('[ItemOverlayWidget] No corruption stat found (360/361)');
      return null;
    }

    // The value corresponds to the 'key' field in cube-corruptions.ts
    const corruptionKey = corruptionStat.value;
    const cubeCorruption = cubeCorruptions.find((corruption) => corruption.key === corruptionKey);
    if (!cubeCorruption) {
      console.warn('[ItemOverlayWidget] Corruption key not found:', corruptionKey);
      return null;
    }

    // Map corruption stats to property names
    const itemCorruptionNames: string[] = [];

    cubeCorruption.stats.forEach((corruptionStat) => {
      // Skip transform_dye stats
      if (corruptionStat.stat === 'dye') {
        return;
      }

      // Get stat_id for this corruption stat key
      const statId = getStatIdForCorruptionStatKey(corruptionStat.stat);
      if (statId !== null) {
        // Map stat_id to property name using statIdToProperty
        const propertyName = statIdToProperty[statId];
        if (propertyName) {
          // Normalize property name (ensure it starts with "item_")
          const normalizedName = propertyName.startsWith('item_') ? propertyName : `item_${propertyName}`;
          itemCorruptionNames.push(normalizedName);
        }
      } else {
        // If not found, log a warning
        console.warn('[ItemOverlayWidget] Could not find stat_id for corruption stat:', corruptionStat.stat);
      }
    });

    if (itemCorruptionNames.length === 0) {
      console.warn('[ItemOverlayWidget] No corruption names mapped from stats');
      return null;
    }

    // Sort and format the same way the server does
    const sortedCorruptions = [...itemCorruptionNames].sort();
    const formattedCorruptionName = formatCorruptionName(sortedCorruptions);

    // Format each property name individually for partial matching
    const formattedPropertyNames = sortedCorruptions.map((name) => {
      let formatted = name.trim();
      formatted = formatted.replace(/^item_/, '');
      formatted = formatted.replace(/_/g, ' ');
      formatted = formatted
        .split(' ')
        .map((word) => {
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(' ');
      return formatted;
    });

    // Debug logging
    console.log('[ItemOverlayWidget] Item corruptions:', {
      corruptionStat: {
        stat_id: corruptionStat.stat_id,
        value: corruptionStat.value,
      },
      cubeCorruption: {
        id: cubeCorruption.id,
        key: cubeCorruption.key,
        stats: cubeCorruption.stats,
      },
      itemCorruptionNames,
      sortedCorruptions,
      formattedCorruptionName,
      formattedPropertyNames,
      availableCorruptions: corruptionPrices?.corruptionPrices?.map((c) => c.corruptionName) || [],
    });

    // Find matching corruption price - match by comparing corruptionKey arrays
    const matchingCorruption = corruptionPrices?.corruptionPrices?.find((corruption) => {
      // Compare the sorted corruption key arrays
      if (!corruption.corruptionKey || corruption.corruptionKey.length !== sortedCorruptions.length) {
        return false;
      }
      // Sort both arrays and compare element by element
      const sortedItemKey = [...sortedCorruptions].sort();
      const sortedApiKey = [...corruption.corruptionKey].sort();
      return sortedItemKey.every((key, index) => key === sortedApiKey[index]);
    });

    // Return the corruption data even if no price is found
    return {
      corruptionName: formattedCorruptionName,
      corruptionKey: sortedCorruptions,
      cubeCorruption,
      priceData: matchingCorruption || null,
    };
  }, [item.stats, item.quality, corruptionPrices, formatCorruptionName, pd2Item]);

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
    const currencyLabel = WindowLabels.Currency;

    try {
      // Check if window exists
      const existingWin = await WebviewWindow.getByLabel(currencyLabel);

      if (existingWin) {
        try {
          await existingWin.unminimize();
          await existingWin.show();
          await existingWin.setFocus();
          return;
        } catch (err) {
          console.warn('[ItemOverlay] Failed to reuse Currency window, attempting to recreate:', err);
          try {
            await existingWin.close();
          } catch (closeErr) {
            console.warn('[ItemOverlay] Failed to close zombie window:', closeErr);
          }
        }
      }

      await openCenteredWindow(currencyLabel, '/currency', {
        title: WindowTitles.Currency,
        decorations: false,
        focus: true,
        shadow: false,
        width: 640,
        height: 870,
        alwaysOnTop: true,
        skipTaskbar: true,
      });
    } catch (err) {
      console.error('[ItemOverlay] Failed to open Currency window:', err);
    }
  }, []);

  const openListWindow = useCallback(async () => {
    const raw = JSON.stringify(item);
    const encodedItem = encodeItemForQuickList(raw);
    const quickListLabel = WindowLabels.QuickList;
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

  const fetchListings = useCallback(
    async (isNewSearch: boolean = false) => {
      if (settingsLoading) return;
      setMarketError(null);
      setMarketLoading(true);
      const startTime = performance.now();

      try {
        const result = searchArchived
          ? await getMarketListingsArchive(pd2MarketQuery)
          : await getMarketListings(pd2MarketQuery);

        const duration = performance.now() - startTime;

        if (isNewSearch) {
          setMarketListings(result.data);
          setTotalCount(result.total);
          setPage(0);
        } else {
          setMarketListings((prev) => {
            // Filter duplicates
            const existingIds = new Set(prev.map((l) => l._id));
            const newItems = result.data.filter((l) => !existingIds.has(l._id));
            return [...prev, ...newItems];
          });
        }

        setHasMore(result.data.length === ITEMS_PER_PAGE);

        incrementMetric('item_overlay.market_search', 1, {
          status: 'success',
          archived: searchArchived.toString(),
          search_mode: shouldUseToggle ? searchMode.toString() : '0',
          page: isNewSearch ? '0' : page.toString(),
        });
        distributionMetric('item_overlay.market_search_duration_ms', duration);
        if (isNewSearch) {
          distributionMetric('item_overlay.market_search_results_count', result.total);
        }
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
    },
    [
      pd2MarketQuery,
      getMarketListings,
      getMarketListingsArchive,
      searchArchived,
      searchMode,
      shouldUseToggle,
      page,
      settingsLoading,
    ],
  );

  // Initial Search / Reset
  const handleSearch = () => {
    // Clear corruption names filter when manually searching
    setSelectedCorruptionNames([]);
    if (page === 0) {
      fetchListings(true);
    } else {
      setPage(0);
      // Wait for state to update so pd2MarketQuery reflects page 0
      setTimeout(() => fetchListings(true), 0);
    }
  };

  // Helper function to check if two corruption key arrays are equal
  const areCorruptionKeysEqual = useCallback((key1: string[], key2: string[]): boolean => {
    if (key1.length !== key2.length) return false;
    const sorted1 = [...key1].sort();
    const sorted2 = [...key2].sort();
    return sorted1.every((key, index) => key === sorted2[index]);
  }, []);

  // Handle corruption click - search for items with that specific corruption
  const handleCorruptionClick = useCallback(
    (corruptionKey: string | string[]) => {
      // Clear existing selections and add the corruption property names to the array for direct filtering
      setSelected(new Set());
      setFilters({});
      setSelectedCorruptionNames(Array.isArray(corruptionKey) ? corruptionKey : [corruptionKey]); // Set the corruption property names to filter by
      setCorruptedState(1); // Set to corrupted only
      setSearchArchived(true); // Enable expired listings
      // Don't set page to 0 here - let the trigger handle it to avoid conflicts
      setTriggerCorruptionSearch(true); // Trigger search after state updates
    },
    [corruptionPrices, itemCorruptions],
  );

  // Handle socket count click - update socket filter and trigger search
  const handleSocketClick = useCallback(
    (socketCount: number, corruptionKey: string[]) => {
      // Find the socket stat in sortedStats
      const socketStat = sortedStats.find((s) => s.stat_id === StatId.Socket);
      if (!socketStat) {
        console.warn('[ItemOverlayWidget] Socket stat not found');
        return;
      }

      const socketKey = getStatKey(socketStat);

      // Set socket filter to exact count (min and max both equal to socketCount)
      setFilters((f) => ({
        ...f,
        [socketKey]: { min: String(socketCount), max: String(socketCount) },
      }));

      // Ensure socket stat is selected
      setSelected((prev) => {
        const next = new Set(prev);
        next.add(socketKey);
        return next;
      });

      // Set the numsockets corruption key filter
      setSelectedCorruptionNames(corruptionKey);

      // Don't set page to 0 here - let the trigger handle it to avoid conflicts
      setTriggerSocketSearch(true); // Trigger search after state updates
    },
    [sortedStats],
  );

  // Trigger search when corruption search is requested
  useEffect(() => {
    if (triggerCorruptionSearch) {
      setTriggerCorruptionSearch(false);
      setPage(0); // Reset to first page before searching
      // Use setTimeout to ensure state updates are applied
      setTimeout(() => {
        fetchListings(true);
      }, 0);
    }
  }, [triggerCorruptionSearch, fetchListings]);

  // Trigger search when socket search is requested
  useEffect(() => {
    if (triggerSocketSearch) {
      setTriggerSocketSearch(false);
      setPage(0); // Reset to first page before searching
      // Use setTimeout to ensure state updates are applied
      setTimeout(() => {
        fetchListings(true);
      }, 0);
    }
  }, [triggerSocketSearch, fetchListings]);

  // We need to distinguish between "page changed because of scroll" vs "reset to 0"
  // Let's simplify: Search button resets everything and fetches page 0.
  // Scroll increments page.
  // pd2MarketQuery updates when page changes.

  useEffect(() => {
    // If page > 0, it means we scrolled.
    // Don't trigger if we're doing a corruption or socket search (triggers handle that)
    if (page > 0 && !triggerCorruptionSearch && !triggerSocketSearch) {
      fetchListings(false);
    }
  }, [page, fetchListings, triggerCorruptionSearch]);

  // Trigger infinite scroll
  useEffect(() => {
    if (inView && !marketLoading && hasMore) {
      setPage((prev) => prev + 1);
    }
  }, [inView, marketLoading, hasMore]);

  const openSettingsPage = useCallback(async () => {
    await emit('open-settings', undefined);
  }, []);

  /** -------------------
   *  Render
   *  -----------------*/
  return (
    <Card className="w-screen h-screen shadow-2xl bg-neutral-900/95 border-neutral-700 rounded-none flex flex-col">
      {/* Top Bar */}
      <div
        data-tauri-drag-region
        id="titlebar-drag-handle"
        className="flex items-center justify-between border-neutral-700 bg-neutral-800/50 flex-none"
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
      <div className={'flex flex-col gap-1 flex-none'}>
        <CardHeader className="flex flex-row items-start gap-4 justify-between">
          <div className={'flex flex-col'}>
            <CardTitle
              className={`flex-1 text-xl font-bold flex items-center gap-2 ${qualityColor(item.quality)}`}
              style={{ fontFamily: 'DiabloFont' }}
            >
              {displayTitle}
              {item.isRuneword && <Badge>Runeword</Badge>}
            </CardTitle>
            {item.type && (
              <div className="flex items-center gap-2"
                style={{ marginTop: '-5px' }}>
                <div
                  className={`text-lg text-gray-300 ${shouldUseToggle ? 'cursor-pointer hover:text-gray-100 transition-colors' : ''}`}
                  style={{ fontFamily: 'DiabloFont' }}
                  onClick={shouldUseToggle ? toggleSearchMode : undefined}
                  title={shouldUseToggle ? 'Click to toggle search mode' : undefined}
                >
                  {shouldUseToggle ? getSearchModeDisplay() : `Base: ${item.type}`}
                </div>
                {shouldUseToggle && (
                  <>
                    <span className="text-lg text-gray-500">|</span>
                    <span
                      className={`text-lg cursor-pointer hover:opacity-80 transition-opacity ${qualityColor(effectiveQuality)}`}
                      style={{ fontFamily: 'DiabloFont' }}
                      onClick={cycleQuality}
                      title="Click to cycle quality"
                    >
                      {effectiveQuality}
                    </span>
                  </>
                )}
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

        {/* Average Price Information for Unique Items - Compact */}
        {(item.quality === ItemQuality.Unique || item.quality === ItemQuality.Set) && (
          <div className="px-6 pb-4 -mt-4">
            {averagePriceLoading && (
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading price data...</span>
              </div>
            )}
            {averagePriceError && !averagePriceLoading && (
              <div className="text-xs text-red-400">{averagePriceError}</div>
            )}
            {averagePriceData && !averagePriceLoading && getItemIcon() && (
              <div className="inline-block">
                <HoverPopover
                  content={
                    <Card className="p-3 bg-neutral-950 border-neutral-700 w-[400px]">
                      <div className="space-y-2 text-sm">
                        <div className="font-semibold text-white mb-2 flex items-center justify-between">
                          <span>{displayTitle}</span>
                          <span
                            className="text-[10px] text-blue-400 hover:text-blue-300 cursor-pointer underline flex items-center gap-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              openUrl(getPd2TraderUrl());
                            }}
                          >
                            View on Web
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-gray-400">Average:</span>
                            <span className="ml-2 text-white">{averagePriceData.movingAverage7Days.toFixed(2)} HR</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Median:</span>
                            <span className="ml-2 font-semibold text-white">
                              {averagePriceData.medianPrice.toFixed(2)} HR
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400">Min:</span>
                            <span className="ml-2 text-white">{averagePriceData.minPrice.toFixed(2)} HR</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Max:</span>
                            <span className="ml-2 text-white">{averagePriceData.maxPrice.toFixed(2)} HR</span>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-neutral-700 space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Samples:</span>
                            <span className="text-white">{averagePriceData.sampleCount}</span>
                          </div>
                          {averagePriceData.priceChange7Days && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">7d Change:</span>
                              <span
                                className={
                                  averagePriceData.priceChange7Days.change >= 0 ? 'text-green-400' : 'text-red-400'
                                }
                              >
                                {averagePriceData.priceChange7Days.change >= 0 ? '+' : ''}
                                {averagePriceData.priceChange7Days.changePercent.toFixed(1)}%
                              </span>
                            </div>
                          )}
                        </div>
                        {/* Item's Corruption Price - Display separately if matched */}
                        {itemCorruptions && (
                          <div className="pt-2 border-t border-neutral-700">
                            <div className="text-xs font-semibold text-red-400 mb-2">This Item&apos;s Corruption</div>
                            <div className="space-y-1">
                              {(() => {
                                const corruption = itemCorruptions;
                                const priceData = corruption.priceData;
                                const hasSocketPrices = priceData?.socketPrices && priceData.socketPrices.length > 0;
                                // Use the actual corruptionName from the API if available, otherwise use the formatted name
                                const displayName = priceData?.corruptionName || corruption.corruptionName;
                                const isTruncated = displayName.length > 40;
                                const truncatedName = isTruncated ? displayName.substring(0, 40) : displayName;

                                const corruptionNameElement = isTruncated ? (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="text-red-300 pr-2 cursor-help border-b border-dotted border-red-500 truncate block max-w-[250px]">
                                          {truncatedName}
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="text-xs">{displayName}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                ) : (
                                  <span className="text-red-300 pr-2 truncate block max-w-[250px]">
                                    {truncatedName}
                                  </span>
                                );

                                const corruptionRow = (
                                  <div className="flex justify-between items-center text-xs w-full min-w-0">
                                    <div className="min-w-0 flex-1 overflow-hidden">{corruptionNameElement}</div>
                                    {priceData ? (
                                      <div className="flex items-center gap-2 flex-shrink-0">
                                        <span className="text-gray-500 text-[10px]">({priceData.sampleCount})</span>
                                        <span className="font-semibold">{priceData.medianPrice.toFixed(2)} HR</span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2 flex-shrink-0">
                                        <span className="text-gray-500 text-[10px]">No price data</span>
                                      </div>
                                    )}
                                  </div>
                                );

                                // Check if this corruption is currently selected
                                const isSelected =
                                  selectedCorruptionNames.length > 0 &&
                                  areCorruptionKeysEqual(corruption.corruptionKey, selectedCorruptionNames);

                                const clickableWrapper = (
                                  <div
                                    className={`cursor-pointer rounded px-1 -mx-1 ${
                                      isSelected
                                        ? 'bg-blue-600/30 border border-blue-500/50'
                                        : 'hover:bg-neutral-800/30'
                                    }`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCorruptionClick(corruption.corruptionKey);
                                    }}
                                    title="Click to search for items with this corruption"
                                  >
                                    {corruptionRow}
                                  </div>
                                );

                                if (hasSocketPrices && priceData) {
                                  return (
                                    <HoverPopover
                                      side="bottom"
                                      content={
                                        <Card className="p-3 bg-neutral-950 border-neutral-700 min-w-[200px]">
                                          <div className="text-[10px] text-gray-400 mb-1 flex items-center justify-between">
                                            <span>{displayTitle}</span>
                                            <span
                                              className="text-blue-400 hover:text-blue-300 cursor-pointer underline"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                openUrl(getPd2TraderUrl());
                                              }}
                                            >
                                              Link
                                            </span>
                                          </div>
                                          <div className="text-xs font-semibold text-gray-300 mb-2">
                                            {displayName} - Socket Prices
                                          </div>
                                          <div className="space-y-1">
                                            {priceData.socketPrices!.map((socketPrice, socketIdx) => (
                                              <div
                                                key={socketIdx}
                                                className="flex justify-between items-center text-xs cursor-pointer hover:bg-neutral-800/50 rounded px-2 py-1 -mx-2 -my-1"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleSocketClick(socketPrice.socketCount, corruption.corruptionKey);
                                                }}
                                                title="Click to filter by this socket count"
                                              >
                                                <span className="text-gray-400">
                                                  {socketPrice.socketCount} Socket
                                                  {socketPrice.socketCount !== 1 ? 's' : ''}
                                                </span>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                  <span className="text-gray-500 text-[10px]">
                                                    ({socketPrice.sampleCount})
                                                  </span>
                                                  <span className="text-white font-semibold">
                                                    {socketPrice.medianPrice.toFixed(2)} HR
                                                  </span>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </Card>
                                      }
                                    >
                                      {clickableWrapper}
                                    </HoverPopover>
                                  );
                                }

                                return clickableWrapper;
                              })()}
                            </div>
                          </div>
                        )}
                        {/* Corruption Prices */}
                        {corruptionPrices && corruptionPrices.corruptionPrices.length > 0 && (
                          <div className="pt-2 border-t border-neutral-700">
                            <div className="text-xs font-semibold text-gray-300 mb-2">Top Corruptions</div>
                            {showAllCorruptions ? (
                              <ScrollArea className="h-[200px] w-full overflow-x-hidden">
                                <div className="space-y-1 w-full overflow-x-hidden">
                                  {corruptionPrices.corruptionPrices
                                    .filter((corruption) => {
                                      // Filter out the item's corruption if it matches
                                      return (
                                        !itemCorruptions || corruption.corruptionName !== itemCorruptions.corruptionName
                                      );
                                    })
                                    .map((corruption, idx) => {
                                      const hasSocketPrices =
                                        corruption.socketPrices && corruption.socketPrices.length > 0;
                                      const isTruncated = corruption.corruptionName.length > 40;
                                      const truncatedName = isTruncated
                                        ? corruption.corruptionName.substring(0, 40)
                                        : corruption.corruptionName;

                                      const corruptionNameElement = isTruncated ? (
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <span className="text-gray-400 pr-2 cursor-help border-b border-dotted border-gray-500 truncate block max-w-[250px]">
                                                {truncatedName}
                                              </span>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              <p className="text-xs">{corruption.corruptionName}</p>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      ) : (
                                        <span className="text-gray-400 pr-2 truncate block max-w-[250px]">
                                          {truncatedName}
                                        </span>
                                      );

                                      const corruptionRow = (
                                        <div className="flex justify-between items-center text-xs w-full min-w-0">
                                          <div className="min-w-0 flex-1 overflow-hidden">{corruptionNameElement}</div>
                                          <div className="flex items-center gap-2 flex-shrink-0">
                                            <span className="text-gray-500 text-[10px]">
                                              ({corruption.sampleCount})
                                            </span>
                                            <span className="text-white font-semibold">
                                              {corruption.medianPrice.toFixed(2)} HR
                                            </span>
                                          </div>
                                        </div>
                                      );

                                      // Check if this corruption is currently selected
                                      const isSelected =
                                        selectedCorruptionNames.length > 0 &&
                                        areCorruptionKeysEqual(corruption.corruptionKey, selectedCorruptionNames);

                                      const clickableWrapper = (
                                        <div
                                          key={idx}
                                          className={`cursor-pointer rounded px-1 -mx-1 ${
                                            isSelected
                                              ? 'bg-blue-600/30 border border-blue-500/50'
                                              : 'hover:bg-neutral-800/30'
                                          }`}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleCorruptionClick(corruption.corruptionKey);
                                          }}
                                          title="Click to search for items with this corruption"
                                        >
                                          {corruptionRow}
                                        </div>
                                      );

                                      if (hasSocketPrices) {
                                        return (
                                          <HoverPopover
                                            key={idx}
                                            side="bottom"
                                            content={
                                              <Card className="p-3 bg-neutral-950 border-neutral-700 min-w-[200px]">
                                                <div className="text-[10px] text-gray-400 mb-1 flex items-center justify-between">
                                                  <span>{displayTitle}</span>
                                                  <span
                                                    className="text-blue-400 hover:text-blue-300 cursor-pointer underline"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      openUrl(getPd2TraderUrl());
                                                    }}
                                                  >
                                                    Link
                                                  </span>
                                                </div>
                                                <div className="text-xs font-semibold text-gray-300 mb-2">
                                                  {corruption.corruptionName} - Socket Prices
                                                </div>
                                                <div className="space-y-1">
                                                  {corruption.socketPrices!.map((socketPrice, socketIdx) => (
                                                    <div
                                                      key={socketIdx}
                                                      className="flex justify-between items-center text-xs cursor-pointer hover:bg-neutral-800/50 rounded px-2 py-1 -mx-2 -my-1"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleSocketClick(
                                                          socketPrice.socketCount,
                                                          corruption.corruptionKey,
                                                        );
                                                      }}
                                                      title="Click to filter by this socket count"
                                                    >
                                                      <span className="text-gray-400">
                                                        {socketPrice.socketCount} Socket
                                                        {socketPrice.socketCount !== 1 ? 's' : ''}
                                                      </span>
                                                      <div className="flex items-center gap-2 flex-shrink-0">
                                                        <span className="text-gray-500 text-[10px]">
                                                          ({socketPrice.sampleCount})
                                                        </span>
                                                        <span className="text-white font-semibold">
                                                          {socketPrice.medianPrice.toFixed(2)} HR
                                                        </span>
                                                      </div>
                                                    </div>
                                                  ))}
                                                </div>
                                              </Card>
                                            }
                                          >
                                            {clickableWrapper}
                                          </HoverPopover>
                                        );
                                      }

                                      return clickableWrapper;
                                    })}
                                </div>
                              </ScrollArea>
                            ) : (
                              <div className="space-y-1 w-full overflow-x-hidden">
                                {corruptionPrices.corruptionPrices
                                  .filter((corruption) => {
                                    // Filter out the item's corruption if it matches
                                    return (
                                      !itemCorruptions || corruption.corruptionName !== itemCorruptions.corruptionName
                                    );
                                  })
                                  .slice(0, 5)
                                  .map((corruption, idx) => {
                                    const hasSocketPrices =
                                      corruption.socketPrices && corruption.socketPrices.length > 0;
                                    const isTruncated = corruption.corruptionName.length > 40;
                                    const truncatedName = isTruncated
                                      ? corruption.corruptionName.substring(0, 40)
                                      : corruption.corruptionName;

                                    const corruptionNameElement = isTruncated ? (
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <span className="text-gray-400 pr-2 cursor-help border-b border-dotted border-gray-500 truncate block max-w-[150px]">
                                              {truncatedName}
                                            </span>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p className="text-xs">{corruption.corruptionName}</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    ) : (
                                      <span className="text-gray-400 pr-2 truncate block max-w-[250px]">
                                        {truncatedName}
                                      </span>
                                    );

                                    const corruptionRow = (
                                      <div className="flex justify-between items-center text-xs w-full min-w-0">
                                        <div className="min-w-0 flex-1 overflow-hidden">{corruptionNameElement}</div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                          <span className="text-gray-500 text-[10px]">({corruption.sampleCount})</span>
                                          <span className="text-white font-semibold">
                                            {corruption.medianPrice.toFixed(2)} HR
                                          </span>
                                        </div>
                                      </div>
                                    );

                                    // Check if this corruption is currently selected
                                    const isSelected =
                                      selectedCorruptionNames.length > 0 &&
                                      areCorruptionKeysEqual(corruption.corruptionKey, selectedCorruptionNames);

                                    const clickableWrapper = (
                                      <div
                                        key={idx}
                                        className={`cursor-pointer rounded px-1 -mx-1 ${
                                          isSelected
                                            ? 'bg-blue-600/30 border border-blue-500/50'
                                            : 'hover:bg-neutral-800/30'
                                        }`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCorruptionClick(corruption.corruptionKey);
                                        }}
                                        title="Click to search for items with this corruption"
                                      >
                                        {corruptionRow}
                                      </div>
                                    );

                                    if (hasSocketPrices) {
                                      return (
                                        <HoverPopover
                                          key={idx}
                                          side="bottom"
                                          content={
                                            <Card className="p-3 bg-neutral-950 border-neutral-700 min-w-[200px]">
                                              <div className="text-xs font-semibold text-gray-300 mb-2">
                                                {corruption.corruptionName} - Socket Prices
                                              </div>
                                              <div className="space-y-1">
                                                {corruption.socketPrices!.map((socketPrice, socketIdx) => (
                                                  <div
                                                    key={socketIdx}
                                                    className="flex justify-between items-center text-xs cursor-pointer hover:bg-neutral-800/50 rounded px-2 py-1 -mx-2 -my-1"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleSocketClick(
                                                        socketPrice.socketCount,
                                                        corruption.corruptionKey,
                                                      );
                                                    }}
                                                    title="Click to filter by this socket count"
                                                  >
                                                    <span className="text-gray-400">
                                                      {socketPrice.socketCount} Socket
                                                      {socketPrice.socketCount !== 1 ? 's' : ''}
                                                    </span>
                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                      <span className="text-gray-500 text-[10px]">
                                                        ({socketPrice.sampleCount})
                                                      </span>
                                                      <span className="text-white font-semibold">
                                                        {socketPrice.medianPrice.toFixed(2)} HR
                                                      </span>
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            </Card>
                                          }
                                        >
                                          {clickableWrapper}
                                        </HoverPopover>
                                      );
                                    }

                                    return clickableWrapper;
                                  })}
                              </div>
                            )}
                            {(() => {
                              const filteredCorruptions = corruptionPrices.corruptionPrices.filter((corruption) => {
                                return !itemCorruptions || corruption.corruptionName !== itemCorruptions.corruptionName;
                              });
                              const remainingCount = filteredCorruptions.length;
                              const showCount = showAllCorruptions ? remainingCount : Math.min(5, remainingCount);

                              return (
                                remainingCount > showCount && (
                                  <button
                                    onClick={() => setShowAllCorruptions(!showAllCorruptions)}
                                    className="mt-2 text-xs text-gray-400 hover:text-gray-300 underline focus:outline-none focus-visible:outline-none focus:ring-0"
                                  >
                                    {showAllCorruptions ? 'Show Less' : `Show More (${remainingCount - 5} more)`}
                                  </button>
                                )
                              );
                            })()}
                          </div>
                        )}
                        {corruptionPricesLoading && (
                          <div className="pt-2 border-t border-neutral-700 text-xs text-gray-400">
                            Loading corruption prices...
                          </div>
                        )}
                      </div>
                    </Card>
                  }
                >
                  <div className="flex items-center gap-2 cursor-pointer bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 transition-colors">
                    <img
                      src={`https://pd2trader.com/assets/items/${getItemIcon()}.png`}
                      alt={item.name}
                      className="h-10"
                      onError={(e) => {
                        // Fallback if image fails to load
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <ArrowLeftRight className="w-4 h-4 text-gray-400" />
                    <span className="font-semibold text-white text-sm">
                      {averagePriceData.movingAverage7Days.toFixed(2)} HR
                    </span>
                  </div>
                </HoverPopover>
              </div>
            )}
            {!averagePriceLoading && !averagePriceError && !averagePriceData && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">No price data available</span>
                <span
                  className="text-[10px] text-blue-400 hover:text-blue-300 cursor-pointer underline"
                  onClick={(e) => {
                    e.stopPropagation();
                    openUrl(getPd2TraderUrl());
                  }}
                >
                  View on Web
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Body */}
      <CardContent className="flex-1 flex flex-col min-h-0 space-y-4 overflow-hidden">
        <ScrollArea className="pr-2 flex-none max-h-[30vh]">
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
        <div className="flex flex-col gap-2 flex-none">
          <div className="flex flex-row gap-2 w-full mt-2">
            <ButtonGroup>
              <Button variant="secondary"
                className="cursor-pointer"
                onClick={handleSearch}>
                Search
              </Button>
              <Button
                variant="secondary"
                className="flex flex-row justify-center gap-2 px-3 cursor-pointer"
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
                      className="flex flex-row justify-center gap-2 cursor-pointer"
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

        {marketListings.length > 0 && (
          <div className="mb-2 text-xs text-gray-400 pl-2 mt-2 flex items-center gap-2">
            <span>Matches: {totalCount}</span>
            {marketLoading && <Loader2 className="h-3 w-3 animate-spin" />}
          </div>
        )}

        <ScrollArea className="flex-1 min-h-0">
          {marketLoading && marketListings.length === 0 && (
            <div className="text-center text-sm text-gray-400 p-4 flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading market listings...</span>
            </div>
          )}
          {marketError && <div className="text-center text-sm text-red-400 p-4">{marketError}</div>}
          {marketListings.length > 0 && (
            <div className="mt-2 pr-3">
              <table className="min-w-full text-sm text-left">
                <thead>
                  <tr>
                    <th className="px-2 py-1 border-b border-neutral-700 w-full">Price</th>
                    <th className="px-2 py-1 border-b border-neutral-700 whitespace-nowrap w-[1%]">Listed</th>
                  </tr>
                </thead>
                <tbody>
                  {marketListings.length === 0 && (
                    <tr>
                      <td colSpan={2}
                        className="px-2 py-2 text-center text-gray-400">
                        No listings found
                      </td>
                    </tr>
                  )}
                  {marketListings.map((listing: MarketListingEntry, idx: number) => (
                    <ListingRow key={listing._id || idx}
                      listing={listing}
                      idx={idx} />
                  ))}
                </tbody>
              </table>
              {/* Load more trigger */}
              {hasMore && (
                <div ref={loaderRef}
                  className="py-2 text-center text-xs text-gray-500">
                  {marketLoading ? 'Loading more...' : 'Load more'}
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;

const isUserOnline = (userLastIngame?: string): boolean => {
  if (!userLastIngame) return false;
  const ts = new Date(userLastIngame).getTime();
  if (!Number.isFinite(ts) || ts <= 0) return false;
  return Date.now() - ts < ONLINE_THRESHOLD_MS;
};

const ListingRow = ({ listing, idx }: { listing: MarketListingEntry; idx: number }) => {
  const [open, setOpen] = useState(false);
  const isCorrupted = listing.item?.corruptions && listing.item.corruptions.length > 0;
  const online = isUserOnline(listing.user_last_ingame);

  // Clean corruptions similar to logic used elsewhere if needed, but for now we rely on the list

  return (
    <Popover open={open}
      onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <tr
          className={`cursor-help ${idx % 2 === 0 ? 'bg-neutral-800' : ''} hover:bg-neutral-700 transition-colors`}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          {/* Price Column */}
          <td className="px-2 py-1 flex flex-row items-center justify-between whitespace-nowrap">
            <div className="flex-1 truncate mr-2">
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
                  <span className="cursor-pointer underline decoration-dotted">{listing.price.slice(0, 40)}...</span>
                </HoverPopover>
              ) : (
                listing.price || '-'
              )}
            </div>

            <TooltipProvider delayDuration={0}>
              <div className="flex flex-row items-center gap-1">
                {/* Online Indicator */}
                {online && (
                  <Tooltip disableHoverableContent={true}
                    delayDuration={0}>
                    <TooltipTrigger asChild>
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.8)]" />
                    </TooltipTrigger>
                    <TooltipContent className="pointer-events-none">
                      <p>Online in-game</p>
                    </TooltipContent>
                  </Tooltip>
                )}

                {/* Ethereal Indicator */}
                {listing.item.is_ethereal && (
                  <Tooltip disableHoverableContent={true}
                    delayDuration={0}>
                    <TooltipTrigger asChild>
                      <div className="w-4 h-4 rounded-full border border-neutral-600 bg-white flex items-center justify-center">
                        <span className="text-black text-[10px] font-bold leading-none">E</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="pointer-events-none">
                      <p>Ethereal</p>
                    </TooltipContent>
                  </Tooltip>
                )}

                {/* Corruption Indicator */}
                {isCorrupted && (
                  <Tooltip disableHoverableContent={true}
                    delayDuration={0}>
                    <TooltipTrigger asChild>
                      <div className="w-4 h-4 rounded-full border border-neutral-600 bg-red-600 flex items-center justify-center">
                        <span className="text-white text-[10px] font-bold leading-none">C</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="pointer-events-none">
                      <p>Corrupted</p>
                    </TooltipContent>
                  </Tooltip>
                )}

                {/* Sockets Indicator */}
                {(listing.item.socket_count || 0) > 0 && (
                  <Tooltip disableHoverableContent={true}
                    delayDuration={0}>
                    <TooltipTrigger asChild>
                      <div className="w-4 h-4 rounded-full border border-neutral-600 bg-neutral-800 flex items-center justify-center">
                        <span className="text-gray-200 text-[10px] font-bold leading-none">
                          {listing.item.socket_count}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="pointer-events-none">
                      <p>
                        {listing.item.socket_count} {listing.item.socket_count === 1 ? 'Socket' : 'Sockets'}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </TooltipProvider>
          </td>

          {/* Listed Column */}
          <td className="px-2 py-1 whitespace-nowrap text-right text-xs text-gray-400">
            {listing.bumped_at ? moment(listing.bumped_at).fromNow(true) : '-'}
          </td>
        </tr>
      </PopoverTrigger>

      {/* Row Hover Stats Popover */}
      <PopoverContent
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        side="bottom"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="p-0 bg-transparent border-0 w-auto pointer-events-none"
      >
        <Card className="p-2 bg-neutral-950 border-neutral-700 max-w-sm">
          <ItemStatsDisplay
            stashItem={listing.item as any}
            isExpanded={true}
            onToggleExpanded={() => {}}
            hideToggle={true}
          />
        </Card>
      </PopoverContent>
    </Popover>
  );
};
