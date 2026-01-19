import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { useOptions } from '@/hooks/useOptions';
import { MarketSearchFilters, DEFAULT_FILTERS } from './lib/types';
import { buildMarketSearchQuery } from './lib/buildMarketSearchQuery';
import { itemTypes } from '@/common/item-types';
import { MarketSearchFilters as MarketSearchFiltersComponent } from './components/MarketSearchFilters';
import { MarketSearchResults } from './components/MarketSearchResults';
import { MarketSearchCommand } from './components/MarketSearchCommand';
import { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { useViewManager, VIEW_IDS } from '@/hooks/useViewManager';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarProvider,
  SidebarInset,
  SidebarRail,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Search, Loader2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@radix-ui/react-scroll-area';

const ITEMS_PER_PAGE = 20;

export const MarketSearchPage: React.FC = () => {
  const { getMarketListings, getMarketListingsArchive, authData } = usePd2Website();
  const { settings } = useOptions();
  const { hideView } = useViewManager();

  const [filters, setFilters] = useState<MarketSearchFilters>({
    ...DEFAULT_FILTERS,
    isHardcore: settings.mode === 'hardcore',
    isLadder: settings.ladder === 'ladder',
  });

  // Separate state for the actual search query (used for API calls)
  // This stores the last applied filters, not the current filter state
  const [appliedFilters, setAppliedFilters] = useState<MarketSearchFilters>({
    ...DEFAULT_FILTERS,
    isHardcore: settings.mode === 'hardcore',
    isLadder: settings.ladder === 'ladder',
  });

  const [listings, setListings] = useState<MarketListingEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  // Update filters when settings change
  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      isHardcore: prev.isHardcore ?? settings.mode === 'hardcore',
      isLadder: prev.isLadder ?? settings.ladder === 'ladder',
    }));
  }, [settings.mode, settings.ladder]);

  // Build base query (without pagination) using applied filters (only updated when search button is clicked)
  const baseQuery = useMemo(() => {
    if (!authData || !settings) return null;
    return buildMarketSearchQuery(appliedFilters, settings, ITEMS_PER_PAGE, 0);
  }, [appliedFilters, settings, authData]);

  // Build query with pagination
  const query = useMemo(() => {
    if (!baseQuery) return null;
    return {
      ...baseQuery,
      $skip: currentPage * ITEMS_PER_PAGE,
    };
  }, [baseQuery, currentPage]);

  // Fetch listings
  const fetchListings = useCallback(
    async (isNewSearch: boolean = false) => {
      if (!query) return;

      setIsLoading(true);
      setError(null);

      try {
        console.log('[MarketSearch] Fetching listings with query:', JSON.stringify(query, null, 2));

        const result = appliedFilters.searchArchived
          ? await getMarketListingsArchive(query)
          : await getMarketListings(query);

        console.log('[MarketSearch] API Response:', {
          total: result.total,
          dataLength: result.data?.length || 0,
          limit: result.limit,
          skip: result.skip,
          hasData: !!result.data,
          firstItem: result.data?.[0] || null,
        });
        console.log('[MarketSearch] Full result object:', result);

        if (isNewSearch) {
          console.log('[MarketSearch] Setting new listings, count:', result.data?.length || 0);
          setListings(result.data);
          setCurrentPage(0);
          setHasMore(result.data.length === ITEMS_PER_PAGE && result.data.length < result.total);
        } else {
          // Append new results, avoiding duplicates
          setListings((prev) => {
            const existingIds = new Set(prev.map((l) => l._id));
            const newItems = result.data.filter((l) => !existingIds.has(l._id));
            const updated = [...prev, ...newItems];
            console.log(
              '[MarketSearch] Appending listings, prev:',
              prev.length,
              'new:',
              newItems.length,
              'total:',
              updated.length,
            );
            setHasMore(result.data.length === ITEMS_PER_PAGE && updated.length < result.total);
            return updated;
          });
        }

        setTotalCount(result.total);
        console.log('[MarketSearch] Total count set to:', result.total);
      } catch (err) {
        console.error('Failed to fetch market listings:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch listings');
      } finally {
        setIsLoading(false);
      }
    },
    [query, appliedFilters.searchArchived, getMarketListings, getMarketListingsArchive],
  );

  useEffect(() => {
    setCommandOpen(true);
  }, []);

  // Handle search button click or Enter key
  const handleSearch = useCallback(() => {
    // Apply current filters and trigger search
    setAppliedFilters(filters);
    setCurrentPage(0);
  }, [filters]);

  // Fetch when base query changes (only when search button is clicked)
  useEffect(() => {
    if (baseQuery) {
      setCurrentPage(0);
      // This will trigger the query useEffect below
    }
  }, [baseQuery]);

  // Fetch when query changes
  useEffect(() => {
    if (query) {
      if (currentPage === 0) {
        fetchListings(true);
      } else {
        fetchListings(false);
      }
    }
  }, [query, currentPage]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load more handler
  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      setCurrentPage((prev) => prev + 1);
    }
  }, [isLoading, hasMore]);

  // Handle item type selection from command menu
  const handleSelectItemType = useCallback((typeValue: string | { $in: string[] }) => {
    const typeValueStr = typeof typeValue === 'string' ? typeValue : JSON.stringify(typeValue);
    setFilters((prev) => ({
      ...prev,
      itemType: typeValueStr,
      baseCode: undefined, // Clear base code when type changes
    }));
  }, []);

  // Handle modifier click from ItemStatsDisplay
  const handleModifierClick = useCallback((modifierName: string, min?: number, max?: number) => {
    setFilters((prev) => {
      const existingModifiers = prev.modifiers || [];
      // Check if modifier already exists
      const existingIndex = existingModifiers.findIndex((m) => m.name === modifierName);

      if (existingIndex >= 0) {
        // Update existing modifier
        const newModifiers = [...existingModifiers];
        newModifiers[existingIndex] = {
          name: modifierName,
          min: min ?? newModifiers[existingIndex].min,
          max: max ?? newModifiers[existingIndex].max,
        };
        return { ...prev, modifiers: newModifiers };
      } else {
        // Add new modifier
        return {
          ...prev,
          modifiers: [...existingModifiers, { name: modifierName, min, max }],
        };
      }
    });
  }, []);

  // Handle unique item selection from command menu
  const handleSelectUniqueItem = useCallback((itemName: string, baseCode?: string) => {
    // Find matching item type for the base code
    let matchingItemType: string | undefined = undefined;
    if (baseCode) {
      const matchingType = itemTypes.find((type) => {
        const typeValue = typeof type.typeValue === 'string' ? type.typeValue : JSON.stringify(type.typeValue);

        if (typeValue === baseCode) {
          return true;
        }

        return type.bases.some((base) => base.value === baseCode);
      });

      if (matchingType) {
        matchingItemType =
          typeof matchingType.typeValue === 'string' ? matchingType.typeValue : JSON.stringify(matchingType.typeValue);
      }
    }

    setFilters((prev) => ({
      ...prev,
      searchText: itemName,
      itemType: matchingItemType || prev.itemType,
      baseCode: baseCode || prev.baseCode,
    }));
  }, []);

  // Client-side filtering for fields not supported by API query

  if (!authData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-muted-foreground mb-2">Authentication required</p>
          <p className="text-sm text-muted-foreground">Please log in to use market search</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      defaultOpen={true}
      className="h-full w-full overflow-hidden flex flex-col rounded-lg [&>div]:min-h-0"
    >
      <header className="bg-background sticky top-0 z-50 flex w-full items-center border-b border-neutral-700 shrink-0">
        <div className="flex h-16 w-full items-center gap-2 px-4"
          data-drag-handle>
          <SidebarTrigger />
          <Separator orientation="vertical"
            className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Market Search</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex-1 flex justify-center px-4">
            <div className="flex items-center gap-2 w-full max-w-md">
              <MarketSearchCommand
                open={commandOpen}
                onOpenChange={setCommandOpen}
                onSelectItemType={handleSelectItemType}
                onSelectUniqueItem={handleSelectUniqueItem}
              >
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                  {isLoading && (
                    <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10 animate-spin" />
                  )}
                  <Input
                    type="text"
                    placeholder="Search items or types..."
                    className="pl-9 w-full"
                    style={{ height: '41px', paddingRight: isLoading ? '2.5rem' : undefined }}
                    value={filters.searchText}
                    onChange={(e) => setFilters({ ...filters, searchText: e.target.value })}
                    onFocus={() => setCommandOpen(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSearch();
                      }
                    }}
                    disabled={isLoading}
                  />
                </div>
              </MarketSearchCommand>
              <Button
                type="button"
                variant="outline"
                onClick={handleSearch}
                className="h-[41px] px-4"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  'Search'
                )}
              </Button>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => hideView(VIEW_IDS.MARKET_SEARCH)}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>
      <ScrollArea className="flex-1 overflow-hidden flex min-h-0">
        <div className="flex-1 overflow-hidden flex min-h-0 relative"
          style={{ clipPath: 'inset(0)' }}>
          <Sidebar
            collapsible="offcanvas"
            className="bg-neutral-900/95 border-r border-neutral-700 rounded-b-lg overflow-hidden mt-16 [&>div]:!h-full [&>div>div]:!h-full"
          >
            <SidebarContent className="overflow-hidden">
              <MarketSearchFiltersComponent filters={filters}
                onFiltersChange={setFilters}
                settings={settings} />
            </SidebarContent>
            <SidebarRail />
          </Sidebar>
          <SidebarInset className="rounded-r-lg overflow-hidden flex-1 min-w-0">
            <div className="flex flex-1 flex-col h-full">
              {error && <div className="text-sm text-destructive p-4">{error}</div>}
              <MarketSearchResults
                listings={listings}
                isLoading={isLoading}
                hasMore={hasMore}
                onLoadMore={handleLoadMore}
                totalCount={totalCount}
                onModifierClick={handleModifierClick}
              />
            </div>
          </SidebarInset>
        </div>
      </ScrollArea>
    </SidebarProvider>
  );
};
