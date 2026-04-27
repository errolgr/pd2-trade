import React, { useCallback, useState } from 'react';
import { X, Trash2, Loader2, GripVertical } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useViewManager, VIEW_IDS } from '@/hooks/useViewManager';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { qualityColor } from '@/pages/price-check/lib/qualityColor';
import { emit } from '@/lib/browser-events';
import { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';

const DelistPopup: React.FC = () => {
  const { hideView, getView } = useViewManager();
  const { deleteMarketListing } = usePd2Website();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const view = getView(VIEW_IDS.DELIST_POPUP);
  const listings: MarketListingEntry[] = view?.data?.listings ?? [];

  const handleDelete = useCallback(
    async (listing: MarketListingEntry) => {
      if (deletingId) return;
      setDeletingId(listing._id);
      try {
        await deleteMarketListing(listing._id);
        emit('toast-event', {
          title: 'Delist',
          description: `Removed ${listing.item.name} listing.`,
        });
        hideView(VIEW_IDS.DELIST_POPUP);
      } catch (err) {
        console.error('[DelistPopup] Delete failed:', err);
        emit('toast-event', {
          title: 'Delist',
          description: 'Failed to remove listing.',
          variant: 'error',
        });
        setDeletingId(null);
      }
    },
    [deleteMarketListing, deletingId, hideView],
  );

  return (
    <div className="flex flex-col h-full bg-background rounded-lg border border-border shadow-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/50"
        data-drag-handle>
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
          <span className="text-sm font-medium">Select listing to remove</span>
        </div>
        <X
          className="w-4 h-4 cursor-pointer hover:opacity-70 transition-opacity text-muted-foreground"
          onClick={() => hideView(VIEW_IDS.DELIST_POPUP)}
        />
      </div>
      <ScrollArea className="flex-1 min-h-0 p-2">
        <div className="space-y-1">
          {listings.map((listing) => (
            <div
              key={listing._id}
              className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors border border-transparent hover:border-border"
            >
              <div className="flex-1 min-w-0">
                <div className={qualityColor(listing.item.quality.name)}
                  style={{ fontFamily: 'DiabloFont' }}>
                  {listing.item.name}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {listing.hr_price ? `${listing.hr_price} HR` : ''}{' '}
                  {listing.price && listing.price !== '0' ? listing.price : ''}
                </div>
              </div>
              <div className="flex items-center ml-2">
                {deletingId === listing._id ? (
                  <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                ) : (
                  <Trash2
                    className="w-4 h-4 hover:opacity-70 transition-opacity cursor-pointer text-red-500"
                    onClick={() => handleDelete(listing)}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default DelistPopup;
