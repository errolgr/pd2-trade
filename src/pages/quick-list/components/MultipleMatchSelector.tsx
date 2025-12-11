import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import { qualityColor } from '@/pages/price-check/lib/qualityColor';
import ItemStatsDisplay from './ItemStatsDisplay';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface MultipleMatchSelectorProps {
  matchingItems: GameStashItem[];
  expandedItems: Set<string>;
  onItemSelect: (item: GameStashItem) => void;
  onToggleExpanded: (itemHash: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}

const MultipleMatchSelector: React.FC<MultipleMatchSelectorProps> = ({
  matchingItems,
  expandedItems,
  onItemSelect,
  onToggleExpanded,
  onExpandAll,
  onCollapseAll,
}) => {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
        <AlertCircle className="h-5 w-5 text-yellow-500" />
        <div className="flex-1">
          <div className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
            Multiple items found
          </div>
          <div className="text-xs text-yellow-600/80 dark:text-yellow-400/80">
            Please select which item you want to list:
          </div>
        </div>
      </div>
      <div className="flex justify-between items-center mb-2">
        <div className="text-xs font-medium flex items-center gap-2">
          Select Item ({matchingItems.length} found)
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
        <div className="flex flex-col gap-2 max-h-[20rem]">
          {matchingItems.map((stashItem, index) => (
            <div
              key={stashItem.hash || index}
              className="p-3 border rounded cursor-pointer transition-colors border-neutral-600 hover:border-neutral-500"
              onClick={() => onItemSelect(stashItem)}
            >
              <div className="flex justify-between items-center gap-2">
                <div className={qualityColor(stashItem.quality.name)}
                  style={{ fontFamily: 'DiabloFont' }}>
                  {stashItem.name}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onItemSelect(stashItem);
                  }}
                >
                  Select
                </Button>
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

export default MultipleMatchSelector;

