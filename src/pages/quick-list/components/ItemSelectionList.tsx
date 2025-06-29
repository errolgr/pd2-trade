import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, SquareArrowOutUpRight } from "lucide-react";
import { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { qualityColor } from '@/pages/price-check/lib/qualityColor';
import ItemStatsDisplay from './ItemStatsDisplay';
import MarketListingBadge from './MarketListingBadge';
import { Button } from '@/components/ui/button';
import { openUrl } from '@tauri-apps/plugin-opener';
import { PD2Website } from '@/common/constants';

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
  onRefresh
}) => {
  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <div className="text-xs font-medium flex items-center gap-2">
          Select Item ({matchingItems.length} found)
          {isMarketListingsLoading && (
            <span className="flex items-center gap-1 text-xs text-gray-400 ml-2">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading market listings...
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={expandedItems.size > 0 ? onCollapseAll : onExpandAll}
            className="text-blue-500 hover:text-blue-700 text-xs underline"
          >
            {expandedItems.size > 0 ? 'Show Less' : 'Show All Stats'}
          </button>
        </div>
      </div>
      <ScrollArea className="pr-2">
        <div className='flex flex-col gap-2 max-h-[20rem]'>
          {matchingItems.map((stashItem, index) => (
            <div
              key={stashItem.hash || index}
              className={`p-3 border rounded cursor-pointer transition-colors ${
                selectedItem?.hash === stashItem.hash ? 'border-gray-300' : 'border-neutral-600 hover:border-neutral-5'
              }`}
              onClick={() => onItemSelect(stashItem)}
            >
              <div className="flex justify-between items-center gap-2">
                <div className={qualityColor(stashItem.quality.name)} style={{fontFamily: 'DiabloFont'}}>
                  {stashItem.name}
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
              <ItemStatsDisplay
                stashItem={stashItem}
                isExpanded={expandedItems.has(stashItem.hash)}
                onToggleExpanded={onToggleExpanded}
              />
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ItemSelectionList; 