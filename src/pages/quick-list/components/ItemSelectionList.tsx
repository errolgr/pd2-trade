import React from 'react';
import { motion } from 'framer-motion';
import { ChevronsDownUp, ChevronsUpDown, Loader2 } from 'lucide-react';
import { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { qualityColor } from '@/pages/price-check/lib/qualityColor';
import ItemStatsDisplay from './ItemStatsDisplay';
import MarketListingBadge from './MarketListingBadge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { listItem, listStagger } from '@/lib/motion';
import { countChip, itemCard, sectionLabel } from './styles';

interface ItemSelectionListProps {
  matchingItems: GameStashItem[];
  selectedItem: GameStashItem | null;
  currentListings: MarketListingEntry[];
  expandedItems: Set<string>;
  isMarketListingsLoading: boolean;
  onItemSelect: (item: GameStashItem) => void;
  onToggleExpanded: (itemHash: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onBump: (marketId: string, itemHash: string) => Promise<void>;
  onRefresh: () => Promise<void>;
  deleteMarketListing: (listingId: string) => Promise<void>;
}

const ItemSelectionList: React.FC<ItemSelectionListProps> = ({
  matchingItems,
  selectedItem,
  currentListings,
  expandedItems,
  isMarketListingsLoading,
  deleteMarketListing,
  onItemSelect,
  onToggleExpanded,
  onExpandAll,
  onCollapseAll,
  onBump,
  onRefresh,
}) => {
  const anyExpanded = expandedItems.size > 0;

  return (
    <div className="mb-3 flex min-h-0 flex-1 flex-col">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={sectionLabel}>Select Item</span>
          <span className={countChip}
            aria-hidden>
            {matchingItems.length}
          </span>
          <span className="sr-only">({matchingItems.length} found)</span>
          {isMarketListingsLoading && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Loader2 className="size-3 animate-spin" /> Loading market listings...
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={anyExpanded ? onCollapseAll : onExpandAll}
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-primary outline-none transition-colors duration-(--dur-fast) hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          {anyExpanded ? <ChevronsDownUp className="size-3.5" /> : <ChevronsUpDown className="size-3.5" />}
          {anyExpanded ? 'Show Less' : 'Show All Stats'}
        </button>
      </div>
      <ScrollArea className="min-h-0 flex-1 pr-2 [&_[data-radix-scroll-area-viewport]>div]:!block">
        <motion.div
          role="group"
          aria-label="Matching stash items"
          className="flex flex-col gap-2 p-px pb-3"
          variants={listStagger}
          initial="hidden"
          animate="visible"
        >
          {matchingItems.map((stashItem, index) => {
            const isSelected = selectedItem?.hash === stashItem.hash;
            return (
              <motion.div
                variants={listItem}
                key={stashItem.hash || index}
                role="button"
                aria-pressed={isSelected}
                tabIndex={0}
                className={itemCard({ tone: isSelected ? 'selected' : 'interactive' })}
                onClick={() => onItemSelect(stashItem)}
                onKeyDown={(e) => {
                  if (e.target !== e.currentTarget) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onItemSelect(stashItem);
                  }
                }}
              >
                <div className="flex min-h-7 items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      aria-hidden
                      className={cn(
                        'flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors duration-(--dur-fast)',
                        isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/50 group-hover/card:border-ring',
                      )}
                    >
                      <span
                        className={cn(
                          'size-1.5 rounded-full bg-primary-foreground transition-transform duration-(--dur-fast) ease-spring',
                          isSelected ? 'scale-100' : 'scale-0',
                        )}
                      />
                    </span>
                    <div className={cn('truncate', qualityColor(stashItem.quality.name))}
                      style={{ fontFamily: 'DiabloFont' }}>
                      {stashItem.name}
                    </div>
                  </div>
                  <MarketListingBadge
                    key={`${stashItem.hash}-${currentListings.length}`}
                    stashItem={stashItem}
                    currentListings={currentListings}
                    onBump={onBump}
                    onRefresh={onRefresh}
                    deleteMarketListing={deleteMarketListing}
                  />
                </div>
                <div className="pl-6">
                  <ItemStatsDisplay
                    stashItem={stashItem}
                    isExpanded={expandedItems.has(stashItem.hash)}
                    onToggleExpanded={onToggleExpanded}
                  />
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </ScrollArea>
    </div>
  );
};

export default ItemSelectionList;
