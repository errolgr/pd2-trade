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
import { WindowChrome, WindowPanel } from '@/components/custom/window-chrome';
import { cn } from '@/lib/utils';
import { DUR, EASE_OUT, fadeInUp, scaleIn, useReducedMotionSafe } from '@/lib/motion';
import { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import { qualityColor } from '../lib/qualityColor';
import { StatRow } from './StatRow';
import { useOptions } from '@/hooks/useOptions';
import { openUrl } from '@/lib/browser-opener';
import { Props } from '../lib/types';
import { useEconomyData } from '../hooks/useEconomyData';
import { useStatSelection } from '../hooks/useStatSelection';
import ItemStatsDisplay from '../../quick-list/components/ItemStatsDisplay';
import { BASE_QUALITIES, buildGetMarketListingQuery, buildTradeUrl, type QualitySearch } from '../lib/tradeUrlBuilder';
import {
  priceCheckServiceSearch,
  priceCheckToMarketFilters,
  type PriceCheckSearch,
} from '@/pages/market/store/priceCheckFilters';
import { useRelaxationCounts } from '@/pages/market/hooks/useRelaxations';
import { RelaxationChips, relaxationChips } from '@/pages/market/components/RelaxationChips';
import { FILTER_HIGHLIGHT_CLASS, Segmented } from '@/pages/market/components/controls';
import { type PriceCheckRelaxation, priceCheckRelaxations } from '../lib/relaxations';
import { statText } from '../lib/tooltip-lines';
import type { MarketFilters, ScoredListing } from '@/pages/market/lib/types';
import { withRowPresence } from '@/pages/market/lib/presence';
import { typeGroupOf } from '@/pages/market/lib/type-groups';
import { MarketBackendError, searchMarketListings } from '@/lib/market-search-api';
import { reportApiError } from '@/lib/error-reporting';
import { rememberListingPresence, useListingPresence } from '@/hooks/useListingPresence';
import { RunePricePopover } from './RunePricePopover';
import { getStatKey, PSEUDO_KEY_PREFIX, RANGE_FIELDS } from '../lib/utils';
import moment from 'moment';
import { HoverPopover } from '@/components/custom/hover-popover';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { useItems } from '@/hooks/useItems';
import type { MarketListingQuery } from '@/common/types/pd2-website/GetMarketListingsCommand';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { imageToast, showToast, useOverlay } from '@/overlay';
import { getSeasonById, getSeasonDateConfig } from '@/lib/seasons';
import { basisLabel, DEFAULT_PRICE_WINDOW_HOURS, priceWindowNote, windowLabel } from '@/lib/price-window';
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
import { StatId } from '../lib/stat-mappings';
import { corruptionNamesForRoll, sameCorruptionNames } from '../lib/corruptions';
import { corruptionOption } from '@/pages/market/lib/catalog';
import { isUserOnlineIngame } from '@/lib/user-online-status';
import { listingAge } from '@/pages/market/lib/listing';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { writePng, writeText } from '@/lib/browser-clipboard';
import { whisperCommand } from '@/lib/whisper-history';
import { buildItemCard, renderItemCard } from '../lib/item-card';
import { CaptureSweep } from './CaptureSweep';
import { useRareAppraisal } from '../hooks/useRareAppraisal';
import { RareAppraisalPill, RareAppraisalPillSkeleton } from './RareAppraisalPill';
import { appraisalNote } from '@/components/rares/rares-format';
import { PriceSparkline } from './PriceSparkline';
import { keyStatMin, matchRareStats } from '../lib/rare-stat-match';
import type { AppraisedStat } from '@/lib/rare-appraisal-api';
import { SimulatorButton } from './SimulatorButton';
import { currentLocale, Trans, useTranslation } from '@/i18n';

/** The header's "Any" quality: searches every base quality (e.g. Rare and Crafted together). */
const ANY_QUALITY = 'any' as const;

/** The search whose results are listed. */
interface ActiveSearch {
  /** The same search as a PD2 query: searches the market service can't express, and pages it fails to answer. */
  query: MarketListingQuery;
  marketFilters: MarketFilters;
  /** A selected row the market service can't filter (MarketFilterGap): PD2 answers every page. */
  pd2Only: boolean;
  /** A pseudo stat is selected: only the market service filters those, so PD2 never stands in. */
  hasPseudo: boolean;
  archived: boolean;
  searchMode: number;
  /** Listings fetched so far: the `$skip` of the next page. */
  skip: number;
}

/** The results' order, set from the column headers: price (HR) or listing bump time. */
interface ResultsSort {
  by: 'price' | 'bumped';
  dir: 'asc' | 'desc';
}

/** The header dots' seller filter: neither on = anyone; both on = sellers who are either. */
interface SellerFilter {
  inGame: boolean;
  onSite: boolean;
}

/** Whether a row's seller passes `filter` (by the presence the row shows, PD2's live times merged in). */
function sellerMatches(listing: MarketListingEntry, filter: SellerFilter): boolean {
  if (!filter.inGame && !filter.onSite) return true;
  return (
    (filter.inGame && isUserOnlineIngame(listing.user_last_ingame)) ||
    (filter.onSite && isUserOnlineIngame(listing.user_last_online))
  );
}

export default function ItemOverlayWidget({ item, statMapper, onClose }: Props) {
  const { t } = useTranslation(['priceCheck', 'common']);
  const { settings, isLoading: settingsLoading } = useOptions();
  const { getMarketListings, getMarketListingsArchive, marketApi } = usePd2Website();
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

  // Market listings state: the rows as fetched; `marketRows` below merges PD2's current seller presence in
  const [fetchedRows, setFetchedRows] = useState<ScoredListing[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [marketLoading, setMarketLoading] = useState(false);
  // `message` is the service's error text, when it sent one
  const [marketError, setMarketError] = useState<{ message?: string } | null>(null);
  const [searchArchived, setSearchArchived] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  // True once a new search has completed for the current item (drives the "no listings" empty state)
  const [searched, setSearched] = useState(false);
  // Set with filter changes that search as soon as they apply (corruption/socket price clicks, a Keep rare)
  const [searchPending, setSearchPending] = useState(false);
  /** The last search sent: what an empty result's relaxations widen (`pd2Only`: PD2 answered, nothing to count). */
  const [ranSearch, setRanSearch] = useState<{
    search: PriceCheckSearch;
    sort: MarketFilters['sort'];
    pd2Only: boolean;
  } | null>(null);
  const [selectedCorruptionNames, setSelectedCorruptionNames] = useState<string[]>([]);
  const ITEMS_PER_PAGE = 20;
  // Column-header sort and the header dots' seller filter; both outlive item changes (a habit, not a search)
  const [sort, setSort] = useState<ResultsSort>({ by: 'bumped', dir: 'desc' });
  const [sellerFilter, setSellerFilter] = useState<SellerFilter>({ inGame: false, onSite: false });
  // More pages continue this search's query, never the filters as edited since
  const activeSearch = useRef<ActiveSearch | null>(null);
  // Bumped by each new search and item change: a response for an older one is dropped
  const searchGeneration = useRef(0);
  // Seller presence pops in: rows render as the market service sent them, then PD2's current last-seen times
  // (asked with the user's token) merge in. Ended listings aren't on PD2's live market; rows PD2 itself sent carry
  // current presence already (remembered when they arrive).
  const presenceIds = useMemo(
    () => fetchedRows.filter((row) => !row.status || row.status === 'active').map((row) => row.listing._id),
    [fetchedRows],
  );
  const presence = useListingPresence(settings.pd2Token ? marketApi : null, presenceIds);
  const marketRows = useMemo(() => withRowPresence(fetchedRows, presence), [fetchedRows, presence]);
  const marketListings = useMemo(() => marketRows.map((row) => row.listing), [marketRows]);
  // The seller filter hides loaded rows only: the search (and its total) stay as they are, and scrolling, or a
  // short list keeping the loader in view, fetches more pages
  const sellerFiltered = sellerFilter.inGame || sellerFilter.onSite;
  const visibleRows = useMemo(
    () => (sellerFiltered ? marketRows.filter((row) => sellerMatches(row.listing, sellerFilter)) : marketRows),
    [marketRows, sellerFilter, sellerFiltered],
  );

  // Average price state for unique items
  const [averagePriceData, setAveragePriceData] = useState<AveragePriceResponse | null>(null);
  const [averagePriceLoading, setAveragePriceLoading] = useState(false);
  const [averagePriceError, setAveragePriceError] = useState<{ reason: 'noData' | 'failed'; message?: string } | null>(
    null,
  );

  // Corruption prices state
  const [corruptionPrices, setCorruptionPrices] = useState<CorruptionPricesResponse | null>(null);
  const [corruptionPricesLoading, setCorruptionPricesLoading] = useState(false);
  const [showAllCorruptions, setShowAllCorruptions] = useState(false);

  const { ref: loaderRef, inView } = useInView({
    threshold: 0,
    rootMargin: '100px',
  });

  // Search mode: 0 = category (base), 1 = typeLabel, 2 = the type's group
  const [searchMode, setSearchMode] = useState(0);
  // Quality override: null = use item's original quality; ANY_QUALITY = every base quality
  const [qualityOverride, setQualityOverride] = useState<ItemQuality | typeof ANY_QUALITY | null>(null);

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
  // The matched type's group ("Bows" for Amazon Bow): search mode 2
  const typeGroup = useMemo(
    () => (matchedItemType ? typeGroupOf(matchedItemType.typeValue) : undefined),
    [matchedItemType],
  );

  // Check if item should use toggle (only for base item qualities, not uniques/sets/runewords)
  const shouldUseToggle = BASE_QUALITIES.includes(item.quality);

  // The header cycles: the item's quality → Any → each other base quality → back
  const availableQualities = useMemo<(ItemQuality | typeof ANY_QUALITY)[]>(
    () => (shouldUseToggle ? [ANY_QUALITY, ...BASE_QUALITIES.filter((q) => q !== item.quality)] : []),
    [item.quality, shouldUseToggle],
  );

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
  /** What the searches filter on (undefined: the item's own quality, for uniques / sets / runewords). */
  const searchedQuality: QualitySearch | undefined = !shouldUseToggle
    ? undefined
    : effectiveQuality === ANY_QUALITY
      ? BASE_QUALITIES
      : effectiveQuality;

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
      searchedQuality,
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
    searchedQuality,
  ]);

  useEffect(() => {
    if (item) {
      // clear market listing result if new item is loaded; a search still in flight is for the old item
      searchGeneration.current += 1;
      activeSearch.current = null;
      setFetchedRows([]);
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
          setAveragePriceError({ reason: 'noData' });
          setAveragePriceLoading(false);
        }
      } catch (error: any) {
        console.error('[ItemOverlayWidget] Error fetching average price:', error);
        setAveragePriceError({ reason: 'failed', message: error.message || undefined });
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

  // The item's own corruption: stat 360 holds the cube corruption roll, priced under its market corruption names
  const itemCorruptions = useMemo(() => {
    if ((item.quality !== ItemQuality.Unique && item.quality !== ItemQuality.Set) || !pd2Item) return null;
    const roll = item.stats?.find((stat) => stat.stat_id === StatId.Corrupted)?.value;
    if (roll === undefined) return null;
    const corruptionKey = corruptionNamesForRoll(roll);
    if (!corruptionKey) {
      console.warn('[ItemOverlayWidget] Unknown corruption roll:', roll);
      return null;
    }
    const priceData =
      corruptionPrices?.corruptionPrices.find((corruption) =>
        sameCorruptionNames(corruption.corruptionKey, corruptionKey),
      ) ?? null;
    const corruptionName =
      priceData?.corruptionName ??
      corruptionKey
        .filter((name) => name !== 'dmg%')
        .map((name) => corruptionOption(name).label)
        .join(', ');
    return { corruptionKey, corruptionName, priceData };
  }, [item.stats, item.quality, corruptionPrices, pd2Item]);

  // Toggle search mode (only for items that support toggle)
  const toggleSearchMode = useCallback(() => {
    if (!shouldUseToggle) return; // Don't toggle for uniques/sets/runewords
    setSearchMode((prev) => {
      // Cycle through: 0 -> 1 -> 2 -> 0, skipping type without a matched item type and group without a type group
      const available = [true, !!matchedItemType, !!matchedItemType && !!typeGroup];
      let next = (prev + 1) % available.length;
      while (!available[next]) next = (next + 1) % available.length;
      return next;
    });
  }, [matchedItemType, typeGroup, shouldUseToggle]);

  // Get display text for current search mode
  const getSearchModeDisplay = useCallback(() => {
    switch (searchMode) {
      case 0:
        return t('overlay.header.base', { type: item.type });
      case 1:
        return matchedItemType
          ? t('overlay.header.type', { type: matchedItemType.typeLabel })
          : t('overlay.header.base', { type: item.type });
      case 2:
        return typeGroup
          ? t('overlay.header.group', { group: typeGroup.label })
          : t('overlay.header.base', { type: item.type });
      default:
        return t('overlay.header.base', { type: item.type });
    }
  }, [searchMode, item.type, matchedItemType, typeGroup, t]);

  const openCurrencyValuation = useCallback(() => openPanel('currency'), [openPanel]);

  const openListWindow = useCallback(() => {
    trackEvent('item_overlay_list_opened');
    openPanel('quickList', { item: encodeItemForQuickList(JSON.stringify(item)) }, { placement: 'cursor' });
  }, [item, openPanel]);

  /**
   * Fetches the next page of `search`, its first page when nothing is fetched yet: from the market service, or
   * PD2 for searches it can't express. A page the service fails (down, slow, rate limited, rejected filters) is
   * asked from PD2 instead and the failure reported, unless a pseudo stat (service only) is selected.
   */
  const fetchPage = useCallback(
    async (search: ActiveSearch) => {
      const generation = searchGeneration.current;
      const isNewSearch = search.skip === 0;
      const query = { ...search.query, $skip: search.skip };
      setMarketError(null);
      setMarketLoading(true);
      const startTime = performance.now();
      let source: 'service' | 'pd2' = search.pd2Only ? 'pd2' : 'service';

      const pd2Page = async () => {
        const page = search.archived ? await getMarketListingsArchive(query) : await getMarketListings(query);
        // null: PD2 refused the token and sign-in started
        if (!page) throw new Error();
        // PD2's rows carry the sellers' current presence: nothing to pop in
        rememberListingPresence(page.data);
        return {
          rows: page.data.map((listing): ScoredListing => ({ listing, pseudo: {}, score: null, value: null })),
          total: page.total,
          fetched: page.fetched,
        };
      };

      try {
        let result: { rows: ScoredListing[]; total: number; fetched: number };
        if (search.pd2Only) result = await pd2Page();
        else {
          try {
            const page = await searchMarketListings(search.marketFilters, {
              page: search.skip / ITEMS_PER_PAGE,
              limit: ITEMS_PER_PAGE,
            });
            result = { rows: page.items, total: page.total, fetched: page.fetched };
          } catch (e) {
            if (!(e instanceof MarketBackendError) || search.hasPseudo) throw e;
            reportApiError(e, 'market-service', '/api/market/search', e.status, {
              kind: e.kind,
              fallback: 'pd2',
              archived: search.archived,
            });
            source = 'pd2';
            result = await pd2Page();
          }
        }
        if (generation !== searchGeneration.current) return;

        const duration = performance.now() - startTime;

        if (isNewSearch) {
          setFetchedRows(result.rows);
          setTotalCount(result.total);
          setSearched(true);
        } else {
          setFetchedRows((prev) => {
            // Filter duplicates
            const existingIds = new Set(prev.map((row) => row.listing._id));
            return [...prev, ...result.rows.filter((row) => !existingIds.has(row.listing._id))];
          });
        }

        search.skip += ITEMS_PER_PAGE;
        // A full page of rows, not of listings shown (item-less ones are dropped), means more may follow
        setHasMore(result.fetched === ITEMS_PER_PAGE);

        trackMeasurement(
          'item_overlay_market_search',
          {
            duration_ms: duration,
            returned_items: result.rows.length,
            total_items: isNewSearch ? result.total : undefined,
          },
          {
            outcome: 'success',
            archived: search.archived,
            market_service: source === 'service',
            search_mode: search.searchMode,
            page: query.$skip / ITEMS_PER_PAGE,
          },
        );
      } catch (e) {
        if (generation !== searchGeneration.current) return;
        const duration = performance.now() - startTime;
        trackMeasurement(
          'item_overlay_market_search',
          { duration_ms: duration },
          { outcome: 'error', archived: search.archived, search_mode: search.searchMode },
        );
        const message = e instanceof Error ? e.message : '';
        console.log(message || 'Failed to fetch market listings');
        setMarketError({ message: message || undefined });
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
        qualityOverride: searchedQuality,
      };
      const serviceSort = { by: sort.by, dir: sort.dir };
      const { filters: marketFilters, gaps } = priceCheckServiceSearch(priceCheck, serviceSort);
      const hasPseudo = [...selected].some((key) => key.startsWith(PSEUDO_KEY_PREFIX));
      const query = buildGetMarketListingQuery(
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
        searchedQuality,
      );
      const order = sort.dir === 'desc' ? -1 : 1;
      const search: ActiveSearch = {
        // PD2 ranks unpriced listings (hr_price 0) first in ascending price order: those can't be ranked, so drop them
        query:
          sort.by === 'price'
            ? { ...query, $sort: { hr_price: order }, ...(order === 1 && { hr_price: { $gt: 0 } }) }
            : { ...query, $sort: { bumped_at: order } },
        marketFilters,
        // PD2 can't filter pseudo stats either: with one selected the service answers, without the gapped row
        pd2Only: gaps.length > 0 && !hasPseudo,
        hasPseudo,
        archived: searchArchived,
        searchMode: effectiveSearchMode,
        skip: 0,
      };
      searchGeneration.current += 1;
      // The relaxations of an empty search widen this search, not controls changed since
      setRanSearch({ search: priceCheck, sort: serviceSort, pd2Only: search.pd2Only });
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
      searchedQuality,
      sort,
      fetchPage,
    ],
  );

  // Search button, Enter and Retry: a manual search drops the corruption filter a corruption price click set
  const handleSearch = () => {
    setSelectedCorruptionNames([]);
    runSearch([]);
  };

  // Column headers: another column sorts descending (priciest / newest first), the same one again flips it
  const sortBy = (by: ResultsSort['by']) => {
    setSort((prev) => (prev.by === by ? { by, dir: prev.dir === 'desc' ? 'asc' : 'desc' } : { by, dir: 'desc' }));
    if (searched) setSearchPending(true);
  };

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
      qualityOverride: searchedQuality,
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
        new Date().toLocaleDateString(currentLocale(), { month: 'short', day: 'numeric', year: 'numeric' }),
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
        title: t('overlay.copyImage.copiedTitle'),
        description: t('overlay.copyImage.copiedDescription'),
        imageUrl: URL.createObjectURL(png),
      });
    } catch (error) {
      console.error('[ItemOverlayWidget] Failed to copy the item image:', error);
      showToast({ title: t('overlay.copyImage.failedTitle'), description: String(error), variant: 'error' });
    } finally {
      setCopyingImage(false);
    }
  };

  // Top corruptions exclude the item's own corruption (shown in its own section)
  const otherCorruptions = useMemo(
    () => corruptionPrices?.corruptionPrices.filter((corruption) => corruption !== itemCorruptions?.priceData) ?? [],
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
        selectedCorruptionNames.length > 0 && sameCorruptionNames(corruption.corruptionKey, selectedCorruptionNames)
      }
      itemTitle={displayTitle}
      onSelect={() => handleCorruptionClick(corruption.corruptionKey)}
      onSocketSelect={(socketCount) => handleSocketClick(socketCount, corruption.corruptionKey)}
      onOpenWeb={openPd2Trader}
    />
  );

  const showIdleHint = !searched && !marketLoading && !marketError && marketListings.length === 0;
  const showNoResults = searched && !marketLoading && !marketError && marketListings.length === 0;
  // A search that found nothing (not just hidden by the seller filter): count what each relaxation would find
  const relaxCandidates = useMemo(
    () =>
      showNoResults && totalCount === 0 && ranSearch && !ranSearch.pd2Only
        ? priceCheckRelaxations(ranSearch.search, ranSearch.sort, {
            searchType: shouldUseToggle && !!matchedItemType,
            searchTypeGroup: shouldUseToggle && !!matchedItemType && !!typeGroup,
            anyQuality: shouldUseToggle,
          })
        : null,
    [showNoResults, totalCount, ranSearch, shouldUseToggle, matchedItemType, typeGroup],
  );
  const relaxations = useRelaxationCounts(searchMarketListings, relaxCandidates);
  // The suggestion the pointer is on: the rows or header control it would change are ringed (only while shown)
  const [hoveredRelax, setHoveredRelax] = useState<string | null>(null);
  const hoveredRelaxation = relaxations?.find((r) => r.id === hoveredRelax)?.value;
  const markedRows = useMemo(() => {
    switch (hoveredRelaxation?.kind) {
      case 'stat':
        return new Set([hoveredRelaxation.key]);
      case 'ranges':
        return new Set([...selected].filter((k) => RANGE_FIELDS.some((field) => !!filters[k]?.[field])));
      case 'corrupted':
        return new Set([`id:${StatId.Corrupted}`]);
      default:
        return new Set<string>();
    }
  }, [hoveredRelaxation, selected, filters]);
  /** A relaxation's chip: the filter it drops (the base, the quality, a stat row…). */
  const relaxationLabel = (r: PriceCheckRelaxation): string => {
    switch (r.kind) {
      case 'ranges':
        return t('overlay.results.relax.ranges');
      case 'stat': {
        const row = sortedStats.find((s) => getStatKey(s) === r.key);
        return row ? (statText(row, item) ?? row.name) : r.key;
      }
      case 'type':
        return item.type;
      case 'typeGroup':
        return matchedItemType?.typeLabel ?? item.type;
      case 'quality': {
        const quality = ranSearch?.search.qualityOverride;
        return typeof quality === 'string' ? quality : item.quality;
      }
      case 'corrupted':
        return ranSearch?.search.corruptedState === 2
          ? t('overlay.results.relax.notCorrupted')
          : t('overlay.results.relax.corrupted');
      case 'corruptions':
        return t('overlay.results.relax.corruptions');
    }
  };
  /** Picks a relaxation: the one change on the controls, then the search again. */
  const relax = (r: PriceCheckRelaxation) => {
    trackEvent('item_overlay_relax_search', { kind: r.kind });
    switch (r.kind) {
      case 'ranges':
        clearAllRanges();
        break;
      case 'stat':
        setSelected((prev) => new Set([...prev].filter((k) => k !== r.key)));
        setFilters(({ [r.key]: _dropped, ...rest }) => rest);
        break;
      case 'type':
        setSearchMode(1);
        break;
      case 'typeGroup':
        setSearchMode(2);
        break;
      case 'quality':
        setQualityOverride(ANY_QUALITY);
        break;
      case 'corrupted':
        setCorruptedState(0);
        setSelected((prev) => new Set([...prev].filter((k) => k !== `id:${StatId.Corrupted}`)));
        break;
      case 'corruptions':
        setSelectedCorruptionNames([]);
        break;
    }
    setSearchPending(true);
  };

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
              title={t('overlay.title')}
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
                  <ToolbarButton label={t('overlay.toolbar.netWorth')}
                    onClick={openCurrencyValuation}>
                    <LuggageIcon />
                  </ToolbarButton>
                </span>
              }
              actions={
                <>
                  <UpdatePill />
                  <ToolbarButton label={t('overlay.toolbar.copyImage')}
                    onClick={copyItemImage}>
                    {copyingImage ? <Loader2 className="animate-spin" /> : <ImageDown />}
                  </ToolbarButton>
                  <ToolbarButton label={t('overlay.toolbar.settings')}
                    onClick={openSettingsPage}>
                    <SettingsIcon />
                  </ToolbarButton>
                </>
              }
              onClose={onClose}
              closeLabel={t('common:actions.close')}
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
                      title={t('overlay.header.toggleSearchMode')}
                      className="text-muted-foreground"
                      marked={hoveredRelaxation?.kind === 'type' || hoveredRelaxation?.kind === 'typeGroup'}
                    >
                      {getSearchModeDisplay()}
                    </HeaderToggle>
                  ) : (
                    <div className="px-1.5 text-muted-foreground"
                      style={{ fontFamily: 'DiabloFont' }}>
                      {t('overlay.header.base', { type: item.type })}
                    </div>
                  )}
                  {shouldUseToggle && (
                    <>
                      <span aria-hidden
                        className="h-4 w-px bg-border" />
                      <HeaderToggle
                        onClick={cycleQuality}
                        title={t('overlay.header.cycleQuality')}
                        className={
                          effectiveQuality === ANY_QUALITY ? 'text-foreground' : qualityColor(effectiveQuality)
                        }
                        marked={hoveredRelaxation?.kind === 'quality'}
                      >
                        {effectiveQuality === ANY_QUALITY ? t('overlay.header.anyQuality') : effectiveQuality}
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
                <Trans
                  t={t}
                  i18nKey="overlay.header.defense"
                  values={{ defense: item.defense }}
                  components={{ value: <span className="font-semibold tabular-nums text-foreground" /> }}
                />
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
                {t('overlay.header.appraisalNote', { note: appraisalNoteText.text })}
              </span>
            )}

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
                        {t('overlay.price.loading')}
                      </span>
                    </div>
                  </div>
                )}
                {averagePriceError && !averagePriceLoading && (
                  <div className="inline-flex items-center gap-1.5 rounded-md bg-destructive/10 px-2 py-1 text-xs text-destructive">
                    <AlertCircle className="size-3.5" />
                    {averagePriceError.reason === 'noData'
                      ? t('overlay.price.noData')
                      : averagePriceError.message || t('overlay.price.fetchFailed')}
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
                            <PopoverTile label={t('overlay.price.median')}>
                              {averagePriceData.medianPrice.toFixed(2)} HR
                            </PopoverTile>
                            <PopoverTile label={t('overlay.price.min')}>
                              {averagePriceData.minPrice.toFixed(2)} HR
                            </PopoverTile>
                            <PopoverTile label={t('overlay.price.max')}>
                              {averagePriceData.maxPrice.toFixed(2)} HR
                            </PopoverTile>
                          </div>
                          <div className="space-y-1 border-t border-border pt-2 text-xs">
                            <PopoverKeyValue label={t('overlay.price.samples')}>
                              {averagePriceData.sampleCount}
                            </PopoverKeyValue>
                            {averagePriceData.priceChange7Days && (
                              <PopoverKeyValue label={t('overlay.price.change7d')}>
                                <ChangeLabel
                                  change={averagePriceData.priceChange7Days.change}
                                  percent={averagePriceData.priceChange7Days.changePercent}
                                />
                              </PopoverKeyValue>
                            )}
                          </div>
                          <div className="space-y-1.5 border-t border-border pt-2">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-xs font-semibold">{t('overlay.price.last30Days')}</span>
                              <WebLink onClick={openPd2Trader}
                                inPopover>
                                {t('overlay.price.openOnPd2Trader')}
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
                                {t('overlay.corruptions.thisItem')}
                              </PopoverSectionTitle>
                              {renderCorruptionRow(itemCorruptions, itemCorruptions.priceData, 'item')}
                            </div>
                          )}
                          {/* Corruption Prices */}
                          {corruptionPrices && corruptionPrices.corruptionPrices.length > 0 && (
                            <div className="border-t border-border pt-2">
                              <PopoverSectionTitle>{t('overlay.corruptions.top')}</PopoverSectionTitle>
                              {showAllCorruptions ? (
                                <ScrollArea
                                  className="w-full overflow-x-hidden [&_[data-radix-scroll-area-viewport]>div]:!block"
                                  viewportClassName="max-h-[200px]"
                                >
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
                                      {t('overlay.corruptions.showLess')}
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="size-3" />
                                      {t('overlay.corruptions.showMore', { count: otherCorruptions.length - 5 })}
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          )}
                          {corruptionPricesLoading && (
                            <div className="flex items-center gap-1.5 border-t border-border pt-2 text-xs text-muted-foreground">
                              <Loader2 className="size-3 animate-spin" />
                              {t('overlay.corruptions.loading')}
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
                    <span className="text-xs text-muted-foreground">{t('overlay.price.noData')}</span>
                    <WebLink onClick={openPd2Trader}>{t('overlay.price.viewOnWeb')}</WebLink>
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
                    {t('overlay.stats.title')}
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
                        <span className="tabular-nums">{t('overlay.stats.selected', { count: selected.size })}</span>
                        {/* Empties every selected stat's min / max (stats stay selected); only while one is set */}
                        {hasAnyRange && (
                          <>
                            <span aria-hidden>·</span>
                            <button
                              type="button"
                              onClick={clearAllRanges}
                              title={t('overlay.stats.clearRangesTitle')}
                              className="rounded-sm underline-offset-2 outline-none transition-colors hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring/60"
                            >
                              {t('overlay.stats.clearRanges')}
                            </button>
                          </>
                        )}
                        <span aria-hidden>·</span>
                        <button
                          type="button"
                          onClick={clearSelectedStats}
                          title={t('overlay.stats.clearTitle')}
                          className="rounded-sm underline-offset-2 outline-none transition-colors hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring/60"
                        >
                          {t('common:actions.clear')}
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
                            marked={markedRows.has(getStatKey(s))}
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
                <Button className="min-w-24 cursor-pointer has-[>svg]:pr-4"
                  onClick={handleSearch}>
                  {marketLoading ? <Loader2 className="animate-spin" /> : <SearchIcon />}
                  {t('common:actions.search')}
                </Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      aria-label={t('overlay.actions.openInMarket')}
                      className="cursor-pointer border-l border-primary-foreground/15 px-3"
                      onClick={openInMarket}
                    >
                      <Store />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">{t('overlay.actions.openInMarket')}</TooltipContent>
                </Tooltip>
              </ButtonGroup>

              {/* Secondary actions: the same search on projectdiablo2.com, listing the item */}
              <ButtonGroup>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      aria-label={t('overlay.actions.openTrade')}
                      className="cursor-pointer px-3 text-muted-foreground hover:text-foreground"
                      onClick={openTradeUrl}
                    >
                      <SquareArrowOutUpRight />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">{t('overlay.actions.openTrade')}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    {/* aria-disabled, not disabled: the tooltip still explains why listing is off */}
                    <Button
                      variant="outline"
                      aria-label={t('overlay.actions.list')}
                      aria-disabled={!canList}
                      className="cursor-pointer px-3 text-muted-foreground hover:text-foreground aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:bg-background/60 aria-disabled:hover:text-muted-foreground"
                      onClick={canList ? openListWindow : undefined}
                    >
                      <ListPlus />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top"
                    className={canList ? undefined : 'max-w-60'}>
                    {canList ? t('overlay.actions.list') : t('overlay.actions.listDisabled')}
                  </TooltipContent>
                </Tooltip>
              </ButtonGroup>

              <SimulatorButton item={item}
                className="ml-auto" />
            </div>

            {/* Results bar: which listings the search covers (picking one searches again), then what it found */}
            <div className="-mb-1 flex flex-none items-center gap-2 pr-2 text-xs text-muted-foreground">
              <Segmented
                label={t('overlay.results.source.label')}
                value={searchArchived ? 'expired' : 'live'}
                onChange={(source) => {
                  setSearchArchived(source === 'expired');
                  if (searched || marketLoading) setSearchPending(true);
                }}
                options={[
                  { value: 'live', label: t('overlay.results.source.live') },
                  { value: 'expired', label: t('overlay.results.source.expired') },
                ]}
                className="w-36 flex-none rounded-lg border-0 bg-muted"
                selectedClassName="bg-primary/15 text-primary shadow-none ring-1 ring-inset ring-primary/70 hover:text-primary"
              />
              {marketListings.length > 0 && (
                <>
                  <span>
                    <Trans
                      t={t}
                      i18nKey="overlay.results.matches"
                      values={{ total: totalCount }}
                      components={{ value: <span className="font-semibold tabular-nums text-foreground" /> }}
                    />
                  </span>
                  {marketListings.length < totalCount && (
                    <span className="tabular-nums">
                      {t('overlay.results.showing', { shown: marketListings.length })}
                    </span>
                  )}
                  {sellerFiltered && (
                    <span className="tabular-nums">
                      {t(
                        sellerFilter.inGame && sellerFilter.onSite
                          ? 'overlay.results.filteredOnline'
                          : sellerFilter.inGame
                            ? 'overlay.results.filteredInGame'
                            : 'overlay.results.filteredOnSite',
                        { count: visibleRows.length },
                      )}
                    </span>
                  )}
                </>
              )}
              {marketLoading && <Loader2 className="size-3 animate-spin" />}
            </div>

            <ScrollArea className="min-h-0 flex-1">
              {marketLoading && marketListings.length === 0 && (
                <div aria-busy="true">
                  <div className="flex items-center justify-center gap-2 p-3 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    <span>{t('overlay.results.loading')}</span>
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
                    <div className="font-medium">{t('overlay.results.errorTitle')}</div>
                    <div className="text-xs break-words opacity-90">
                      {marketError.message || t('overlay.results.fetchFailed')}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 shrink-0 text-destructive hover:bg-destructive/15 hover:text-destructive"
                    onClick={handleSearch}
                  >
                    <RotateCw />
                    {t('common:actions.retry')}
                  </Button>
                </motion.div>
              )}
              {showNoResults && (
                <EmptyState
                  icon={<SearchX />}
                  title={relaxations?.length ? t('overlay.results.relax.title') : t('overlay.results.noListings')}
                  action={
                    (relaxations?.length || !searchArchived) && (
                      <div className="flex flex-col items-center gap-2">
                        {!!relaxations?.length && (
                          <RelaxationChips
                            chips={relaxationChips(relaxations, relaxationLabel)}
                            onPick={(id) => {
                              const picked = relaxations.find((r) => r.id === id);
                              if (picked) relax(picked.value);
                            }}
                            onHover={setHoveredRelax}
                          />
                        )}
                        {!searchArchived && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => {
                              setSearchArchived(true);
                              setSearchPending(true);
                            }}
                          >
                            {t('overlay.results.relax.showExpired')}
                          </Button>
                        )}
                      </div>
                    )
                  }
                >
                  {relaxations?.length
                    ? t('overlay.results.relax.hint')
                    : searchArchived
                      ? t('overlay.results.loosenFilters')
                      : t('overlay.results.loosenFiltersOrExpired')}
                </EmptyState>
              )}
              {showIdleHint && (
                <EmptyState icon={<SearchIcon />}
                  title={t('overlay.results.readyTitle')}
                  subtle>
                  {t('overlay.results.readyHint')}
                </EmptyState>
              )}
              {marketListings.length > 0 && (
                <div className="mt-1 pr-3">
                  <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
                    <thead>
                      <tr>
                        <th
                          aria-sort={sort.by === 'price' ? (sort.dir === 'desc' ? 'descending' : 'ascending') : 'none'}
                          className="sticky top-0 z-10 w-full border-b border-border bg-surface-elevated px-2 py-1 text-[11px] font-medium text-muted-foreground"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <SortHeader
                              label={t('overlay.results.price')}
                              title={t('overlay.results.sortPrice')}
                              active={sort.by === 'price'}
                              dir={sort.dir}
                              onClick={() => sortBy('price')}
                            />
                            <SellerFilterMenu filter={sellerFilter}
                              onChange={setSellerFilter} />
                          </div>
                        </th>
                        <th
                          aria-sort={sort.by === 'bumped' ? (sort.dir === 'desc' ? 'descending' : 'ascending') : 'none'}
                          className="sticky top-0 z-10 w-[1%] whitespace-nowrap border-b border-border bg-surface-elevated px-2 py-1 text-right text-[11px] font-medium text-muted-foreground"
                        >
                          <SortHeader
                            label={t('overlay.results.age')}
                            title={t('overlay.results.sortListed')}
                            active={sort.by === 'bumped'}
                            dir={sort.dir}
                            onClick={() => sortBy('bumped')}
                          />
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleRows.map((row, idx) => (
                        <ListingRow key={row.listing._id || idx}
                          row={row}
                          idx={idx} />
                      ))}
                      {visibleRows.length === 0 && (
                        <tr>
                          <td colSpan={2}
                            className="px-2 py-3 text-center text-xs text-muted-foreground">
                            {hasMore ? t('overlay.results.loadingMore') : t('overlay.results.noSellerMatch')}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  {/* Load more trigger */}
                  {hasMore && (
                    <div
                      ref={loaderRef}
                      className="flex items-center justify-center gap-1.5 py-2.5 text-xs text-muted-foreground"
                    >
                      {marketLoading && <Loader2 className="size-3 animate-spin" />}
                      {marketLoading ? t('overlay.results.loadingMore') : t('overlay.results.loadMore')}
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
  const { t } = useTranslation('priceCheck');
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
      ? t('overlay.update.updating')
      : state === 'failed'
        ? t('overlay.update.retry')
        : state === 'manual'
          ? t('overlay.update.get')
          : t('overlay.update.restart');
  const hint =
    state === 'failed'
      ? t('overlay.update.failedHint', { version })
      : state === 'manual'
        ? t('overlay.update.manualHint', { version })
        : t('overlay.update.availableHint', { version });
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
  marked,
  children,
}: {
  onClick: () => void;
  title: string;
  className?: string;
  /** An empty search's hovered suggestion would change this: ringed. */
  marked?: boolean;
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
        marked && FILTER_HIGHLIGHT_CLASS,
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
  action,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtle?: boolean;
  /** Under the text, e.g. the no-results search suggestions. */
  action?: React.ReactNode;
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
      {action && <div className="mt-2">{action}</div>}
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
  const { t } = useTranslation('priceCheck');
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
      title={t('overlay.corruptions.searchTitle')}
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
        <span className="shrink-0 text-[10px] text-muted-foreground">{t('overlay.corruptions.noPriceData')}</span>
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
              {t('overlay.corruptions.link')}
            </WebLink>
          </div>
          <div className="mb-2 text-xs font-semibold">{t('overlay.corruptions.socketPrices', { name })}</div>
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
                title={t('overlay.corruptions.filterBySocket')}
              >
                <span className="text-muted-foreground">
                  {t('overlay.sockets', { count: socketPrice.socketCount })}
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

/** Small rounded-square tag in a listing row (ethereal / corrupted / sockets): square = the item, round = the seller. */
function ListingBadge({ label, tooltip, className }: { label: React.ReactNode; tooltip: string; className: string }) {
  return (
    <Tooltip disableHoverableContent={true}
      delayDuration={0}>
      <TooltipTrigger asChild>
        <div
          className={cn(
            'flex size-4 items-center justify-center rounded-[4px] border text-[10px] font-bold leading-none tabular-nums shadow-xs',
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

/** An empty tag slot: keeps the other tags in their columns. */
function BadgeSlot() {
  return <span aria-hidden
    className="size-4" />;
}

/** A sortable column header: the active one reads in full with its direction's arrow. */
function SortHeader({
  label,
  title,
  active,
  dir,
  onClick,
}: {
  label: string;
  title: string;
  active: boolean;
  dir: ResultsSort['dir'];
  onClick: () => void;
}) {
  const Arrow = dir === 'desc' ? ChevronDown : ChevronUp;
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'cursor-pointer inline-flex items-center gap-0.5 rounded-sm py-0.5 uppercase tracking-[0.12em] outline-none transition-colors duration-(--dur-fast) hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60',
        active && 'font-semibold text-foreground',
      )}
    >
      {label}
      {active && <Arrow aria-hidden
        className="size-3" />}
    </button>
  );
}

/**
 * A seller's presence as one mark: in game (green, left) overlapping on the trade site (blue, right); a faded half
 * is a no. The same mark heads the column as the seller filter.
 */
function PresenceMark({ inGame, onSite }: { inGame: boolean; onSite: boolean }) {
  const half = 'size-2 rounded-full ring-[1.5px] ring-surface-elevated transition-colors duration-(--dur-fast)';
  return (
    <span aria-hidden
      className="flex items-center">
      <span className={cn(half, 'relative z-10', inGame ? 'bg-success' : 'bg-muted-foreground/35')} />
      <span className={cn(half, '-ml-0.5', onSite ? 'bg-info' : 'bg-muted-foreground/35')} />
    </span>
  );
}

const SELLER_OPTIONS: { key: 'anyone' | 'inGame' | 'onSite' | 'either'; filter: SellerFilter }[] = [
  { key: 'anyone', filter: { inGame: false, onSite: false } },
  { key: 'inGame', filter: { inGame: true, onSite: false } },
  { key: 'onSite', filter: { inGame: false, onSite: true } },
  { key: 'either', filter: { inGame: true, onSite: true } },
];

const SELLER_LABEL_KEYS = {
  anyone: 'overlay.results.sellerAnyone',
  inGame: 'overlay.results.sellerInGame',
  onSite: 'overlay.results.sellerOnSite',
  either: 'overlay.results.sellerEither',
} as const;

/** The seller filter: the column's presence mark (lit halves = the current choice) opening the four choices. */
function SellerFilterMenu({ filter, onChange }: { filter: SellerFilter; onChange: (filter: SellerFilter) => void }) {
  const { t } = useTranslation('priceCheck');
  const [open, setOpen] = useState(false);
  const filtered = filter.inGame || filter.onSite;
  return (
    <Popover open={open}
      onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t('overlay.results.sellerFilter')}
          title={t('overlay.results.sellerFilter')}
          className={cn(
            'cursor-pointer flex h-4 w-5 flex-none items-center justify-center rounded-full outline-none transition-shadow duration-(--dur-fast) hover:ring-1 hover:ring-border focus-visible:ring-2 focus-visible:ring-ring/60',
            filtered && 'ring-1 ring-foreground/30',
          )}
        >
          <PresenceMark inGame={filter.inGame}
            onSite={filter.onSite} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end"
        className="w-52 p-1">
        <div role="menu"
          aria-label={t('overlay.results.sellerFilter')}>
          <div className="px-2 pb-1 pt-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {t('overlay.results.seller')}
          </div>
          {SELLER_OPTIONS.map((option) => {
            const checked = option.filter.inGame === filter.inGame && option.filter.onSite === filter.onSite;
            return (
              <button
                key={option.key}
                type="button"
                role="menuitemradio"
                aria-checked={checked}
                onClick={() => {
                  onChange(option.filter);
                  setOpen(false);
                }}
                className={cn(
                  'cursor-pointer flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs outline-none transition-colors duration-(--dur-fast) hover:bg-accent focus-visible:bg-accent',
                  checked ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                <span className="flex w-5 justify-center">
                  <PresenceMark inGame={option.filter.inGame}
                    onSite={option.filter.onSite} />
                </span>
                <span className="flex-1">{t(SELLER_LABEL_KEYS[option.key])}</span>
                {checked && <Check aria-hidden
                  className="size-3.5 text-primary" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** How an ended listing's row reads ("sold after 2 days"), by status. */
const ENDED_KEYS = {
  sold: 'overlay.listing.endedSold',
  removed: 'overlay.listing.endedRemoved',
  expired: 'overlay.listing.endedExpired',
} as const;

const ListingRow = ({ row, idx }: { row: ScoredListing; idx: number }) => {
  const { t } = useTranslation('priceCheck');
  const { listing } = row;
  const [open, setOpen] = useState(false);
  const [whisperCopied, setWhisperCopied] = useState(false);
  const [presenceTooltipHover, setPresenceTooltipHover] = useState(false);
  const isCorrupted = itemCorruptions(listing.item).length > 0;
  const online = isUserOnlineIngame(listing.user_last_ingame);
  const onSite = isUserOnlineIngame(listing.user_last_online);
  const presenceText = `${online ? t('overlay.listing.inGame') : t('overlay.listing.notInGame')} · ${
    onSite ? t('overlay.listing.onSite') : t('overlay.listing.notOnSite')
  }`;
  // Market service rows: how long the listing was up and, once it ended, how
  const ended = row.status && row.status !== 'active' ? row.status : null;
  const upFor =
    typeof row.durationSeconds === 'number' ? moment.duration(row.durationSeconds, 'seconds').humanize() : null;
  const listedTitle = ended
    ? row.endedAt
      ? t('overlay.listing.endedAt', { when: moment(row.endedAt).fromNow() })
      : undefined
    : upFor
      ? t('overlay.listing.listedFor', { duration: upFor })
      : undefined;

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
          <td className="flex flex-row items-center gap-2 whitespace-nowrap rounded-l-md px-2 py-1">
            <div className="flex-1 truncate">
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

            {/* Item tags in fixed slots (ethereal · corrupted · sockets), so they line up down the list */}
            <div className="flex flex-row items-center gap-1">
              {listing.item.is_ethereal ? (
                <ListingBadge label="E"
                  tooltip="Ethereal"
                  className="border-border bg-foreground text-background" />
              ) : (
                <BadgeSlot />
              )}
              {isCorrupted ? (
                <ListingBadge
                  label="C"
                  tooltip="Corrupted"
                  className="border-destructive/60 bg-destructive text-destructive-foreground"
                />
              ) : (
                <BadgeSlot />
              )}
              {(listing.item.socket_count || 0) > 0 ? (
                <ListingBadge
                  label={listing.item.socket_count}
                  tooltip={t('overlay.sockets', { count: listing.item.socket_count })}
                  className="border-border bg-secondary text-secondary-foreground"
                />
              ) : (
                <BadgeSlot />
              )}
            </div>
            {/* Seller presence, under the column's filter mark; clicking it when they're in game copies a whisper */}
            <Tooltip
              disableHoverableContent={true}
              delayDuration={0}
              open={whisperCopied || presenceTooltipHover}
              onOpenChange={setPresenceTooltipHover}
            >
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={online ? copyWhisper : (e) => e.stopPropagation()}
                  aria-label={online ? t('overlay.listing.copyWhisper') : presenceText}
                  className={cn(
                    'flex h-4 w-5 flex-none items-center justify-center rounded-full outline-none transition-transform duration-(--dur-fast) focus-visible:ring-2 focus-visible:ring-ring/60',
                    online ? 'cursor-pointer hover:scale-125' : 'cursor-default',
                    whisperCopied && 'scale-125',
                  )}
                >
                  <PresenceMark inGame={online}
                    onSite={onSite} />
                </button>
              </TooltipTrigger>
              <TooltipContent className="pointer-events-none">
                <p className="flex items-center gap-1.5">
                  {whisperCopied && <Check className="size-3 text-success" />}
                  {whisperCopied
                    ? t('overlay.listing.whisperCopied')
                    : online
                      ? t('overlay.listing.presenceWhisper', { presence: presenceText })
                      : presenceText}
                </p>
              </TooltipContent>
            </Tooltip>
          </td>

          {/* Listed Column: bump age; for ended listings how long they were up ("sold after 2 days") */}
          <td
            className="whitespace-nowrap rounded-r-md px-2 py-1 text-right text-xs tabular-nums text-muted-foreground"
            title={listedTitle}
          >
            {ended && upFor ? t(ENDED_KEYS[ended], { duration: upFor }) : listingAge(listing) || '-'}
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
                <Trans
                  t={t}
                  i18nKey="overlay.listing.seller"
                  values={{ seller: listing.user.username }}
                  components={{ name: <span className="text-foreground" /> }}
                />
              </span>
              {online && (
                <div
                  className="size-2 rounded-full bg-success ring-2 ring-success/25"
                  title={t('overlay.listing.online')}
                />
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
