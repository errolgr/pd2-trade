import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowUp,
  Check,
  ChevronDown,
  ChevronsUp,
  CircleAlert,
  Clock,
  Loader2,
  Pencil,
  RotateCw,
  SquareArrowOutUpRight,
  Store,
  Trash2,
  Search,
  SearchX,
  X as XIcon,
} from 'lucide-react';
import Fuse from 'fuse.js';
import { useInView } from 'react-intersection-observer';
import { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { useOptions } from '@/hooks/useOptions';
import { buildGetAllUserMarketListingsQuery } from '@/pages/price-check/lib/tradeUrlBuilder';
import { qualityColor } from '@/pages/price-check/lib/qualityColor';
import { emit } from '@/lib/browser-events';
import { openUrl } from '@/lib/browser-opener';
import { PD2Website } from '@/common/constants';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import moment from 'moment';
import { shortcutFormSchema, ShortcutFormData } from './types';
import { Form } from '@/components/ui/form';
import { FormField, FormItem, FormControl } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import ItemStatsDisplay from './ItemStatsDisplay';
import { ButtonGroup } from '@/components/ui/button-group';
import { trackEvent, trackMeasurement } from '@/lib/telemetry';
import { Skeleton } from '@/components/ui/skeleton';
import { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import { cn } from '@/lib/utils';
import { DUR, EASE_OUT, listItem, listStagger } from '@/lib/motion';
import EmptyState from './EmptyState';
import { countChip, itemCard } from './styles';

interface ListedItemsTabProps {
  onClose: () => void;
  initialListings?: MarketListingEntry[];
  initialTotalCount?: number;
  onTotalCountChange?: (count: number) => void;
  onListingsChange?: (listings: MarketListingEntry[]) => void;
}

const ITEMS_PER_PAGE = 5;
// "Bump All" success flash (mirrors the pd2trader.com/overlay demo): keep in sync with --animate-bump-flash.
const BUMP_FLASH_STAGGER_MS = 210;
const BUMP_FLASH_SPREAD_MS = 2500;
const BUMP_FLASH_DURATION_MS = 1050;

const iconButton =
  'inline-flex size-7 items-center justify-center rounded-md text-muted-foreground outline-none transition-[color,background-color,transform] duration-(--dur-fast) ease-out focus-visible:ring-2 focus-visible:ring-ring/60 motion-safe:active:scale-90 disabled:pointer-events-none [&_svg]:size-4';

const ListedItemsTab: React.FC<ListedItemsTabProps> = ({
  onClose: _onClose,
  initialListings,
  initialTotalCount,
  onTotalCountChange,
  onListingsChange,
}) => {
  const {
    getMarketListings,
    updateMarketListing,
    updateItemByHash,
    deleteMarketListing,
    bumpAllMarketListings,
    authData,
  } = usePd2Website();
  const { settings } = useOptions();
  const [listings, setListings] = useState<MarketListingEntry[]>(initialListings || []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(initialTotalCount || 0);
  const [editingListingId, setEditingListingId] = useState<string | null>(null);
  const [bumpingListingId, setBumpingListingId] = useState<string | null>(null);
  const [deletingListingId, setDeletingListingId] = useState<string | null>(null);
  const [isBumpingAll, setIsBumpingAll] = useState(false);
  // Timestamp of the last successful "Bump All": drives the staggered green flash across rows.
  const [bumpWave, setBumpWave] = useState(0);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [allListingsForSearch, setAllListingsForSearch] = useState<MarketListingEntry[]>([]);
  const [isLoadingAllListings, setIsLoadingAllListings] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [hasReachedEnd, setHasReachedEnd] = useState(false);
  const isDeletingRef = React.useRef(false);

  const { ref: loaderRef, inView } = useInView({
    threshold: 0,
    rootMargin: '100px', // Start loading before reaching the bottom
  });

  const editForm = useForm<ShortcutFormData>({
    resolver: zodResolver(shortcutFormSchema),
    defaultValues: { type: 'exact', note: '', price: '', currency: 'HR' },
  });

  // Watch form values to determine if Save button should be disabled
  const editNote = editForm.watch('note');
  const editPrice = editForm.watch('price');
  const hasEditNote = !!editNote && editNote.toString().trim().length > 0;
  const hasEditPrice = !!editPrice && (typeof editPrice === 'number' ? editPrice > 0 : Number(editPrice) > 0);
  const isEditFormValid = hasEditNote || hasEditPrice;

  const marketQuery = useMemo(() => {
    if (!authData || !settings) return null;
    return buildGetAllUserMarketListingsQuery(
      authData.user._id,
      settings.mode === 'hardcore',
      settings.ladder === 'ladder',
      ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE,
    );
  }, [authData, settings, currentPage]);

  // Query to fetch all listings for search (when search is active)
  const allListingsQuery = useMemo(() => {
    if (!authData || !settings || !searchQuery.trim()) return null;
    return buildGetAllUserMarketListingsQuery(
      authData.user._id,
      settings.mode === 'hardcore',
      settings.ladder === 'ladder',
      1000, // Fetch up to 1000 listings for search
      0,
    );
  }, [authData, settings, searchQuery]);

  const fetchListings = useCallback(async () => {
    if (!marketQuery) return;

    setIsLoading(true);
    setError(null);
    const startTime = performance.now();
    try {
      const result = await getMarketListings(marketQuery);
      const duration = performance.now() - startTime;

      if (result.data.length === 0) {
        setHasReachedEnd(true);
      }

      setListings((prev) => {
        // If page 0, replace. Else append.
        if (currentPage === 0) {
          return result.data;
        }
        // Avoid duplicates just in case
        const existingIds = new Set(prev.map((l) => l._id));
        const newItems = result.data.filter((l) => !existingIds.has(l._id));
        return [...prev, ...newItems];
      });

      setTotalCount(result.total);

      trackMeasurement(
        'listed_items_fetch',
        { duration_ms: duration, returned_items: result.data.length, total_items: result.total },
        { outcome: 'success', page: currentPage },
      );

      // Update parent component if callbacks provided
      if (onTotalCountChange) {
        onTotalCountChange(result.total);
      }
      // Update parent's listings if on page 0
      if (currentPage === 0 && onListingsChange) {
        onListingsChange(result.data);
      }
    } catch (err) {
      const duration = performance.now() - startTime;
      trackMeasurement('listed_items_fetch', { duration_ms: duration }, { outcome: 'error', page: currentPage });
      console.error('Failed to fetch market listings:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch listings');
    } finally {
      setIsLoading(false);
    }
  }, [marketQuery, getMarketListings, onTotalCountChange, onListingsChange, currentPage]);

  // Handle infinite scroll trigger
  useEffect(() => {
    // Only load more if:
    // 1. Trigger is visible
    // 2. Not currently loading
    // 3. Not searching (search loads everything at once)
    // 4. We haven't loaded all items yet
    // 5. We haven't confirmed end of list
    if (inView && !isLoading && !searchQuery.trim() && listings.length < totalCount && !hasReachedEnd) {
      // Safeguard: Ensure we don't skip pages or double fetch
      // React strict mode might trigger this twice, better to debounce or rely on isLoading
      setCurrentPage((prev) => prev + 1);
    }
  }, [inView, isLoading, searchQuery, listings.length, totalCount, hasReachedEnd]);

  // Track if we've fetched all listings for search
  const hasFetchedAllListings = React.useRef(false);

  // Fetch all listings for search (fetch when query becomes available, or when user starts typing)
  useEffect(() => {
    const fetchAllForSearch = async () => {
      if (!allListingsQuery) {
        setAllListingsForSearch([]);
        hasFetchedAllListings.current = false;
        return;
      }

      // Only fetch if user is searching or if we haven't fetched yet
      if (!searchQuery.trim() && hasFetchedAllListings.current) {
        return; // Don't refetch if we already have data and not searching
      }

      setIsLoadingAllListings(true);
      try {
        // Fetch all listings (not paginated) for search
        const result = await getMarketListings(allListingsQuery);
        setAllListingsForSearch(result.data);
        hasFetchedAllListings.current = true;
      } catch (err) {
        console.error('Failed to fetch all listings for search:', err);
        setAllListingsForSearch([]);
        hasFetchedAllListings.current = false;
      } finally {
        setIsLoadingAllListings(false);
      }
    };

    // Fetch when query is available and (user is searching OR we don't have data yet)
    if (allListingsQuery && (searchQuery.trim() || !hasFetchedAllListings.current)) {
      fetchAllForSearch();
    }
  }, [allListingsQuery, getMarketListings, searchQuery]);

  // Initialize with initial data if available, or fetch if not
  useEffect(() => {
    if (hasInitialized) return; // Already initialized

    if (currentPage === 0) {
      if (initialTotalCount !== undefined && initialListings) {
        // Use initial data if provided
        if (initialListings.length > 0) {
          setListings(initialListings.slice(0, ITEMS_PER_PAGE));
        } else {
          setListings([]);
        }
        setTotalCount(initialTotalCount);
        setHasInitialized(true);
        // Reset end reached on init
        setHasReachedEnd(false);
      } else if (marketQuery) {
        // No initial data, fetch on mount
        fetchListings();
        setHasInitialized(true);
        setHasReachedEnd(false);
      }
    }
  }, [currentPage, hasInitialized, initialListings, initialTotalCount, marketQuery, fetchListings]);

  // Fetch listings when page changes (after initialization)
  useEffect(() => {
    if (isDeletingRef.current) {
      return; // Don't refetch while deleting
    }
    if (searchQuery.trim()) {
      return; // Don't fetch paginated results when searching
    }

    if (marketQuery && hasInitialized && currentPage !== 0) {
      fetchListings();
    } else if (marketQuery && hasInitialized && currentPage === 0 && listings.length === 0 && totalCount > 0) {
      // Refetch if we reset to page 0 and have no items but expect some
      fetchListings();
    }
  }, [marketQuery, fetchListings, currentPage, searchQuery, hasInitialized, listings.length, totalCount]);

  // Handle Search Query Change - Reset Pagination
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      setCurrentPage(0);
      // We don't clear listings here because we switch to displaying filteredListings
      // But we should ensure we don't trigger infinite scroll
    }
  }, [searchQuery]);

  // Refresh when initial data changes (e.g., after authentication)
  // Skip this effect if we're currently deleting to prevent overwriting local state
  // Only sync from initialListings if we're on page 0 and have no local listings (initialization case)
  useEffect(() => {
    if (isDeletingRef.current) {
      return; // Don't overwrite state while deleting
    }
    if (hasInitialized && initialTotalCount !== undefined && marketQuery && currentPage === 0) {
      // Only sync from initialListings if we have no local listings (initialization)
      // This prevents overwriting local state when parent refetches after tab switch
      if (listings.length === 0) {
        if (initialListings && initialListings.length > 0) {
          setListings(initialListings.slice(0, ITEMS_PER_PAGE));
        } else if (initialTotalCount === 0) {
          // Explicitly set empty if total is 0
          setListings([]);
        }
        setTotalCount(initialTotalCount);
      } else {
        // If we have local listings, only update total count if it's different
        // This allows the count to stay in sync without overwriting local state
        setTotalCount((prev) => {
          if (prev !== initialTotalCount) {
            return initialTotalCount;
          }
          return prev;
        });
      }
    }
  }, [initialListings, initialTotalCount, hasInitialized, currentPage, marketQuery, listings.length]);

  const handleBump = async (listing: MarketListingEntry) => {
    setBumpingListingId(listing._id);
    const startTime = performance.now();
    try {
      await updateMarketListing(listing._id, { bumped_at: new Date().toISOString() });
      await updateItemByHash(listing.item.hash, { bumped_at: new Date().toISOString() });
      // await fetchListings(); // Don't refetch whole list on bump, just update local state if needed or let it be
      // Optimistic update or just leave it, bump only changes sort order usually.
      // For now, let's just leave it to not jump the scroll.
      // Or we can update the single item in the list
      setListings((prev) =>
        prev.map((l) => (l._id === listing._id ? { ...l, bumped_at: new Date().toISOString() } : l)),
      );

      const duration = performance.now() - startTime;
      trackMeasurement(
        'listed_items_bump',
        { duration_ms: duration },
        { outcome: 'success', source: 'listed_items_tab' },
      );
      emit('toast-event', 'Item bumped successfully!');
    } catch (err) {
      const duration = performance.now() - startTime;
      trackMeasurement(
        'listed_items_bump',
        { duration_ms: duration },
        { outcome: 'error', source: 'listed_items_tab' },
      );
      console.error('Failed to bump item:', err);
      emit('toast-event', 'Failed to bump item');
    } finally {
      setBumpingListingId(null);
    }
  };

  const handleBumpAll = async () => {
    if (!authData) {
      emit('toast-event', 'Unable to bump listings: not authenticated');
      return;
    }

    setIsBumpingAll(true);
    const startTime = performance.now();
    try {
      await bumpAllMarketListings(authData.user._id);

      // Update all local items
      setListings((prev) => prev.map((l) => ({ ...l, bumped_at: new Date().toISOString() })));
      const wave = Date.now();
      setBumpWave(wave);
      // Drop the flash overlays once the last row has finished.
      setTimeout(() => setBumpWave((w) => (w === wave ? 0 : w)), BUMP_FLASH_SPREAD_MS + BUMP_FLASH_DURATION_MS);

      const duration = performance.now() - startTime;
      trackMeasurement('listed_items_bump_all', { duration_ms: duration }, { outcome: 'success' });
      emit('toast-event', 'Successfully bumped all items!');
    } catch (err) {
      const duration = performance.now() - startTime;
      trackMeasurement('listed_items_bump_all', { duration_ms: duration }, { outcome: 'error' });
      console.error('Failed to bump all items:', err);
      emit('toast-event', 'Failed to bump all items');
    } finally {
      setIsBumpingAll(false);
    }
  };

  const handleDelete = async (listing: MarketListingEntry) => {
    setDeletingListingId(listing._id);
    isDeletingRef.current = true;
    const startTime = performance.now();
    try {
      await deleteMarketListing(listing._id);

      // Optimistically remove the item from local state using functional updates
      setListings((prev) => {
        const updatedListings = prev.filter((l) => l._id !== listing._id);
        // Update parent component if callback provided
        if (onListingsChange) {
          onListingsChange(updatedListings);
        }
        return updatedListings;
      });

      setAllListingsForSearch((prev) => prev.filter((l) => l._id !== listing._id));

      // Decrement total count
      setTotalCount((prev) => {
        const newTotalCount = Math.max(0, prev - 1);
        // Update parent component if callback provided
        if (onTotalCountChange) {
          onTotalCountChange(newTotalCount);
        }
        return newTotalCount;
      });

      const duration = performance.now() - startTime;
      trackMeasurement('listed_items_delete', { duration_ms: duration }, { outcome: 'success' });
      emit('toast-event', `Removed ${listing.item.name} market listing.`);
    } catch (err) {
      const duration = performance.now() - startTime;
      trackMeasurement('listed_items_delete', { duration_ms: duration }, { outcome: 'error' });
      console.error('Failed to delete listing:', err);
      emit('toast-event', 'Failed to delete listing');
      // Refresh on error to restore correct state
      setCurrentPage(0);
      await fetchListings();
    } finally {
      setDeletingListingId(null);
      // Reset the flag after a short delay to allow state updates to complete
      setTimeout(() => {
        isDeletingRef.current = false;
      }, 100);
    }
  };

  const handleEdit = (listing: MarketListingEntry) => {
    setEditingListingId(listing._id);
    trackEvent('listed_items_edit_started');
    editForm.reset({
      type: typeof listing.hr_price === 'number' && listing.hr_price > 0 ? 'exact' : 'note',
      note: typeof listing.price === 'string' ? listing.price : '',
      price: listing.hr_price ?? '',
      currency: 'HR',
    });
  };

  const handleSaveEdit = async (values: ShortcutFormData, listing: MarketListingEntry) => {
    const startTime = performance.now();
    try {
      // Determine type based on which fields are filled
      // Normalize price: handle empty strings, whitespace, undefined, null
      const priceValue =
        values.price === null || values.price === undefined || values.price === ''
          ? null
          : typeof values.price === 'string'
            ? values.price.trim()
            : values.price;
      const numericPrice = priceValue !== null ? Number(priceValue) : null;
      const hasPrice = numericPrice !== null && !isNaN(numericPrice) && numericPrice > 0;
      const listingType = hasPrice ? 'exact' : 'note';

      const updateFields: Record<string, any> = {};
      if (listingType === 'note') {
        updateFields.price = values.note || '';
        updateFields.hr_price = 0;
      } else if (listingType === 'exact') {
        updateFields.hr_price = numericPrice;
        updateFields.price = values.note || '';
      }
      await updateMarketListing(listing._id, updateFields);
      await updateItemByHash(listing.item.hash, updateFields);

      // Update local state instead of refetching
      setListings((prev) =>
        prev.map((l) => {
          if (l._id === listing._id) {
            return { ...l, ...updateFields, hr_price: updateFields.hr_price, price: updateFields.price };
          }
          return l;
        }),
      );

      setEditingListingId(null);
      // await fetchListings();
      const duration = performance.now() - startTime;
      trackMeasurement(
        'listed_items_edit_save',
        { duration_ms: duration, price_hr: hasPrice ? numericPrice : undefined },
        { outcome: 'success', listing_type: listingType },
      );
      emit('toast-event', 'Listing updated!');
    } catch (err) {
      const duration = performance.now() - startTime;
      trackMeasurement('listed_items_edit_save', { duration_ms: duration }, { outcome: 'error' });
      console.error('Failed to update listing:', err);
      emit('toast-event', 'Failed to update listing');
    }
  };

  const canBump = (listing: MarketListingEntry) => {
    if (!listing.bumped_at) return true;
    const lastBump = moment(listing.bumped_at);
    const now = moment();
    return now.diff(lastBump, 'hours') >= 12;
  };

  const timeUntilBump = (listing: MarketListingEntry) => {
    if (!listing.bumped_at) return '';
    const lastBump = moment(listing.bumped_at);
    const nextBump = lastBump.clone().add(12, 'hours');
    return nextBump.fromNow();
  };

  const toggleExpandedStats = (itemHash: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemHash)) {
      newExpanded.delete(itemHash);
    } else {
      newExpanded.add(itemHash);
    }
    setExpandedItems(newExpanded);
  };

  // Create Fuse instance for searching
  const fuse = useMemo(() => {
    const listingsToSearch = searchQuery.trim() ? allListingsForSearch : listings;
    return new Fuse(listingsToSearch, {
      keys: [
        'item.name',
        'item.base.name',
        'price',
        { name: 'hr_price', getFn: (listing: MarketListingEntry) => listing.hr_price?.toString() || '' },
      ],
      threshold: 0.4, // 0 = exact match, 1 = match anything
      includeScore: true,
    });
  }, [allListingsForSearch, listings, searchQuery]);

  // Filter listings based on search query
  const filteredListings = useMemo(() => {
    if (!searchQuery.trim()) {
      return listings;
    }
    if (allListingsForSearch.length === 0) {
      return [];
    }
    const results = fuse.search(searchQuery);
    return results.map((result) => result.item);
  }, [searchQuery, listings, allListingsForSearch, fuse]);

  // Paginate filtered results or use full list
  const displayListings = useMemo(() => {
    if (!searchQuery.trim()) {
      return listings;
    }
    // Return all filtered results when searching
    return filteredListings;
  }, [filteredListings, searchQuery, listings]);

  if (isLoading && listings.length === 0 && !searchQuery.trim()) {
    return (
      <div className="flex flex-col gap-2"
        aria-busy>
        <div className="flex items-center gap-2 pb-1 text-sm text-muted-foreground"
          role="status">
          <Loader2 className="size-4 animate-spin text-primary" />
          <span>Loading listings...</span>
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i}
            className="rounded-lg border border-border bg-card/40 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-2">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-24" />
              </div>
              <div className="flex gap-1.5">
                <Skeleton className="h-7 w-16" />
                <Skeleton className="h-7 w-14" />
                <Skeleton className="size-7" />
              </div>
            </div>
            <div className="mt-3 flex justify-between">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error && listings.length === 0 && !searchQuery.trim()) {
    return (
      <EmptyState icon={<CircleAlert />}
        title="Couldn't load listings">
        <p className="mb-4 text-destructive">{error}</p>
        <Button
          onClick={() => {
            setCurrentPage(0);
            fetchListings();
          }}
        >
          <RotateCw className="size-4" />
          Retry
        </Button>
      </EmptyState>
    );
  }

  const isSearching = !!searchQuery.trim();
  const showEmpty = !isSearching && !isLoading && displayListings.length === 0 && totalCount === 0;
  // Same pacing as the website demo (210ms per row), compressed so long lists finish within ~2.5s.
  const bumpStagger = Math.min(BUMP_FLASH_STAGGER_MS, BUMP_FLASH_SPREAD_MS / Math.max(1, displayListings.length));

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full">
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <div className="relative flex-1 max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search item by name..."
              aria-label="Search listings"
              value={searchQuery}
              onChange={(e) => {
                const newQuery = e.target.value;
                setSearchQuery(newQuery);
                // setCurrentPage(0); // Handled in useEffect
                if (newQuery.trim().length > 0) {
                  trackMeasurement('listed_items_search', { query_chars: newQuery.length });
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape' && searchQuery) {
                  e.preventDefault();
                  setSearchQuery('');
                }
              }}
              className="pl-8 pr-8 h-8 text-sm"
            />
            <AnimatePresence>
              {searchQuery && (
                <motion.button
                  type="button"
                  aria-label="Clear search"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: DUR.fast }}
                  onClick={() => {
                    setSearchQuery('');
                  }}
                  className="absolute right-1.5 top-1/2 -mt-2.5 inline-flex size-5 items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
                >
                  <XIcon className="h-3.5 w-3.5" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
          <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
            Listed Items
            <span className={countChip}>{isSearching ? filteredListings.length : totalCount}</span>
            <span className="sr-only">({isSearching ? filteredListings.length : totalCount})</span>
          </span>
        </div>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={handleBumpAll}
              disabled={isBumpingAll || isLoading || isLoadingAllListings || totalCount === 0}
            >
              {isBumpingAll ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Bumping...
                </>
              ) : (
                <>
                  <ChevronsUp className="h-3.5 w-3.5" />
                  Bump All
                </>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Bump all items that are eligible to be bumped</TooltipContent>
        </Tooltip>
      </div>

      <AnimatePresence>
        {isLoadingAllListings && isSearching && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center justify-center overflow-hidden"
            role="status"
          >
            <div className="flex items-center gap-2 p-3">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Searching...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent min-h-0 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full">
        <motion.div className="flex flex-col gap-2 p-px"
          variants={listStagger}
          initial="hidden"
          animate="visible">
          {displayListings.length === 0 && isSearching && !isLoadingAllListings && (
            <EmptyState icon={<SearchX />}
              title="No matches"
              className="p-6">
              No items found matching &quot;{searchQuery}&quot;
            </EmptyState>
          )}
          {showEmpty && (
            <EmptyState icon={<Store />}
              title={authData ? 'No active listings' : 'Not signed in'}>
              {authData
                ? 'Items you list from your shared stash will show up here.'
                : 'Sign in to your PD2 account to manage your listings.'}
            </EmptyState>
          )}
          <AnimatePresence initial={false}>
            {displayListings.map((listing, index) => {
              const isEditing = editingListingId === listing._id;
              const isDeleting = deletingListingId === listing._id;
              const itemHash = listing.item.hash;
              const statsOpen = expandedItems.has(itemHash);

              return (
                <motion.div
                  layout="position"
                  variants={listItem}
                  exit={{ opacity: 0, x: -16, transition: { duration: DUR.med } }}
                  key={listing._id}
                  className={itemCard({ className: isDeleting ? 'border-destructive/40 bg-destructive/5' : undefined })}
                >
                  {bumpWave > 0 && (
                    <span
                      key={bumpWave}
                      aria-hidden
                      className="pointer-events-none absolute -inset-px rounded-[inherit] border border-success/45 bg-success/10 opacity-0 animate-bump-flash"
                      style={{ animationDelay: `${index * bumpStagger}ms` }}
                    />
                  )}
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div
                        className={cn('truncate', qualityColor(listing.item.quality.name))}
                        style={{ fontFamily: 'DiabloFont' }}
                      >
                        {listing.item.name}
                      </div>
                      <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                        {listing.hr_price ? (
                          <span className="shrink-0 rounded-full bg-primary/12 px-1.5 py-px font-semibold tabular-nums text-primary">
                            {`${listing.hr_price} HR`}
                          </span>
                        ) : null}
                        {listing.price && <span className="truncate">{listing.price}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <AnimatePresence mode="wait"
                        initial={false}>
                        {isEditing ? (
                          <motion.div
                            key="edit"
                            initial={{ opacity: 0, x: 8 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 8 }}
                            transition={{ duration: DUR.fast, ease: EASE_OUT }}
                          >
                            <Form {...editForm}>
                              <form
                                onSubmit={editForm.handleSubmit((values) => handleSaveEdit(values, listing))}
                                onKeyDown={(e) => {
                                  if (e.key === 'Escape') {
                                    e.preventDefault();
                                    setEditingListingId(null);
                                  }
                                }}
                                className="flex items-end gap-1"
                              >
                                <FormField
                                  control={editForm.control}
                                  name="note"
                                  render={({ field }) => (
                                    <FormItem className="m-0 p-0 min-w-0 flex-1">
                                      <FormControl>
                                        <Input
                                          placeholder="Note..."
                                          aria-label="Note"
                                          {...field}
                                          className="h-8 text-xs"
                                          autoComplete="off"
                                          autoFocus
                                          value={editForm.getValues('note') || ''}
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={editForm.control}
                                  name="price"
                                  render={({ field }) => (
                                    <FormItem className="m-0 p-0 min-w-0 w-20">
                                      <FormControl>
                                        <Input
                                          type="number"
                                          min={0}
                                          step={0.01}
                                          placeholder="HR"
                                          aria-label="HR price"
                                          {...field}
                                          className="h-8 text-xs tabular-nums"
                                          value={editForm.getValues('price') || ''}
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                                <ButtonGroup>
                                  <Button
                                    type="submit"
                                    size="sm"
                                    className="h-8 text-xs"
                                    disabled={isEditing && !isEditFormValid}
                                  >
                                    <Check className="size-3.5" />
                                    Save
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 text-xs"
                                    onClick={() => setEditingListingId(null)}
                                  >
                                    Cancel
                                  </Button>
                                </ButtonGroup>
                              </form>
                            </Form>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="actions"
                            className="flex items-center gap-1"
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -8 }}
                            transition={{ duration: DUR.fast, ease: EASE_OUT }}
                          >
                            {canBump(listing) ? (
                              <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 gap-1 px-2.5 text-xs"
                                    onClick={() => handleBump(listing)}
                                    disabled={bumpingListingId === listing._id}
                                  >
                                    {bumpingListingId === listing._id ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <>
                                        <ArrowUp className="size-3.5" />
                                        Bump
                                      </>
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Bump listing to top</TooltipContent>
                              </Tooltip>
                            ) : (
                              <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                  <span className="cursor-not-allowed">
                                    <Button size="sm"
                                      variant="outline"
                                      className="h-7 gap-1 px-2.5 text-xs"
                                      disabled>
                                      <Clock className="size-3.5" />
                                      Bump
                                    </Button>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>You can bump this item {timeUntilBump(listing)}</TooltipContent>
                              </Tooltip>
                            )}
                            <Tooltip delayDuration={0}>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 gap-1 px-2.5 text-xs"
                                  onClick={() => handleEdit(listing)}
                                >
                                  <Pencil className="size-3" />
                                  Edit
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit price</TooltipContent>
                            </Tooltip>
                            <Tooltip delayDuration={0}>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  aria-label={isDeleting ? 'Deleting...' : 'Remove listing'}
                                  disabled={isDeleting}
                                  className={cn(
                                    iconButton,
                                    'text-destructive/80 hover:bg-destructive/15 hover:text-destructive',
                                  )}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleDelete(listing);
                                  }}
                                >
                                  {isDeleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>{isDeleting ? 'Deleting...' : 'Remove listing'}</TooltipContent>
                            </Tooltip>
                            <Tooltip delayDuration={0}>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  aria-label="Go to trade website"
                                  className={cn(iconButton, 'hover:bg-accent hover:text-accent-foreground')}
                                  onClick={() => {
                                    trackEvent('listed_items_trade_url_opened');
                                    openUrl(`${PD2Website.Website}/market/listing/${listing._id}`);
                                  }}
                                >
                                  <SquareArrowOutUpRight />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>Go to trade website</TooltipContent>
                            </Tooltip>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  <div className="mt-2 flex justify-between items-end gap-2">
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => toggleExpandedStats(itemHash)}
                        aria-expanded={statsOpen}
                        className="inline-flex items-center gap-0.5 rounded-sm text-xs font-medium text-primary outline-none transition-colors duration-(--dur-fast) hover:text-primary/80 focus-visible:ring-2 focus-visible:ring-ring/60"
                      >
                        {statsOpen ? 'Show Less' : 'Show Stats'}
                        <ChevronDown
                          className={cn('size-3 transition-transform duration-(--dur-fast)', statsOpen && 'rotate-180')}
                        />
                      </button>
                      <AnimatePresence initial={false}>
                        {statsOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: DUR.med, ease: EASE_OUT }}
                            className="overflow-hidden"
                          >
                            <ItemStatsDisplay
                              // Listing ItemDetail is a superset-compatible view of the stash item for display purposes.
                              stashItem={listing.item as unknown as GameStashItem}
                              isExpanded={true}
                              onToggleExpanded={toggleExpandedStats}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <span
                      className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground"
                      title={moment(listing.created_at).format('LLL')}
                    >
                      <Clock className="size-3" />
                      {moment(listing.created_at).fromNow()}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Infinite Scroll Trigger */}
          {!isSearching && listings.length < totalCount && (
            <div ref={loaderRef}
              className="py-4 flex justify-center w-full">
              {isLoading && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ListedItemsTab;
