import React, { useCallback, useState } from 'react';
import { MotionConfig, motion } from 'framer-motion';
import { Loader2, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { qualityColor } from '@/pages/price-check/lib/qualityColor';
import { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import ItemStatsDisplay from '@/pages/quick-list/components/ItemStatsDisplay';
import { countChip, itemCard } from '@/pages/quick-list/components/styles';
import { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import { WindowChrome, WindowPanel } from '@/components/custom/window-chrome';
import { cn } from '@/lib/utils';
import { listItem, listStagger } from '@/lib/motion';
import { showToast, usePanel } from '@/overlay';

export const DelistPage: React.FC = () => {
  const { deleteMarketListing } = usePd2Website();
  const { payload, payloadVersion, close } = usePanel<'delist'>();
  const listings = payload?.listings ?? [];
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // A new delist while the picker is open replaces the list: re-enable selection and collapse stats
  const [seenVersion, setSeenVersion] = useState(payloadVersion);
  if (seenVersion !== payloadVersion) {
    setSeenVersion(payloadVersion);
    setDeletingId(null);
    setExpandedItems(new Set());
  }

  const handleDelete = useCallback(
    async (listing: MarketListingEntry) => {
      if (deletingId) return;
      setDeletingId(listing._id);
      try {
        await deleteMarketListing(listing._id);
        showToast({
          title: 'Delist',
          description: `Removed ${listing.item.name} listing.`,
        });
      } catch (err) {
        console.error('[DelistPage] Delete failed:', err);
        showToast({
          title: 'Delist',
          description: 'Failed to remove listing.',
          variant: 'error',
        });
      }
      close();
    },
    [deleteMarketListing, deletingId, close],
  );

  return (
    <MotionConfig reducedMotion="user">
      <WindowPanel animate
        className="h-full w-full">
        <WindowChrome
          title="Select listing to remove"
          icon={<Trash2 />}
          onClose={close}
          showGrip={false}
          actions={
            listings.length > 0 ? (
              <span className={countChip}
                aria-label={`${listings.length} listings`}>
                {listings.length}
              </span>
            ) : undefined
          }
        />
        <ScrollArea className="flex-1 min-h-0">
          <motion.div
            className="space-y-1.5 p-2"
            variants={listStagger}
            initial="hidden"
            animate="visible"
            role="list"
            aria-label="Listings for this item"
          >
            {listings.map((listing) => {
              const isDeleting = deletingId === listing._id;
              return (
                <motion.div
                  variants={listItem}
                  key={listing._id}
                  role="button"
                  tabIndex={deletingId ? -1 : 0}
                  aria-label={`Remove ${listing.item.name} listing`}
                  className={itemCard({
                    tone: 'danger',
                    className: cn(
                      deletingId && 'pointer-events-none',
                      deletingId && !isDeleting && 'border-border/50 bg-card/30',
                      isDeleting && 'border-destructive/60 bg-destructive/10',
                    ),
                  })}
                  onClick={() => handleDelete(listing)}
                  onKeyDown={(e) => {
                    if (e.target !== e.currentTarget) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleDelete(listing);
                    }
                  }}
                >
                  {/* Dim via an inner wrapper: framer owns the card's inline opacity. */}
                  <div
                    className={cn('transition-opacity duration-(--dur-med)', deletingId && !isDeleting && 'opacity-40')}
                  >
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
                      {isDeleting ? (
                        <span
                          className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-destructive"
                          role="status"
                        >
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Removing...
                        </span>
                      ) : (
                        <span
                          aria-hidden
                          className="flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-destructive opacity-0 transition-opacity duration-(--dur-fast) group-hover/card:opacity-100 group-focus-visible/card:opacity-100"
                        >
                          <Trash2 className="size-3.5" />
                          Remove
                        </span>
                      )}
                    </div>
                    <ItemStatsDisplay
                      // Listing ItemDetail is a superset-compatible view of the stash item for display purposes.
                      stashItem={listing.item as unknown as GameStashItem}
                      isExpanded={expandedItems.has(listing._id)}
                      onToggleExpanded={() => {
                        setExpandedItems((prev) => {
                          const next = new Set(prev);
                          if (next.has(listing._id)) next.delete(listing._id);
                          else next.add(listing._id);
                          return next;
                        });
                      }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </ScrollArea>
      </WindowPanel>
    </MotionConfig>
  );
};

export default DelistPage;
