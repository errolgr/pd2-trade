import React from 'react';
import { motion } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import { qualityColor } from '@/pages/price-check/lib/qualityColor';
import ItemStatsDisplay from './ItemStatsDisplay';
import { Button } from '@/components/ui/button';
import { AlertCircle, ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fadeInUp, listItem, listStagger } from '@/lib/motion';
import { countChip, itemCard, sectionLabel } from './styles';

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
  const anyExpanded = expandedItems.size > 0;

  return (
    <div className="mb-4">
      <motion.div
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        role="status"
        className="mb-3 flex items-center gap-3 rounded-lg border border-warning/35 bg-warning/10 p-3"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning">
          <AlertCircle className="size-4" />
        </span>
        <div className="flex-1">
          <div className="text-sm font-semibold text-foreground">Multiple items found</div>
          <div className="text-xs text-muted-foreground">Please select which item you want to list:</div>
        </div>
      </motion.div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={sectionLabel}>Select Item</span>
          <span className={countChip}
            aria-hidden>
            {matchingItems.length}
          </span>
          <span className="sr-only">({matchingItems.length} found)</span>
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
      <ScrollArea className="pr-2 [&_[data-radix-scroll-area-viewport]>div]:!block">
        <motion.div className="flex max-h-[20rem] flex-col gap-2 p-px"
          variants={listStagger}
          initial="hidden"
          animate="visible">
          {matchingItems.map((stashItem, index) => (
            <motion.div
              variants={listItem}
              key={stashItem.hash || index}
              className={itemCard({ tone: 'interactive' })}
              onClick={() => onItemSelect(stashItem)}
            >
              <div className="flex items-center justify-between gap-2">
                <div className={cn('truncate', qualityColor(stashItem.quality.name))}
                  style={{ fontFamily: 'DiabloFont' }}>
                  {stashItem.name}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
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
            </motion.div>
          ))}
        </motion.div>
      </ScrollArea>
    </div>
  );
};

export default MultipleMatchSelector;
