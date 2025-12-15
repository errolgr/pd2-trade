import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Loader2, SquareArrowOutUpRight, Trash2, Search, X as XIcon } from 'lucide-react';
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
import { incrementMetric, distributionMetric } from '@/lib/sentryMetrics';

interface ListedItemsTabProps {
  onClose: () => void;
  initialListings?: MarketListingEntry[];
  initialTotalCount?: number;
  onTotalCountChange?: (count: number) => void;
  onListingsChange?: (listings: MarketListingEntry[]) => void;
}

const ITEMS_PER_PAGE = 5;

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
  const [isBumpingAll, setIsBumpingAll] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [allListingsForSearch, setAllListingsForSearch] = useState<MarketListingEntry[]>([]);
  const [isLoadingAllListings, setIsLoadingAllListings] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [hasReachedEnd, setHasReachedEnd] = useState(false);

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

      incrementMetric('listed_items.fetch', 1, { status: 'success', page: currentPage.toString() });
      distributionMetric('listed_items.fetch_duration_ms', duration);
      distributionMetric('listed_items.fetch_count', result.data.length);
      distributionMetric('listed_items.total_count', result.total);

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
      incrementMetric('listed_items.fetch', 1, { status: 'error', page: currentPage.toString() });
      distributionMetric('listed_items.fetch_duration_ms', duration);
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
  useEffect(() => {
    if (hasInitialized && initialTotalCount !== undefined && marketQuery && currentPage === 0) {
      // If initial data changed and we're on page 0, update the listings
      if (initialListings && initialListings.length > 0) {
        setListings(initialListings.slice(0, ITEMS_PER_PAGE));
      } else if (initialTotalCount === 0) {
        // Explicitly set empty if total is 0
        setListings([]);
      }
      setTotalCount(initialTotalCount);
    }
  }, [initialListings, initialTotalCount, hasInitialized, currentPage, marketQuery]);

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
      incrementMetric('listed_items.bump', 1, { status: 'success', source: 'listed_items_tab' });
      distributionMetric('listed_items.bump_duration_ms', duration);
      emit('toast-event', 'Item bumped successfully!');
    } catch (err) {
      const duration = performance.now() - startTime;
      incrementMetric('listed_items.bump', 1, { status: 'error', source: 'listed_items_tab' });
      distributionMetric('listed_items.bump_duration_ms', duration);
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

      const duration = performance.now() - startTime;
      incrementMetric('listed_items.bump_all', 1, { status: 'success' });
      distributionMetric('listed_items.bump_all_duration_ms', duration);
      emit('toast-event', 'Successfully bumped all items!');
    } catch (err) {
      const duration = performance.now() - startTime;
      incrementMetric('listed_items.bump_all', 1, { status: 'error' });
      distributionMetric('listed_items.bump_all_duration_ms', duration);
      console.error('Failed to bump all items:', err);
      emit('toast-event', 'Failed to bump all items');
    } finally {
      setIsBumpingAll(false);
    }
  };

  const handleDelete = async (listing: MarketListingEntry) => {
    const startTime = performance.now();
    try {
      await deleteMarketListing(listing._id);

      // Optimistically remove the item from local state
      const updatedListings = listings.filter((l) => l._id !== listing._id);
      setListings(updatedListings);
      setAllListingsForSearch((prev) => prev.filter((l) => l._id !== listing._id));

      // Decrement total count
      const newTotalCount = Math.max(0, totalCount - 1);
      setTotalCount(newTotalCount);

      // Update parent component if callbacks provided
      if (onTotalCountChange) {
        onTotalCountChange(newTotalCount);
      }
      if (onListingsChange) {
        onListingsChange(updatedListings);
      }

      // No need to fetchListings here, we just removed it.
      // If we dropped below threshold, infinite scroll might trigger automatically (listings.length < totalCount?? No totalCount decr too)

      const duration = performance.now() - startTime;
      incrementMetric('listed_items.delete', 1, { status: 'success' });
      distributionMetric('listed_items.delete_duration_ms', duration);
      emit('toast-event', `Removed ${listing.item.name} market listing.`);
    } catch (err) {
      const duration = performance.now() - startTime;
      incrementMetric('listed_items.delete', 1, { status: 'error' });
      distributionMetric('listed_items.delete_duration_ms', duration);
      console.error('Failed to delete listing:', err);
      emit('toast-event', 'Failed to delete listing');
      // Refresh on error to restore correct state
      setCurrentPage(0);
      await fetchListings();
    }
  };

  const handleEdit = (listing: MarketListingEntry) => {
    setEditingListingId(listing._id);
    incrementMetric('listed_items.edit_started', 1);
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
      incrementMetric('listed_items.edit_saved', 1, { status: 'success', listing_type: listingType });
      distributionMetric('listed_items.edit_duration_ms', duration);
      if (hasPrice && numericPrice !== null) {
        distributionMetric('listed_items.edit_price_hr', numericPrice);
      }
      emit('toast-event', 'Listing updated!');
    } catch (err) {
      const duration = performance.now() - startTime;
      incrementMetric('listed_items.edit_saved', 1, { status: 'error' });
      distributionMetric('listed_items.edit_duration_ms', duration);
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
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading listings...</span>
      </div>
    );
  }

  if (error && listings.length === 0 && !searchQuery.trim()) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <p className="text-red-500 mb-4">{error}</p>
        <Button
          onClick={() => {
            setCurrentPage(0);
            fetchListings();
          }}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full">
      <div className="flex items-center justify-between mb-2 gap-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search item by name..."
              value={searchQuery}
              onChange={(e) => {
                const newQuery = e.target.value;
                setSearchQuery(newQuery);
                // setCurrentPage(0); // Handled in useEffect
                if (newQuery.trim().length > 0) {
                  incrementMetric('listed_items.search', 1);
                  distributionMetric('listed_items.search_query_length', newQuery.length);
                }
              }}
              className="pl-8 pr-8 h-8 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                }}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <XIcon className="h-4 w-4" />
              </button>
            )}
          </div>
          <span className="text-xs font-medium">
            Listed Items ({searchQuery.trim() ? filteredListings.length : totalCount})
          </span>
        </div>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs mr-2"
              onClick={handleBumpAll}
              disabled={isBumpingAll || isLoading || isLoadingAllListings || totalCount === 0}
            >
              {isBumpingAll ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  Bumping...
                </>
              ) : (
                'Bump All'
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Bump all items that are eligible to be bumped</TooltipContent>
        </Tooltip>
      </div>

      {isLoadingAllListings && searchQuery.trim() && (
        <div className="flex items-center justify-center p-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="ml-2 text-sm text-muted-foreground">Searching...</span>
        </div>
      )}
      <div className="flex-1 overflow-y-scroll pr-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent min-h-0 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full">
        <div className="flex flex-col gap-2">
          {displayListings.length === 0 && searchQuery.trim() && !isLoadingAllListings && (
            <div className="text-center text-sm text-muted-foreground p-4">
              No items found matching &quot;{searchQuery}&quot;
            </div>
          )}
          {displayListings.map((listing) => {
            const isEditing = editingListingId === listing._id;
            const itemHash = listing.item.hash;

            return (
              <div key={listing._id}
                className="p-3 border rounded border-neutral-600">
                <div className="flex justify-between items-start gap-2 mb-2">
                  <div className="flex-1">
                    <div className={qualityColor(listing.item.quality.name)}
                      style={{ fontFamily: 'DiabloFont' }}>
                      {listing.item.name}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {listing.hr_price ? `${listing.hr_price} HR` : ''} {listing.price}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <Form {...editForm}>
                        <form
                          onSubmit={editForm.handleSubmit((values) => handleSaveEdit(values, listing))}
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
                                    {...field}
                                    className="h-8 text-xs"
                                    autoComplete="off"
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
                                    {...field}
                                    className="h-8 text-xs"
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
                    ) : (
                      <>
                        {canBump(listing) ? (
                          <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => handleBump(listing)}
                                disabled={bumpingListingId === listing._id}
                              >
                                {bumpingListingId === listing._id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  'Bump'
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Bump listing to top</TooltipContent>
                          </Tooltip>
                        ) : (
                          <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild>
                              <span>
                                <Button size="sm"
                                  variant="outline"
                                  className="h-7 text-xs cursor-not-allowed"
                                  disabled>
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
                              className="h-7 text-xs"
                              onClick={() => handleEdit(listing)}
                            >
                              Edit
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit price</TooltipContent>
                        </Tooltip>
                        <Tooltip delayDuration={0}>
                          <TooltipTrigger asChild>
                            <Trash2
                              className="w-4 h-4 p-0 hover:opacity-70 transition-opacity cursor-pointer text-red-500"
                              onClick={() => handleDelete(listing)}
                            />
                          </TooltipTrigger>
                          <TooltipContent>Remove listing</TooltipContent>
                        </Tooltip>
                        <Tooltip delayDuration={0}>
                          <TooltipTrigger asChild>
                            <SquareArrowOutUpRight
                              className="w-4 h-4 p-0 hover:opacity-70 transition-opacity cursor-pointer"
                              onClick={() => {
                                incrementMetric('listed_items.open_trade_url', 1);
                                openUrl(`${PD2Website.Website}/market/listing/${listing._id}`);
                              }}
                            />
                          </TooltipTrigger>
                          <TooltipContent>Go to trade website</TooltipContent>
                        </Tooltip>
                      </>
                    )}
                  </div>
                </div>
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => toggleExpandedStats(itemHash)}
                    className="text-xs text-blue-500 hover:text-blue-700 underline"
                  >
                    {expandedItems.has(itemHash) ? 'Show Less' : 'Show Stats'}
                  </button>
                  {expandedItems.has(itemHash) && (
                    <ItemStatsDisplay
                      stashItem={listing.item as any}
                      isExpanded={true}
                      onToggleExpanded={toggleExpandedStats}
                    />
                  )}
                </div>
              </div>
            );
          })}

          {/* Infinite Scroll Trigger */}
          {!searchQuery.trim() && listings.length < totalCount && (
            <div ref={loaderRef}
              className="py-4 flex justify-center w-full">
              {isLoading && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ListedItemsTab;
