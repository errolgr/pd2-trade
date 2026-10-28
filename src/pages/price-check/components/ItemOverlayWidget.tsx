import { PopoverKeyValue, PopoverSectionTitle, PopoverTile } from '@/components/custom/popover-parts';
import { encodeItemForQuickList, isStashItem, itemCorruptions } from '@/lib/item-utils';
import { useInView } from 'react-intersection-observer';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, animate, motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { useAvailableUpdate } from '@/hooks/useAvailableUpdate';
import { installUpdateAndRelaunch } from '@/lib/updater';
import { RELEASE_PAGE_URL, isManualUpdateRequired } from '@/lib/manual-update';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertCircle,
  ArrowUpCircle,
  AlertTriangle,
  ArrowLeftRight,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ExternalLink,
  ImageDown,
  ListPlus,
  Loader2,
  LuggageIcon,
  Repeat2,
  RotateCw,
  SearchIcon,
  SearchX,
  SettingsIcon,
  ShieldIcon,
  SquareArrowOutUpRight,
  Store,
  TrendingDown,
  TrendingUp,
  UserIcon,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { WindowChrome, WindowPanel } from '@/components/custom/window-chrome';
import { cn } from '@/lib/utils';
import { DUR, EASE_OUT, fadeInUp, scaleIn, useReducedMotionSafe } from '@/lib/motion';
import { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import { qualityColor } from '../lib/qualityColor';
import { RANGE_FIELDS, StatRow } from './StatRow';
import { useOptions } from '@/hooks/useOptions';
import { openUrl } from '@/lib/browser-opener';
import { Props } from '../lib/types';
import { useEconomyData } from '../hooks/useEconomyData';
import { useStatSelection } from '../hooks/useStatSelection';
import ItemStatsDisplay from '../../quick-list/components/ItemStatsDisplay';
import { buildGetMarketListingQuery, buildTradeUrl } from '../lib/tradeUrlBuilder';
import { priceCheckToMarketFilters, type PriceCheckSearch } from '@/pages/market/store/priceCheckFilters';
import { defaultFilters, mergeFilters } from '@/pages/market/lib/defaults';
import type { MarketFilters } from '@/pages/market/lib/types';
import { searchMarketListings } from '@/lib/market-search-api';
import { RunePricePopover } from './RunePricePopover';
import { getStatKey, PSEUDO_KEY_PREFIX } from '../lib/utils';
import moment from 'moment';
import { HoverPopover } from '@/components/custom/hover-popover';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { useItems } from '@/hooks/useItems';
import { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import type { MarketListingQuery } from '@/common/types/pd2-website/GetMarketListingsCommand';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { imageToast, showToast, useOverlay } from '@/overlay';
import { getSeasonById, getSeasonDateConfig } from '@/lib/seasons';
import { basisLabel, DEFAULT_PRICE_WINDOW_HOURS, priceWindowNote, windowLabel } from '@/lib/price-window';
import { Label } from '@/components/ui/label';
import { ButtonGroup } from '@/components/ui/button-group';
import { itemTypes } from '@/common/item-types';
import { ItemQuality } from '@/common/types/Item';
import { trackEvent, trackMeasurement } from '@/lib/telemetry';
import {
  fetchItemPrice,
  fetchItemPriceByName,
  fetchCorruptionPrices,
  AveragePriceResponse,
  CorruptionPrice,
  CorruptionPricesResponse,
} from '@/pages/currency/lib/price-api';
import { statIdToProperty, getStatIdForCorruptionStatKey, StatId } from '../lib/stat-mappings';
import { cubeCorruptions } from '@/assets/cube-corruptions';
import { isUserOnlineIngame } from '@/lib/user-online-status';
import { writePng, writeText } from '@/lib/browser-clipboard';
import { whisperCommand } from '@/lib/whisper-history';
import { buildItemCard, renderItemCard } from '../lib/item-card';
import { CaptureSweep } from './CaptureSweep';
import { useRareAppraisal } from '../hooks/useRareAppraisal';
import { RareAppraisalPill, RareAppraisalPillSkeleton } from './RareAppraisalPill';
import { appraisalNote } from '@/components/rares/rares-format';
import { PriceSparkline } from './PriceSparkline';
import { WornByLine } from './WornByLine';
import { keyStatMin, matchRareStats } from '../lib/rare-stat-match';
import type { AppraisedStat } from '@/lib/rare-appraisal-api';

/** The search whose results are listed. */
interface ActiveSearch {
  query: MarketListingQuery;
  /** Set when a pseudo stat is selected: PD2 can't filter computed totals, the market service searches instead. */
  marketFilters: MarketFilters | null;
  archived: boolean;
  searchMode: number;
  /** Listings fetched so far: the `$skip` of the next page. */
  skip: number;
}

export default function ItemOverlayWidget({ item, statMapper, onClose }: Props) {
  const { settings, isLoading: settingsLoading } = useOptions();
  const { getMarketListings, getMarketListingsArchive } = usePd2Website();
  const { findOneByName } = useItems();
  const { openPanel } = useOverlay();
  const priceHours = settings.priceWindowHours ?? DEFAULT_PRICE_WINDOW_HOURS;
  const { startDate: seasonStart, endDate: seasonEnd } = getSeasonDateConfig(settings.selectedSeasonId);
  // Window the price check asks for (`priceWindow` label); a past season is priced over the whole season.
  const requestedWindow = seasonEnd ? 'season' : windowLabel(priceHours);

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
    pseudos,
    togglePseudo,
    setActivePseudos,
  } = useStatSelection(item);

  const pd2Item = useMemo(() => findOneByName(item.name, item.quality), [item, findOneByName]);

  // Market listings state
  const [marketListings, setMarketListings] = useState<MarketListingEntry[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketError, setMarketError] = useState<string | null>(null);
  const [searchArchived, setSearchArchived] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  // True once a new search has completed for the current item (drives the "no listings" empty state)
  const [searched, setSearched] = useState(false);
  // Set with filter changes that search as soon as they apply (corruption/socket price clicks, a Keep rare)
  const [searchPending, setSearchPending] = useState(false);
  const [selectedCorruptionNames, setSelectedCorruptionNames] = useState<string[]>([]);
  const ITEMS_PER_PAGE = 20;
  // More pages continue this search's query, never the filters as edited since
  const activeSearch = useRef<ActiveSearch | null>(null);
  // Bumped by each new search and item change: a response for an older one is dropped
  const searchGeneration = useRef(0);

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

  // Rare appraisal (pd2trader.com): verdict pill + key-stat stars on the stat rows; null mode until settings load.
  const rareMode = useMemo(
    () =>
      settingsLoading ? null : { isLadder: settings.ladder === 'ladder', isHardcore: settings.mode === 'hardcore' },
    [settingsLoading, settings.ladder, settings.mode],
  );
  const rareAppraisal = useRareAppraisal(item, rareMode);
  const rareResponse = rareAppraisal.status === 'done' ? rareAppraisal.response : null;
  const appraisal = rareResponse?.appraisal ?? null;
  const appraisalNoteText = rareResponse?.reason ? appraisalNote(rareResponse.reason) : null;

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

    // Same mode and window on the website's item page.
    const params = new URLSearchParams({
      isLadder: String(settings.ladder === 'ladder'),
      isHardcore: String(settings.mode === 'hardcore'),
      hours: String(priceHours),
    });
    if (seasonStart && seasonEnd) {
      params.set('startDate', seasonStart);
      params.set('endDate', seasonEnd);
    }
    return `https://pd2trader.com/item/${encodeURIComponent(baseCode)}?${params}`;
  }, [
    item.quality,
    pd2Item?.name,
    averagePriceData,
    extractRainbowFacetData,
    settings.ladder,
    settings.mode,
    priceHours,
    seasonStart,
    seasonEnd,
  ]);

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

  useEffect(() => {
    if (item) {
      // clear market listing result if new item is loaded; a search still in flight is for the old item
      searchGeneration.current += 1;
      activeSearch.current = null;
      setMarketListings([]);
      setTotalCount(0);
      setHasMore(false);
      setMarketLoading(false);
      setMarketError(null);
      setSearched(false);
      setSelected(new Set());
      setFilters({});
      setSearchMode(0); // Reset to default mode
      setQualityOverride(null); // Reset quality override
      // Corrupted state is reset to the saved default by useStatSelection when the
      // item changes, gated by whether the item is actually corruptable.
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

  // Appraisal stat (stars / "valuable from N") per stat row key; empty without an appraisal.
  const rareStats = useMemo(
    () => (appraisal ? matchRareStats(appraisal.stats, sortedStats) : new Map<string, AppraisedStat>()),
    [appraisal, sortedStats],
  );

  // When the appraisal arrives: pre-select its key stats as filters (min = key threshold, max open, user
  // choices kept) and search right away for a Keep rare; other verdicts wait for the user.
  useEffect(() => {
    if (!appraisal) return;
    const keyRows = sortedStats.filter((s) => rareStats.get(getStatKey(s))?.stars);
    if (keyRows.length > 0) {
      setSelected((prev) => new Set([...prev, ...keyRows.map(getStatKey)]));
      setFilters((prev) => {
        const next = { ...prev };
        for (const s of keyRows) {
          const key = getStatKey(s);
          const min = keyStatMin(rareStats.get(key)!);
          next[key] ??= { min: min === null ? '' : String(min), max: '' };
        }
        return next;
      });
    }
    if (appraisal.verdict === 'keep') setSearchPending(true);
    // Once per appraisal: later stat/setting changes must not re-apply the selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appraisal]);

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
          // Rolling window clamped to the current season's start; a past season uses its whole date range.
          ...(!seasonConfig.endDate ? { hours: priceHours } : {}),
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
    priceHours,
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
          ...(!seasonConfig.endDate ? { hours: priceHours } : {}),
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
    settings.selectedSeasonId,
    priceHours,
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

  const openCurrencyValuation = useCallback(() => openPanel('currency'), [openPanel]);

  const openListWindow = useCallback(
    () => openPanel('quickList', { item: encodeItemForQuickList(JSON.stringify(item)) }, { placement: 'cursor' }),
    [item, openPanel],
  );

  /** Fetches the next page of `search`, its first page when nothing is fetched yet. */
  const fetchPage = useCallback(
    async (search: ActiveSearch) => {
      const generation = searchGeneration.current;
      const isNewSearch = search.skip === 0;
      const query = { ...search.query, $skip: search.skip };
      setMarketError(null);
      setMarketLoading(true);
      const startTime = performance.now();

      try {
        const result = search.marketFilters
          ? await searchMarketListings(search.marketFilters, {
              page: search.skip / ITEMS_PER_PAGE,
              limit: ITEMS_PER_PAGE,
            }).then((page) => ({
              data: page.items.map((row) => row.listing),
              total: page.total,
              fetched: page.fetched,
            }))
          : search.archived
            ? await getMarketListingsArchive(query)
            : await getMarketListings(query);
        if (generation !== searchGeneration.current) return;

        const duration = performance.now() - startTime;

        if (isNewSearch) {
          setMarketListings(result.data);
          setTotalCount(result.total);
          setSearched(true);
        } else {
          setMarketListings((prev) => {
            // Filter duplicates
            const existingIds = new Set(prev.map((l) => l._id));
            const newItems = result.data.filter((l) => !existingIds.has(l._id));
            return [...prev, ...newItems];
          });
        }

        search.skip += ITEMS_PER_PAGE;
        // A full page of rows, not of listings shown (item-less ones are dropped), means more may follow
        setHasMore(result.fetched === ITEMS_PER_PAGE);

        trackMeasurement(
          'item_overlay_market_search',
          {
            duration_ms: duration,
            returned_items: result.data.length,
            total_items: isNewSearch ? result.total : undefined,
          },
          {
            outcome: 'success',
            archived: search.archived,
            market_service: search.marketFilters !== null,
            search_mode: search.searchMode,
            page: query.$skip / ITEMS_PER_PAGE,
          },
        );
      } catch (e: any) {
        if (generation !== searchGeneration.current) return;
        const duration = performance.now() - startTime;
        trackMeasurement(
          'item_overlay_market_search',
          { duration_ms: duration },
          { outcome: 'error', archived: search.archived, search_mode: search.searchMode },
        );
        console.log(e.message || 'Failed to fetch market listings');
        setMarketError(e.message || 'Failed to fetch market listings');
        // Retry starts a new search; scrolling must not keep re-requesting the failed page
        setHasMore(false);
      } finally {
        if (generation === searchGeneration.current) setMarketLoading(false);
      }
    },
    [getMarketListings, getMarketListingsArchive],
  );

  /**
   * Searches the current filters from the first page; `corruptionNames` narrows it to items with those
   * corruptions. Built here, not kept as state, so it never carries the `$skip` of a list scrolled earlier.
   */
  const runSearch = useCallback(
    (corruptionNames: string[]) => {
      if (settingsLoading) return;
      // Only use searchMode for items that support toggle, otherwise use default (0)
      const effectiveSearchMode = shouldUseToggle ? searchMode : 0;
      const priceCheck: PriceCheckSearch = {
        item,
        pd2Item,
        selected,
        filters,
        settings,
        statMapper,
        archive: searchArchived,
        searchMode: effectiveSearchMode,
        matchedItemType,
        corruptedState,
        corruptionNames,
        qualityOverride: shouldUseToggle ? effectiveQuality : undefined,
      };
      const hasPseudo = [...selected].some((key) => key.startsWith(PSEUDO_KEY_PREFIX));
      const search: ActiveSearch = {
        query: buildGetMarketListingQuery(
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
          0,
          corruptionNames.length > 0 ? corruptionNames : undefined,
          shouldUseToggle ? effectiveQuality : undefined,
        ),
        marketFilters: hasPseudo
          ? mergeFilters(
              defaultFilters({ hardcore: settings.mode === 'hardcore', ladder: settings.ladder === 'ladder' }),
              priceCheckToMarketFilters(priceCheck),
            )
          : null,
        archived: searchArchived,
        searchMode: effectiveSearchMode,
        skip: 0,
      };
      searchGeneration.current += 1;
      activeSearch.current = search;
      setHasMore(false);
      fetchPage(search);
    },
    [
      settingsLoading,
      item,
      pd2Item,
      selected,
      filters,
      settings,
      statMapper,
      searchArchived,
      searchMode,
      shouldUseToggle,
      matchedItemType,
      corruptedState,
      effectiveQuality,
      fetchPage,
    ],
  );

  // Search button, Enter and Retry: a manual search drops the corruption filter a corruption price click set
  const handleSearch = () => {
    setSelectedCorruptionNames([]);
    runSearch([]);
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
      setActivePseudos([]);
      setSelectedCorruptionNames(Array.isArray(corruptionKey) ? corruptionKey : [corruptionKey]); // Set the corruption property names to filter by
      setCorruptedState(1); // Set to corrupted only
      setSearchArchived(true); // Enable expired listings
      setSearchPending(true);
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

      setSearchPending(true);
    },
    [sortedStats],
  );

  // Corruption/socket price clicks and a Keep rare search once their filter changes have applied
  useEffect(() => {
    if (!searchPending) return;
    setSearchPending(false);
    runSearch(selectedCorruptionNames);
  }, [searchPending, runSearch, selectedCorruptionNames]);

  // Infinite scroll: the next page of the listed search
  useEffect(() => {
    if (inView && !marketLoading && hasMore && activeSearch.current) fetchPage(activeSearch.current);
  }, [inView, marketLoading, hasMore, fetchPage]);

  const openSettingsPage = useCallback(() => openPanel('settings'), [openPanel]);

  // QOL: reset every stat filter, including the tri-state corrupted filter (which also lives in `selected`) and the
  // Σ totals folded in
  const clearSelectedStats = useCallback(() => {
    setSelected(new Set());
    setFilters({});
    setCorruptedState(0);
    setActivePseudos([]);
  }, [setSelected, setFilters, setCorruptedState, setActivePseudos]);

  // "Clear ranges": every selected stat keeps its tick, its min / max empty; each row plays its clear wipe
  const hasAnyRange = [...selected].some((k) => RANGE_FIELDS.some((field) => !!filters[k]?.[field]));
  const [rangeWipe, setRangeWipe] = useState(0);
  const clearAllRanges = () => {
    const empty = Object.fromEntries(RANGE_FIELDS.map((field) => [field, '']));
    setFilters((f) =>
      Object.fromEntries(Object.entries(f).map(([k, v]) => [k, selected.has(k) ? { ...v, ...empty } : v])),
    );
    setRangeWipe((n) => n + 1);
  };

  const openTradeUrl = () => {
    if (tradeUrl) {
      trackEvent('item_overlay_trade_url_opened', {
        archived: searchArchived,
        search_mode: shouldUseToggle ? searchMode : 0,
      });
      openUrl(tradeUrl);
    }
  };

  // Same search in the in-game market browser (pool search, pseudo stats, alerts)
  const openInMarket = () => {
    trackEvent('item_overlay_open_in_market', { archived: searchArchived });
    const marketFilters = priceCheckToMarketFilters({
      item,
      pd2Item,
      selected,
      filters,
      settings,
      statMapper,
      archive: searchArchived,
      searchMode: shouldUseToggle ? searchMode : 0,
      matchedItemType,
      corruptedState,
      corruptionNames: selectedCorruptionNames,
      qualityOverride: shouldUseToggle ? effectiveQuality : undefined,
    });
    openPanel('market', { filters: marketFilters, tab: 'search' });
  };

  const openPd2Trader = () => openUrl(getPd2TraderUrl());

  const isUniqueOrSet = item.quality === ItemQuality.Unique || item.quality === ItemQuality.Set;
  const canList = isStashItem(item);
  const itemIcon = getItemIcon();
  // Headline price: the 7-day moving average for the 7-day window and past seasons (as on pd2trader.com),
  // otherwise the trimmed mean over the chosen window.
  const headlinePrice = averagePriceData
    ? requestedWindow === '7d' || requestedWindow === 'season'
      ? (averagePriceData.movingAverage7Days ?? averagePriceData.medianPrice)
      : averagePriceData.averagePrice
    : null;
  const windowNote = priceWindowNote(averagePriceData?.priceWindow, requestedWindow);
  const priceBasis = (
    <span className="inline-flex items-center gap-1">
      {basisLabel(requestedWindow)}
      {windowNote && (
        <span
          title={windowNote.title}
          aria-label={windowNote.title}
          className="cursor-help rounded-sm border border-border px-1 text-[9px] font-medium leading-[13px] tracking-wider text-muted-foreground"
        >
          {windowNote.label}
        </span>
      )}
    </span>
  );

  // "Copy image": the item as a PD2 tooltip with this price check under it, as a PNG on the clipboard.
  const [copyingImage, setCopyingImage] = useState(false);
  // Bumped per press: remounts the border sweep so it replays.
  const [sweepKey, setSweepKey] = useState(0);
  const copyItemImage = async () => {
    if (copyingImage) return;
    setCopyingImage(true);
    setSweepKey((k) => k + 1);
    try {
      const season = getSeasonById(settings.selectedSeasonId || 'current');
      const context = [
        season && (/\((S\d+)\)/.exec(season.label)?.[1] ?? season.label),
        `${settings.mode === 'hardcore' ? 'Hardcore' : 'Softcore'} ${settings.ladder === 'ladder' ? 'Ladder' : 'Non-Ladder'}`,
        new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
      ]
        .filter(Boolean)
        .join(' · ');
      const card = buildItemCard({
        item,
        average:
          averagePriceData && headlinePrice !== null
            ? {
                data: averagePriceData,
                headline: headlinePrice,
                basis: windowNote
                  ? `${basisLabel(requestedWindow)} (${windowNote.label})`
                  : basisLabel(requestedWindow),
              }
            : null,
        listings: searched ? { entries: marketListings, total: totalCount, archived: searchArchived } : null,
        context,
      });
      const png = await renderItemCard(card);
      await writePng(png);
      trackEvent('item_overlay_image_copied', { quality: item.quality, prices: card.prices.length });
      imageToast({
        title: 'Image copied',
        description: 'Paste it into Discord or a trade post.',
        imageUrl: URL.createObjectURL(png),
      });
    } catch (error) {
      console.error('[ItemOverlayWidget] Failed to copy the item image:', error);
      showToast({ title: 'Could not copy image', description: String(error), variant: 'error' });
    } finally {
      setCopyingImage(false);
    }
  };

  // Top corruptions exclude the item's own corruption (shown in its own section)
  const otherCorruptions = useMemo(
    () =>
      corruptionPrices?.corruptionPrices.filter(
        (corruption) => !itemCorruptions || corruption.corruptionName !== itemCorruptions.corruptionName,
      ) ?? [],
    [corruptionPrices, itemCorruptions],
  );
  const visibleCorruptions = showAllCorruptions ? otherCorruptions : otherCorruptions.slice(0, 5);

  const renderCorruptionRow = (
    corruption: { corruptionName: string; corruptionKey: string[] },
    price: CorruptionPrice | null,
    variant: 'item' | 'top',
    key?: React.Key,
  ) => (
    <CorruptionRow
      key={key}
      name={price?.corruptionName || corruption.corruptionName}
      variant={variant}
      price={price}
      selected={
        selectedCorruptionNames.length > 0 && areCorruptionKeysEqual(corruption.corruptionKey, selectedCorruptionNames)
      }
      itemTitle={displayTitle}
      onSelect={() => handleCorruptionClick(corruption.corruptionKey)}
      onSocketSelect={(socketCount) => handleSocketClick(socketCount, corruption.corruptionKey)}
      onOpenWeb={openPd2Trader}
    />
  );

  const showIdleHint = !searched && !marketLoading && !marketError && marketListings.length === 0;
  const showNoResults = searched && !marketLoading && !marketError && marketListings.length === 0;

  /** -------------------
   *  Render
   *  -----------------*/
  return (
    <MotionConfig reducedMotion="user">
      <TooltipProvider delayDuration={300}>
        <WindowPanel className="relative h-full w-full">
          {sweepKey > 0 && <CaptureSweep key={sweepKey} />}
          {/* Top Bar */}
          <div id="titlebar-drag-handle"
            data-panel-drag
            className="flex-none bg-muted/30">
            <WindowChrome
              title="Price Check"
              titleClassName="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground"
              showGrip={false}
              icon={
                // Rune Information Popover + Net Worth
                <span className="flex items-center gap-0.5 text-muted-foreground">
                  <RunePricePopover
                    loading={loading}
                    calculatedRuneValues={calculatedRuneValues}
                    selectedRuneBreakdown={selectedRuneBreakdown}
                    selectedRuneCombinations={selectedRuneCombinations}
                    onRuneBreakdownSelect={setSelectedRuneBreakdown}
                  />
                  <ToolbarButton label="Net Worth"
                    onClick={openCurrencyValuation}>
                    <LuggageIcon />
                  </ToolbarButton>
                </span>
              }
              actions={
                <>
                  <UpdatePill />
                  <ToolbarButton label="Copy image"
                    onClick={copyItemImage}>
                    {copyingImage ? <Loader2 className="animate-spin" /> : <ImageDown />}
                  </ToolbarButton>
                  <ToolbarButton label="Settings"
                    onClick={openSettingsPage}>
                    <SettingsIcon />
                  </ToolbarButton>
                </>
              }
              onClose={onClose}
              closeLabel="Close"
            />
          </div>

          {/* Header */}
          <motion.header
            key={`${item.name}|${item.quality}|${displayTitle}`}
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            className="flex flex-none flex-col gap-2 px-5 pt-4 pb-3"
          >
            <div className="flex min-w-0 flex-col">
              <h1
                className={cn(
                  'flex items-center gap-2 text-xl leading-tight font-bold tracking-wide drop-shadow-[0_1px_0_rgb(0_0_0/0.25)]',
                  qualityColor(item.quality),
                )}
                style={{ fontFamily: 'DiabloFont' }}
              >
                <span className="min-w-0 truncate">{displayTitle}</span>
                {item.isRuneword && <Badge className="font-sans text-[10px] uppercase tracking-wider">Runeword</Badge>}
              </h1>
              {item.type && (
                <div className="-ml-1.5 flex flex-wrap items-center gap-0.5 text-lg leading-tight">
                  {shouldUseToggle ? (
                    <HeaderToggle
                      onClick={toggleSearchMode}
                      title="Click to toggle search mode"
                      className="text-muted-foreground"
                    >
                      {getSearchModeDisplay()}
                    </HeaderToggle>
                  ) : (
                    <div className="px-1.5 text-muted-foreground"
                      style={{ fontFamily: 'DiabloFont' }}>
                      Base: {item.type}
                    </div>
                  )}
                  {shouldUseToggle && (
                    <>
                      <span aria-hidden
                        className="h-4 w-px bg-border" />
                      <HeaderToggle
                        onClick={cycleQuality}
                        title="Click to cycle quality"
                        className={qualityColor(effectiveQuality)}
                      >
                        {effectiveQuality}
                      </HeaderToggle>
                    </>
                  )}
                </div>
              )}
            </div>

            {item.defense && (
              <Badge
                variant="outline"
                className="gap-1.5 rounded-md border-border bg-background/40 px-2 py-0.5 text-xs text-muted-foreground"
              >
                <ShieldIcon className="text-muted-foreground" />
                Defense: <span className="font-semibold tabular-nums text-foreground">{item.defense}</span>
              </Badge>
            )}

            {/* Rare appraisal: verdict pill (same spot/style as the uniques' price pill) + a subtle note */}
            {rareAppraisal.status === 'loading' && (
              <div className="pt-0.5">
                <RareAppraisalPillSkeleton crafted={item.quality === ItemQuality.Crafted} />
              </div>
            )}
            {appraisal && (
              <div className="pt-0.5">
                <RareAppraisalPill
                  appraisal={appraisal}
                  history={rareResponse?.history ?? null}
                  title={displayTitle ?? item.name ?? ''}
                  hardcore={settings.mode === 'hardcore'}
                />
              </div>
            )}
            {appraisalNoteText && (
              <span className="text-[11px] text-muted-foreground/70"
                title={appraisalNoteText.title}>
                Appraisal note: {appraisalNoteText.text}
              </span>
            )}
            <WornByLine
              name={item.isRuneword ? item.runeword : item.name}
              quality={item.quality}
              isRuneword={item.isRuneword}
              mode={settings.mode === 'hardcore' ? 'hardcore' : 'softcore'}
            />

            {/* Average Price Information for Unique Items - Compact */}
            {isUniqueOrSet && (
              <div className="pt-0.5">
                {averagePriceLoading && (
                  <div
                    className="inline-flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2"
                    aria-busy="true"
                  >
                    <Skeleton className="size-10 rounded-md bg-muted-foreground/15" />
                    <div className="flex flex-col gap-1.5">
                      <Skeleton className="h-3.5 w-16 bg-muted-foreground/15" />
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Loader2 className="size-3 animate-spin" />
                        Loading price data...
                      </span>
                    </div>
                  </div>
                )}
                {averagePriceError && !averagePriceLoading && (
                  <div className="inline-flex items-center gap-1.5 rounded-md bg-destructive/10 px-2 py-1 text-xs text-destructive">
                    <AlertCircle className="size-3.5" />
                    {averagePriceError}
                  </div>
                )}
                {averagePriceData && !averagePriceLoading && itemIcon && (
                  <motion.div className="inline-block"
                    variants={scaleIn}
                    initial="hidden"
                    animate="visible">
                    <HoverPopover
                      content={
                        <div className="w-[400px] max-w-[calc(100vw-16px)] space-y-3 rounded-lg border border-border bg-popover p-3 text-sm text-popover-foreground shadow-panel">
                          <div className="truncate font-semibold">{displayTitle}</div>
                          <div className="grid grid-cols-2 gap-1.5">
                            <PopoverTile label={priceBasis}
                              emphasis>
                              {headlinePrice?.toFixed(2)} HR
                            </PopoverTile>
                            <PopoverTile label="Median">{averagePriceData.medianPrice.toFixed(2)} HR</PopoverTile>
                            <PopoverTile label="Min">{averagePriceData.minPrice.toFixed(2)} HR</PopoverTile>
                            <PopoverTile label="Max">{averagePriceData.maxPrice.toFixed(2)} HR</PopoverTile>
                          </div>
                          <div className="space-y-1 border-t border-border pt-2 text-xs">
                            <PopoverKeyValue label="Samples">{averagePriceData.sampleCount}</PopoverKeyValue>
                            {averagePriceData.priceChange7Days && (
                              <PopoverKeyValue label="7d Change">
                                <ChangeLabel
                                  change={averagePriceData.priceChange7Days.change}
                                  percent={averagePriceData.priceChange7Days.changePercent}
                                />
                              </PopoverKeyValue>
                            )}
                          </div>
                          <div className="space-y-1.5 border-t border-border pt-2">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-xs font-semibold">Last 30 days</span>
                              <WebLink onClick={openPd2Trader}
                                inPopover>
                                Open on pd2trader.com
                              </WebLink>
                            </div>
                            <PriceSparkline
                              query={{
                                baseCode: averagePriceData.baseCode,
                                isLadder: settings.ladder === 'ladder',
                                isHardcore: settings.mode === 'hardcore',
                                seasonStart,
                                seasonEnd,
                              }}
                            />
                          </div>
                          {/* Item's Corruption Price - Display separately if matched */}
                          {itemCorruptions && (
                            <div className="border-t border-border pt-2">
                              <PopoverSectionTitle className="text-q-corrupted">
                                This Item&apos;s Corruption
                              </PopoverSectionTitle>
                              {renderCorruptionRow(itemCorruptions, itemCorruptions.priceData, 'item')}
                            </div>
                          )}
                          {/* Corruption Prices */}
                          {corruptionPrices && corruptionPrices.corruptionPrices.length > 0 && (
                            <div className="border-t border-border pt-2">
                              <PopoverSectionTitle>Top Corruptions</PopoverSectionTitle>
                              {showAllCorruptions ? (
                                <ScrollArea className="w-full overflow-x-hidden"
                                  viewportClassName="max-h-[200px]">
                                  <div className="w-full space-y-0.5 overflow-x-hidden px-1.5 pr-3">
                                    {visibleCorruptions.map((corruption, idx) =>
                                      renderCorruptionRow(corruption, corruption, 'top', idx),
                                    )}
                                  </div>
                                </ScrollArea>
                              ) : (
                                <div className="w-full space-y-0.5 overflow-x-hidden px-1.5">
                                  {visibleCorruptions.map((corruption, idx) =>
                                    renderCorruptionRow(corruption, corruption, 'top', idx),
                                  )}
                                </div>
                              )}
                              {otherCorruptions.length > 5 && (
                                <button
                                  type="button"
                                  tabIndex={-1}
                                  onClick={() => setShowAllCorruptions(!showAllCorruptions)}
                                  className="mt-1.5 inline-flex items-center gap-1 rounded-sm text-xs text-muted-foreground underline-offset-4 outline-none transition-colors hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring/60"
                                >
                                  {showAllCorruptions ? (
                                    <>
                                      <ChevronUp className="size-3" />
                                      Show Less
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="size-3" />
                                      {`Show More (${otherCorruptions.length - 5} more)`}
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          )}
                          {corruptionPricesLoading && (
                            <div className="flex items-center gap-1.5 border-t border-border pt-2 text-xs text-muted-foreground">
                              <Loader2 className="size-3 animate-spin" />
                              Loading corruption prices...
                            </div>
                          )}
                        </div>
                      }
                    >
                      <div className="group flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2 transition-[background-color,border-color,box-shadow] duration-(--dur-med) ease-out hover:border-glow/50 hover:bg-accent/60 hover:shadow-glow">
                        <img
                          src={`https://pd2trader.com/assets/items/${itemIcon}.png`}
                          alt={item.name}
                          className="h-10 drop-shadow-[0_2px_4px_rgb(0_0_0/0.35)] transition-transform duration-(--dur-med) ease-out group-hover:scale-105"
                          onError={(e) => {
                            // Fallback if image fails to load
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        <ArrowLeftRight className="size-4 text-muted-foreground transition-colors group-hover:text-foreground" />
                        <div className="flex flex-col leading-tight">
                          <span className="text-sm font-semibold tabular-nums text-foreground">
                            <AnimatedNumber value={headlinePrice ?? 0} /> HR
                          </span>
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            {priceBasis}
                          </span>
                        </div>
                        {averagePriceData.priceChange7Days && (
                          <ChangeLabel
                            change={averagePriceData.priceChange7Days.change}
                            percent={averagePriceData.priceChange7Days.changePercent}
                            pill
                          />
                        )}
                      </div>
                    </HoverPopover>
                  </motion.div>
                )}
                {!averagePriceLoading && !averagePriceError && !averagePriceData && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">No price data available</span>
                    <WebLink onClick={openPd2Trader}>View on Web</WebLink>
                  </div>
                )}
              </div>
            )}
          </motion.header>

          {/* Body */}
          <div className="flex min-h-0 flex-1 flex-col gap-3 px-5 pb-4">
            {sortedStats.length > 0 && (
              <section className="flex flex-none flex-col gap-1">
                <div className="flex h-5 items-center justify-between px-2">
                  <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    Stats
                  </span>
                  <AnimatePresence initial={false}>
                    {(selected.size > 0 || corruptedState !== 0) && (
                      <motion.div
                        initial={{ opacity: 0, x: 6 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 6 }}
                        transition={{ duration: DUR.fast, ease: EASE_OUT }}
                        className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"
                      >
                        <span className="tabular-nums">{selected.size} selected</span>
                        {/* Empties every selected stat's min / max (stats stay selected); only while one is set */}
                        {hasAnyRange && (
                          <>
                            <span aria-hidden>·</span>
                            <button
                              type="button"
                              onClick={clearAllRanges}
                              title="Empty every min and max; the stats stay selected"
                              className="rounded-sm underline-offset-2 outline-none transition-colors hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring/60"
                            >
                              Clear ranges
                            </button>
                          </>
                        )}
                        <span aria-hidden>·</span>
                        <button
                          type="button"
                          onClick={clearSelectedStats}
                          title="Untick every stat"
                          className="rounded-sm underline-offset-2 outline-none transition-colors hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring/60"
                        >
                          Clear
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <ScrollArea className="flex-none pr-2"
                  viewportClassName="max-h-[30vh]">
                  <div>
                    <AnimatePresence initial={false}>
                      {sortedStats.map((s) => {
                        // Σ chip menu: the totals over this row, or over the rows a Σ row folded in
                        const keys = s.folded ? s.folded.map(getStatKey) : [getStatKey(s)];
                        return (
                          <StatRow
                            toggle={toggle}
                            key={getStatKey(s)}
                            stat={s}
                            item={item}
                            nested={false}
                            updateFilter={updateFilter}
                            filters={filters}
                            selected={selected}
                            corruptedState={corruptedState}
                            onSubmit={handleSearch}
                            rare={rareStats.get(getStatKey(s))}
                            pseudoOptions={pseudos.filter((o) => o.covers.some((k) => keys.includes(k)))}
                            wipe={rangeWipe}
                            onPseudo={togglePseudo}
                          />
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </ScrollArea>
              </section>
            )}

            {/* Search actions */}
            <div className="flex flex-none flex-wrap items-center gap-2 pt-2">
              <ButtonGroup>
                <Button className="min-w-24 cursor-pointer"
                  onClick={handleSearch}>
                  {marketLoading ? <Loader2 className="animate-spin" /> : <SearchIcon />}
                  Search
                </Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      aria-label="Open search on projectdiablo2.com"
                      className="cursor-pointer border-l border-primary-foreground/15 px-3"
                      onClick={openTradeUrl}
                    >
                      <SquareArrowOutUpRight />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Open this search on projectdiablo2.com</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      aria-label="Open in market"
                      className="cursor-pointer border-l border-primary-foreground/15 px-3"
                      onClick={openInMarket}
                    >
                      <Store />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Open in market</TooltipContent>
                </Tooltip>
              </ButtonGroup>

              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button variant="secondary"
                      className="cursor-pointer"
                      onClick={openListWindow}
                      disabled={!canList}>
                      <ListPlus />
                      List
                    </Button>
                  </span>
                </TooltipTrigger>
                {!canList && (
                  <TooltipContent side="top">
                    <p>Item must be in your shared stash to list.</p>
                  </TooltipContent>
                )}
              </Tooltip>

              <div className="ml-auto flex items-center gap-2">
                <Switch
                  id="archived-toggle"
                  checked={searchArchived}
                  onCheckedChange={(checked) => {
                    setSearchArchived(checked);
                  }}
                />
                <Label
                  htmlFor="archived-toggle"
                  className="cursor-pointer text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Show Expired
                </Label>
              </div>
            </div>

            {/* Results */}
            <AnimatePresence initial={false}>
              {marketListings.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: DUR.med, ease: EASE_OUT }}
                  className="-mb-1 flex flex-none items-center gap-2 px-2 text-xs text-muted-foreground"
                >
                  <span>
                    Matches: <span className="font-semibold tabular-nums text-foreground">{totalCount}</span>
                  </span>
                  {marketListings.length < totalCount && (
                    <span className="tabular-nums">· showing {marketListings.length}</span>
                  )}
                  {marketLoading && <Loader2 className="size-3 animate-spin" />}
                </motion.div>
              )}
            </AnimatePresence>

            <ScrollArea className="min-h-0 flex-1">
              {marketLoading && marketListings.length === 0 && (
                <div aria-busy="true">
                  <div className="flex items-center justify-center gap-2 p-3 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    <span>Loading market listings...</span>
                  </div>
                  <div className="space-y-1.5 pr-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-md px-2 py-1.5"
                        style={{ opacity: 1 - i * 0.13 }}
                      >
                        <Skeleton className="h-4 w-20 bg-muted-foreground/15" />
                        <Skeleton className="h-3 w-14 bg-muted-foreground/15" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {marketError && (
                <motion.div
                  variants={fadeInUp}
                  initial="hidden"
                  animate="visible"
                  role="alert"
                  className="mx-auto mt-2 mr-3 flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                >
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">Couldn&apos;t load listings</div>
                    <div className="text-xs break-words opacity-90">{marketError}</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 shrink-0 text-destructive hover:bg-destructive/15 hover:text-destructive"
                    onClick={handleSearch}
                  >
                    <RotateCw />
                    Retry
                  </Button>
                </motion.div>
              )}
              {showNoResults && (
                <EmptyState icon={<SearchX />}
                  title="No listings found">
                  {searchArchived
                    ? 'Try loosening your stat filters.'
                    : 'Try loosening your stat filters or turn on Show Expired.'}
                </EmptyState>
              )}
              {showIdleHint && (
                <EmptyState icon={<SearchIcon />}
                  title="Ready to search"
                  subtle>
                  Pick the stats that matter, then hit Search or press Enter in a min/max field.
                </EmptyState>
              )}
              {marketListings.length > 0 && (
                <div className="mt-1 pr-3">
                  <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
                    <thead>
                      <tr>
                        <th className="sticky top-0 z-10 w-full border-b border-border bg-surface-elevated px-2 py-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                          Price
                        </th>
                        <th className="sticky top-0 z-10 w-[1%] whitespace-nowrap border-b border-border bg-surface-elevated px-2 py-1.5 text-right text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                          Listed
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {marketListings.map((listing: MarketListingEntry, idx: number) => (
                        <ListingRow key={listing._id || idx}
                          listing={listing}
                          idx={idx} />
                      ))}
                    </tbody>
                  </table>
                  {/* Load more trigger */}
                  {hasMore && (
                    <div
                      ref={loaderRef}
                      className="flex items-center justify-center gap-1.5 py-2.5 text-xs text-muted-foreground"
                    >
                      {marketLoading && <Loader2 className="size-3 animate-spin" />}
                      {marketLoading ? 'Loading more...' : 'Load more'}
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </div>
        </WindowPanel>
      </TooltipProvider>
    </MotionConfig>
  );
}

/** "Restart to update" in the title bar: price check is the window users look at most. */
function UpdatePill() {
  const version = useAvailableUpdate();
  const [state, setState] = useState<'idle' | 'installing' | 'failed' | 'manual'>(() =>
    isManualUpdateRequired() ? 'manual' : 'idle',
  );
  if (!version) return null;

  const install = async () => {
    // Linux deb/rpm installs can't update in place: send the user to the release page
    if (state === 'manual') {
      await openUrl(RELEASE_PAGE_URL);
      return;
    }
    setState('installing');
    // Success relaunches the app; false means the install failed and the app is still running
    if (!(await installUpdateAndRelaunch())) setState(isManualUpdateRequired() ? 'manual' : 'failed');
  };

  // Short labels: the title bar also holds the title, toolbar icons and close in a narrow window
  const label =
    state === 'installing'
      ? 'Updating…'
      : state === 'failed'
        ? 'Retry update'
        : state === 'manual'
          ? 'Get update'
          : 'Restart to update';
  const hint =
    state === 'failed'
      ? `Updating to v${version} failed. Click to try again.`
      : state === 'manual'
        ? `Version ${version} is available. This install can't update itself: click to open the release page, or use your package manager.`
        : `Version ${version} is available. Downloads, installs and restarts PD2 Trader.`;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          disabled={state === 'installing'}
          onClick={install}
          // Subtle tint (like the toolbar icons), not a filled button: noticeable without shouting over the price
          className={cn(
            'h-6 shrink-0 gap-1 rounded-full border px-2 text-[11px] font-medium',
            state === 'failed'
              ? 'border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/15 hover:text-destructive'
              : 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary',
          )}
        >
          {state === 'installing' ? <Loader2 className="size-3 animate-spin" /> : <ArrowUpCircle className="size-3" />}
          {label}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{hint}</TooltipContent>
    </Tooltip>
  );
}

/** Icon button for the title bar, with a tooltip label. */
function ToolbarButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={label}
          onClick={onClick}
          className="size-7 text-muted-foreground hover:text-foreground"
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}

/** Clickable header text (search mode / quality cycling) with a swap animation. */
function HeaderToggle({
  onClick,
  title,
  className,
  children,
}: {
  onClick: () => void;
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'group/toggle inline-flex cursor-pointer items-center gap-1 overflow-hidden rounded-md px-1.5 py-0.5 outline-none transition-[background-color,color,filter] duration-(--dur-fast) hover:bg-accent/60 hover:brightness-125 focus-visible:ring-2 focus-visible:ring-ring/60 active:scale-[0.98]',
        className,
      )}
      style={{ fontFamily: 'DiabloFont' }}
    >
      <AnimatePresence mode="popLayout"
        initial={false}>
        <motion.span
          key={String(children)}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: DUR.med, ease: EASE_OUT }}
        >
          {children}
        </motion.span>
      </AnimatePresence>
      <Repeat2 aria-hidden
        className="size-3.5 opacity-40 transition-opacity group-hover/toggle:opacity-90" />
    </button>
  );
}

// Rows/links below live in hover-only popovers (not keyboard reachable). They're kept out of the tab
// order so the popover's open auto-focus doesn't paint a focus ring on the first one.
function WebLink({
  onClick,
  children,
  inPopover,
}: {
  onClick: () => void;
  children: React.ReactNode;
  inPopover?: boolean;
}) {
  return (
    <button
      type="button"
      tabIndex={inPopover ? -1 : undefined}
      className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-sm text-[11px] font-medium text-info underline-offset-4 outline-none transition-colors hover:underline focus-visible:ring-2 focus-visible:ring-ring/60"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {children}
      <ExternalLink className="size-3" />
    </button>
  );
}

function ChangeLabel({ change, percent, pill }: { change: number; percent: number; pill?: boolean }) {
  const up = change >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 tabular-nums',
        up ? 'text-success' : 'text-destructive',
        pill && cn('rounded-full px-1.5 py-0.5 text-[11px] font-semibold', up ? 'bg-success/12' : 'bg-destructive/12'),
      )}
    >
      <Icon className="size-3" />
      {up ? '+' : ''}
      {percent.toFixed(1)}%
    </span>
  );
}

/** Counts up to the value on mount and tweens between values (reduced motion: no tween). */
function AnimatedNumber({ value, decimals = 2 }: { value: number; decimals?: number }) {
  const reduce = useReducedMotionSafe();
  const [display, setDisplay] = useState(0);
  // Last rendered value, so an interrupted tween continues from where it is.
  const from = useRef(0);

  useEffect(() => {
    if (reduce) return;
    const controls = animate(from.current, value, {
      duration: 0.45,
      ease: EASE_OUT,
      onUpdate: (v) => {
        from.current = v;
        setDisplay(v);
      },
    });
    return () => controls.stop();
  }, [value, reduce]);

  return <>{(reduce ? value : display).toFixed(decimals)}</>;
}

function EmptyState({
  icon,
  title,
  subtle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtle?: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      className={cn('flex flex-col items-center gap-1.5 px-6 py-8 text-center', subtle && 'opacity-80')}
    >
      <div className="mb-1 flex size-10 items-center justify-center rounded-full border border-border bg-muted/40 text-muted-foreground [&_svg]:size-5">
        {icon}
      </div>
      <div className="text-sm font-medium text-foreground">{title}</div>
      <p className="max-w-[260px] text-xs leading-relaxed text-muted-foreground">{children}</p>
    </motion.div>
  );
}

interface CorruptionRowProps {
  name: string;
  variant: 'item' | 'top';
  price: CorruptionPrice | null;
  selected: boolean;
  itemTitle: string;
  onSelect: () => void;
  onSocketSelect: (socketCount: number) => void;
  onOpenWeb: () => void;
}

function CorruptionRow({
  name,
  variant,
  price,
  selected,
  itemTitle,
  onSelect,
  onSocketSelect,
  onOpenWeb,
}: CorruptionRowProps) {
  const isTruncated = name.length > 40;
  const socketPrices = price?.socketPrices ?? [];
  const hasSocketPrices = socketPrices.length > 0;

  const nameElement = (
    <span
      className={cn(
        'block truncate pr-2 transition-colors',
        variant === 'item' ? 'text-q-corrupted' : 'text-muted-foreground group-hover/corr:text-foreground',
        isTruncated && 'cursor-help underline decoration-dotted underline-offset-2',
      )}
    >
      {name}
    </span>
  );

  const row = (
    <div
      role="button"
      tabIndex={-1}
      className={cn(
        'group/corr -mx-1.5 flex w-[calc(100%+0.75rem)] min-w-0 cursor-pointer items-center justify-between gap-2 rounded-md px-1.5 py-1 text-xs outline-none transition-colors duration-(--dur-fast) focus-visible:ring-2 focus-visible:ring-ring/60',
        selected ? 'bg-glow/12 ring-1 ring-inset ring-glow/50' : 'hover:bg-accent/60',
      )}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      title="Click to search for items with this corruption"
    >
      <div className="min-w-0 flex-1 overflow-hidden">
        {isTruncated ? (
          <Tooltip>
            <TooltipTrigger asChild>{nameElement}</TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{name}</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          nameElement
        )}
      </div>
      {price ? (
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-[10px] tabular-nums text-muted-foreground">({price.sampleCount})</span>
          <span className="font-semibold tabular-nums text-foreground">{price.medianPrice.toFixed(2)} HR</span>
          {hasSocketPrices && <ChevronRight aria-hidden
            className="-mr-0.5 size-3 text-muted-foreground" />}
        </div>
      ) : (
        <span className="shrink-0 text-[10px] text-muted-foreground">No price data</span>
      )}
    </div>
  );

  if (!price || !hasSocketPrices) return row;

  return (
    <HoverPopover
      side="bottom"
      content={
        <div className="min-w-[220px] rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-panel">
          <div className="mb-1 flex items-center justify-between gap-3 text-[10px] text-muted-foreground">
            <span className="truncate">{itemTitle}</span>
            <WebLink onClick={onOpenWeb}
              inPopover>
              Link
            </WebLink>
          </div>
          <div className="mb-2 text-xs font-semibold">{name} - Socket Prices</div>
          <div className="space-y-0.5">
            {socketPrices.map((socketPrice, socketIdx) => (
              <div
                key={socketIdx}
                role="button"
                tabIndex={-1}
                className="-mx-2 flex cursor-pointer items-center justify-between rounded-md px-2 py-1 text-xs outline-none transition-colors hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring/60"
                onClick={(e) => {
                  e.stopPropagation();
                  onSocketSelect(socketPrice.socketCount);
                }}
                title="Click to filter by this socket count"
              >
                <span className="text-muted-foreground">
                  {socketPrice.socketCount} Socket
                  {socketPrice.socketCount !== 1 ? 's' : ''}
                </span>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-[10px] tabular-nums text-muted-foreground">({socketPrice.sampleCount})</span>
                  <span className="font-semibold tabular-nums">{socketPrice.medianPrice.toFixed(2)} HR</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      }
    >
      {row}
    </HoverPopover>
  );
}

/** Small round indicator in a listing row (ethereal / corrupted / sockets). */
function ListingBadge({ label, tooltip, className }: { label: React.ReactNode; tooltip: string; className: string }) {
  return (
    <Tooltip disableHoverableContent={true}
      delayDuration={0}>
      <TooltipTrigger asChild>
        <div
          className={cn(
            'flex size-4 items-center justify-center rounded-full border text-[10px] font-bold leading-none tabular-nums shadow-xs',
            className,
          )}
        >
          {label}
        </div>
      </TooltipTrigger>
      <TooltipContent className="pointer-events-none">
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}

const ListingRow = ({ listing, idx }: { listing: MarketListingEntry; idx: number }) => {
  const [open, setOpen] = useState(false);
  const [whisperCopied, setWhisperCopied] = useState(false);
  const [onlineTooltipHover, setOnlineTooltipHover] = useState(false);
  const isCorrupted = itemCorruptions(listing.item).length > 0;
  const online = isUserOnlineIngame(listing.user_last_ingame);

  const copyWhisper = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const account = listing.user?.in_game_account || listing.user?.game?.accounts?.[0] || listing.user?.username || '';
    const itemName = listing.item?.name || listing.item?.base?.name || 'item';
    const priceStr = listing.hr_price ? `${listing.hr_price} HR` : listing.price || '';
    const message = whisperCommand(
      account,
      `Hi, I'm interested in your ${itemName}${priceStr ? ` listed for ${priceStr}` : ''}`,
    );
    try {
      await writeText(message);
      setWhisperCopied(true);
      setTimeout(() => setWhisperCopied(false), 3000);
    } catch (err) {
      console.error('Failed to copy whisper:', err);
    }
  };

  // Market listing items carry the stash item fields ItemStatsDisplay reads (modifiers, corruptions, flags).
  const statsItem = listing.item as unknown as GameStashItem;

  return (
    <Popover open={open}
      onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <tr
          className={cn(
            'group/row cursor-help transition-colors duration-(--dur-fast) hover:bg-accent/70 data-[state=open]:bg-accent/70',
            idx % 2 === 0 && 'bg-muted/40',
            'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:fill-mode-both motion-safe:duration-200',
          )}
          style={{ animationDelay: `${Math.min(idx % 20, 12) * 18}ms` }}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          {/* Price Column */}
          <td className="flex flex-row items-center justify-between whitespace-nowrap rounded-l-md px-2 py-1">
            <div className="mr-2 flex-1 truncate">
              {listing.hr_price ? (
                <span className="font-semibold tabular-nums text-foreground">{`${listing.hr_price} HR`}</span>
              ) : listing.price && listing.price.length > 40 ? (
                <HoverPopover
                  content={
                    <div className="max-w-xs break-words rounded-lg border border-border bg-popover p-2.5 text-sm text-popover-foreground shadow-panel">
                      {listing.price}
                    </div>
                  }
                >
                  {/* The full-note popover replaces the row's stats popover while the note is hovered. */}
                  <span
                    className="cursor-pointer text-foreground/90 underline decoration-muted-foreground decoration-dotted underline-offset-2"
                    onMouseEnter={() => setOpen(false)}
                    onMouseLeave={() => setOpen(true)}
                  >
                    {listing.price.slice(0, 40)}...
                  </span>
                </HoverPopover>
              ) : (
                <span className={listing.price ? 'text-foreground/90' : 'text-muted-foreground'}>
                  {listing.price || '-'}
                </span>
              )}
            </div>

            <div className="flex flex-row items-center gap-1">
              {/* Online Indicator */}
              {online && (
                <Tooltip
                  disableHoverableContent={true}
                  delayDuration={0}
                  open={whisperCopied || onlineTooltipHover}
                  onOpenChange={setOnlineTooltipHover}
                >
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={copyWhisper}
                      className={cn(
                        'mx-0.5 size-2.5 cursor-pointer rounded-full bg-success ring-2 ring-success/25 outline-none transition-[transform,box-shadow] duration-(--dur-fast) hover:scale-125 hover:ring-success/45 focus-visible:ring-ring/60',
                        whisperCopied && 'scale-125 ring-4 ring-success/40',
                      )}
                      aria-label="Copy whisper"
                    />
                  </TooltipTrigger>
                  <TooltipContent className="pointer-events-none">
                    <p className="flex items-center gap-1.5">
                      {whisperCopied && <Check className="size-3 text-success" />}
                      {whisperCopied
                        ? 'Copied whisper, right click to paste'
                        : 'Online in-game · click to copy whisper'}
                    </p>
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Ethereal Indicator */}
              {listing.item.is_ethereal && (
                <ListingBadge label="E"
                  tooltip="Ethereal"
                  className="border-border bg-foreground text-background" />
              )}

              {/* Corruption Indicator */}
              {isCorrupted && (
                <ListingBadge
                  label="C"
                  tooltip="Corrupted"
                  className="border-destructive/60 bg-destructive text-destructive-foreground"
                />
              )}

              {/* Sockets Indicator */}
              {(listing.item.socket_count || 0) > 0 && (
                <ListingBadge
                  label={listing.item.socket_count}
                  tooltip={`${listing.item.socket_count} ${listing.item.socket_count === 1 ? 'Socket' : 'Sockets'}`}
                  className="border-border bg-secondary text-secondary-foreground"
                />
              )}
            </div>
          </td>

          {/* Listed Column */}
          <td className="whitespace-nowrap rounded-r-md px-2 py-1 text-right text-xs tabular-nums text-muted-foreground">
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
        className="pointer-events-none w-auto border-0 bg-transparent p-0 shadow-none"
      >
        <div className="max-w-sm rounded-lg border border-border bg-popover p-2.5 text-popover-foreground shadow-panel">
          <ItemStatsDisplay stashItem={statsItem}
            isExpanded={true}
            onToggleExpanded={() => {}}
            hideToggle={true} />
          {listing.user?.username && (
            <div className="mt-2 flex items-center gap-1.5 border-t border-border pt-2 text-xs text-muted-foreground">
              <UserIcon className="size-3" />
              <span>
                Seller: <span className="text-foreground">{listing.user.username}</span>
              </span>
              {online && (
                <div className="size-2 rounded-full bg-success ring-2 ring-success/25"
                  title="Online in-game" />
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
