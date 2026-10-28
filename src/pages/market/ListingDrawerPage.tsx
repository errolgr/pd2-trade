import React, { useCallback, useMemo, useState } from 'react';
import { MotionConfig } from 'framer-motion';
import { ExternalLink, Loader2, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';
import { WindowChrome, WindowPanel } from '@/components/custom/window-chrome';
import { usePanel, useOverlay } from '@/overlay';
import { useOptions } from '@/hooks/useOptions';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { openUrl } from '@/lib/browser-opener';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { useDealIndicators } from '@/pages/market/enrich/useDealIndicators';
import { useMarketStore } from '@/pages/market/store/useMarketStore';
import { useListingLookup } from './alerts/listing-lookup';
import { ListingDetail } from './components/ListingDetail';
import { useMarketFavorites } from './hooks/useMarketFavorites';
import { defaultFilters, upgradeFilters } from './lib/defaults';
import { listingUrl } from './lib/listing';
import { scoreListings } from './lib/search';

/**
 * `listingDetail` panel: one market listing as a drawer on the game's right edge (a watch toast's Details), with
 * the market browser's detail pane: tooltip, the watch's pseudo totals, price, history, seller and trade actions.
 */
export const ListingDrawerPage: React.FC = () => {
  const { payload, payloadVersion, close } = usePanel<'listingDetail'>();
  const { openPanel } = useOverlay();
  const { settings } = useOptions();
  const { marketApi } = usePd2Website();
  const { savedSearches } = useMarketStore();
  const signedIn = !!settings?.pd2Token;
  const lookup = useListingLookup(payload?.listingId);

  /** A listing picked from the seller card (shown in place of the looked-up one until the next open). */
  const [picked, setPicked] = useState<{ version: number; listing: MarketListingEntry } | null>(null);
  const pickedListing = picked?.version === payloadVersion ? picked.listing : null;
  const listing = pickedListing ?? (lookup.state === 'ready' ? lookup.detail.listing : null);
  /** Sold or removed: no offer/whisper (seller card picks are live listings). */
  const archived = !pickedListing && lookup.state === 'ready' && lookup.detail.status !== 'active';

  const mode = useMemo(
    () => ({ hardcore: settings?.mode === 'hardcore', ladder: settings?.ladder !== 'non-ladder' }),
    [settings?.mode, settings?.ladder],
  );
  const watch = payload?.savedSearchId ? savedSearches.find((s) => s.id === payload.savedSearchId) : undefined;
  const filters = useMemo(() => upgradeFilters(watch?.filters ?? defaultFilters(mode)), [watch?.filters, mode]);
  const pseudoKeys = useMemo(
    () => filters.stats.filter((s) => s.enabled && !s.not && s.kind === 'pseudo').map((s) => s.key),
    [filters.stats],
  );
  const row = useMemo(() => (listing ? scoreListings([listing], filters)[0] : null), [listing, filters]);
  const listings = useMemo(() => (listing ? [listing] : []), [listing]);
  const deals = useDealIndicators(listings);

  const favorites = useMarketFavorites(marketApi ?? null, signedIn);
  const favorite = !!listing && favorites.favorites.some((f) => f.listing_id === listing._id);
  const { toggle } = favorites;
  const toggleFavorite = useCallback((l: MarketListingEntry) => void toggle(l), [toggle]);

  const browseSeller = (l: MarketListingEntry) => {
    openPanel('market', { filters: { sellerUserId: l.user_id, sellerName: l.user?.username }, tab: 'search' });
    close();
  };

  return (
    <MotionConfig reducedMotion="user">
      <TooltipProvider delayDuration={300}>
        <WindowPanel animate
          className="h-full w-full">
          {row ? (
            <ListingDetail
              row={row}
              deal={deals.get(row.listing._id)}
              api={marketApi ?? null}
              archived={archived}
              favorite={favorite}
              onToggleFavorite={toggleFavorite}
              onClose={close}
              onBrowseSeller={browseSeller}
              onSelectListing={(l) => setPicked({ version: payloadVersion, listing: l })}
              pseudoKeys={pseudoKeys}
            />
          ) : (
            <>
              <WindowChrome title="Listing"
                showGrip={false}
                dragRegion={false}
                onClose={close} />
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground">
                {lookup.state === 'loading' ? (
                  <Loader2 className="size-5 animate-spin"
                    aria-label="Loading listing" />
                ) : (
                  <>
                    <SearchX className="size-6" />
                    <p>
                      {lookup.state === 'missing'
                        ? 'This listing is no longer on the market.'
                        : 'Could not load this listing. Try again in a moment.'}
                    </p>
                    {payload?.listingId && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => void openUrl(listingUrl({ _id: payload.listingId }))}
                      >
                        <ExternalLink className="size-3.5" />
                        Open on projectdiablo2.com
                      </Button>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </WindowPanel>
      </TooltipProvider>
    </MotionConfig>
  );
};
