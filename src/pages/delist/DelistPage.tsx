import React, { useCallback, useEffect, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { qualityColor } from '@/pages/price-check/lib/qualityColor';
import { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { OptionsProvider } from '@/hooks/useOptions';
import { ItemsProvider } from '@/hooks/useItems';
import { ChildPd2WebsiteProvider, usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { emit } from '@/lib/browser-events';
import { getCurrentWebviewWindow } from '@/lib/browser-webview';
import { useSearchParams } from 'react-router-dom';
import ItemStatsDisplay from '@/pages/quick-list/components/ItemStatsDisplay';

const DelistContent: React.FC = () => {
  const { deleteMarketListing } = usePd2Website();
  const [listings, setListings] = useState<MarketListingEntry[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const data = searchParams.get('data');
    if (data) {
      try {
        const parsed = JSON.parse(atob(decodeURIComponent(data)));
        setListings(parsed);
      } catch (err) {
        console.error('[DelistPage] Failed to parse listings from URL:', err);
      }
    }
  }, [searchParams]);

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
      } catch (err) {
        console.error('[DelistPage] Delete failed:', err);
        emit('toast-event', {
          title: 'Delist',
          description: 'Failed to remove listing.',
          variant: 'error',
        });
      }
      try {
        await getCurrentWebviewWindow().close();
      } catch {
        // ignore close errors
      }
    },
    [deleteMarketListing, deletingId],
  );

  const handleClose = useCallback(async () => {
    try {
      const win = getCurrentWebviewWindow();
      await win.close();
    } catch {
      // ignore
    }
  }, []);

  return (
    <div className="flex flex-col h-screen bg-background rounded-lg border border-border shadow-lg overflow-hidden">
      <div
        className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/50"
        data-tauri-drag-region
      >
        <span className="text-sm font-medium">Select listing to remove</span>
        <X
          className="w-4 h-4 cursor-pointer hover:opacity-70 transition-opacity text-muted-foreground"
          onClick={handleClose}
        />
      </div>
      <ScrollArea className="flex-1 min-h-0 p-2">
        <div className="space-y-1">
          {listings.map((listing) => (
            <div
              key={listing._id}
              className={`p-3 border rounded border-neutral-600 cursor-pointer transition-colors hover:bg-red-950/30 hover:border-red-500/50 ${deletingId ? 'pointer-events-none opacity-50' : ''}`}
              onClick={() => handleDelete(listing)}
            >
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
                {deletingId === listing._id && <Loader2 className="w-4 h-4 animate-spin text-red-500 shrink-0" />}
              </div>
              <ItemStatsDisplay
                stashItem={listing.item as any}
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
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export const DelistPage: React.FC = () => {
  return (
    <OptionsProvider>
      <ItemsProvider>
        <ChildPd2WebsiteProvider>
          <DelistContent />
        </ChildPd2WebsiteProvider>
      </ItemsProvider>
    </OptionsProvider>
  );
};

export default DelistPage;
