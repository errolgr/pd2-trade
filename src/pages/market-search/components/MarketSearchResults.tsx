import React from 'react';
import { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { qualityColor } from '@/pages/price-check/lib/qualityColor';
import { Button } from '@/components/ui/button';
import { Loader2, SquareArrowOutUpRight } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { openUrl } from '@/lib/browser-opener';
import { PD2Website } from '@/common/constants';
import moment from 'moment';
import { useInView } from 'react-intersection-observer';
import { ScrollArea } from '@/components/ui/scroll-area';
import ItemStatsDisplay from '@/pages/quick-list/components/ItemStatsDisplay';
import { cn } from '@/lib/utils';
import { isUserOnlineIngame } from '@/lib/user-online-status';

interface MarketSearchResultsProps {
  listings: MarketListingEntry[];
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  totalCount?: number;
  onModifierClick?: (modifierName: string, min?: number, max?: number) => void;
}

export const MarketSearchResults: React.FC<MarketSearchResultsProps> = ({
  listings,
  isLoading,
  hasMore,
  onLoadMore,
  totalCount,
  onModifierClick,
}) => {
  const { ref: loaderRef, inView } = useInView({
    threshold: 0,
    rootMargin: '100px',
  });

  React.useEffect(() => {
    console.log('[MarketSearchResults] Intersection observer state:', {
      inView,
      isLoading,
      hasMore,
      listingsCount: listings.length,
    });
  }, [inView, isLoading, hasMore, listings.length]);

  React.useEffect(() => {
    console.log('[MarketSearchResults] Checking if should load more:', {
      inView,
      isLoading,
      hasMore,
      shouldLoad: inView && !isLoading && hasMore,
    });

    if (inView && !isLoading && hasMore) {
      console.log('[MarketSearchResults] Triggering onLoadMore');
      onLoadMore();
    } else {
      console.log('[MarketSearchResults] Not loading more - reasons:', {
        inView: inView ? '✓' : '✗ (not in view)',
        isLoading: isLoading ? '✗ (loading)' : '✓',
        hasMore: hasMore ? '✓' : '✗ (no more)',
      });
    }
  }, [inView, isLoading, hasMore, onLoadMore]);

  const handleOpenListing = (listingId: string) => {
    openUrl(`${PD2Website.Website}/market/listing/${listingId}`);
  };

  const formatPrice = (listing: MarketListingEntry) => {
    if (listing.hr_price && listing.hr_price > 0) {
      return `${listing.hr_price} HR${listing.price ? ` - ${listing.price}` : ''}`;
    }
    return listing.price || 'No price';
  };

  const formatTimeAgo = (timestamp: string) => {
    return moment(timestamp).fromNow();
  };

  return (
    <ScrollArea className="flex-1 min-h-0">
      {isLoading && listings.length === 0 && (
        <div className="text-center text-sm text-gray-400 p-4 flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading market listings...</span>
        </div>
      )}
      {listings.length > 0 && (
        <div className="p-4 pr-3 pb-15">
          {totalCount !== undefined && (
            <div className="text-sm text-muted-foreground mb-4">
              Showing {listings.length} of {totalCount} results
            </div>
          )}
          <div className="grid gap-3">
            {listings.map((listing) => (
              <div
                key={listing._id}
                className="p-4 border rounded-lg border-border hover:border-primary/50 transition-colors"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div
                      className={`${qualityColor(listing.item?.quality?.name || '')} font-semibold mb-1`}
                      style={{ fontFamily: 'DiabloFont' }}
                    >
                      {listing.item?.name || 'Unknown Item'}
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">
                      {listing.item?.base?.name && <span className="mr-2">{listing.item.base.name}</span>}
                      {listing.item?.quality?.name}
                    </div>
                    {/* Stats Display */}
                    {listing.item?.modifiers && listing.item.modifiers.length > 0 && (
                      <div className="mb-2">
                        <ItemStatsDisplay
                          stashItem={listing.item as any}
                          isExpanded={true}
                          onToggleExpanded={() => {}}
                          hideToggle={true}
                          onModifierClick={onModifierClick}
                        />
                      </div>
                    )}
                    <div className="text-sm font-medium text-foreground mb-1">{formatPrice(listing)}</div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        Seller: {listing.user.username}
                        {isUserOnlineIngame(listing.user_last_ingame) && (
                          <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild>
                              <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.8)]" />
                            </TooltipTrigger>
                            <TooltipContent>Online in-game</TooltipContent>
                          </Tooltip>
                        )}
                      </span>
                      <span>•</span>
                      <span>Listed {formatTimeAgo(listing.created_at)}</span>
                      {listing.bumped_at && (
                        <>
                          <span>•</span>
                          <span>Bumped {formatTimeAgo(listing.bumped_at)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenListing(listing._id)}
                          className="h-8"
                        >
                          <SquareArrowOutUpRight className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Open on trade website</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Load more trigger */}
          {hasMore && (
            <div ref={loaderRef}
              className="py-4 text-center text-xs text-gray-500">
              {isLoading ? 'Loading more...' : 'Load more'}
            </div>
          )}
          {!hasMore && listings.length > 0 && (
            <div className="text-center text-sm text-muted-foreground py-4">No more results</div>
          )}
        </div>
      )}
      {listings.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <p className="text-muted-foreground mb-2">No results found</p>
          <p className="text-sm text-muted-foreground">Try adjusting your filters or search terms</p>
        </div>
      )}
    </ScrollArea>
  );
};
