import React from 'react';
import { motion } from 'framer-motion';
import { ChevronsDownUp, ChevronsUpDown, Loader2 } from 'lucide-react';
import { Badge, Button, ItemName, ScrollArea, cn, itemCardVariants, listItem, listStagger } from '@pd2-trader/ui';
import { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import ItemStatsDisplay from './ItemStatsDisplay';
import MarketListingBadge from './MarketListingBadge';
import { useTranslation } from '@/i18n';

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
  const { t } = useTranslation('quickList');
  const anyExpanded = expandedItems.size > 0;

  return (
    <div className="mb-3 flex min-h-0 flex-1 flex-col">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-2xs font-semibold uppercase tracking-caps text-muted-foreground">
            {t('selection.selectItem')}
          </span>
          <Badge variant="count"
            aria-hidden>
            {matchingItems.length}
          </Badge>
          <span className="sr-only">{t('selection.foundCount', { count: matchingItems.length })}</span>
          {isMarketListingsLoading && (
            <span className="flex items-center gap-1 text-2xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" /> {t('selection.loadingMarketListings')}
            </span>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="inline"
          onClick={anyExpanded ? onCollapseAll : onExpandAll}
          className="rounded-md px-1.5 py-0.5 text-xs text-primary hover:bg-primary/10 hover:text-primary"
        >
          {anyExpanded ? <ChevronsDownUp className="size-3.5" /> : <ChevronsUpDown className="size-3.5" />}
          {anyExpanded ? t('selection.showLess') : t('selection.showAllStats')}
        </Button>
      </div>
      <ScrollArea className="min-h-0 flex-1 pr-2 [&_[data-radix-scroll-area-viewport]>div]:!block">
        <motion.div
          role="group"
          aria-label={t('selection.matchingItems')}
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
                className={itemCardVariants({ tone: isSelected ? 'selected' : 'interactive' })}
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
                        isSelected
                          ? 'border-primary bg-primary'
                          : 'border-muted-foreground/50 group-hover/card:border-ring',
                      )}
                    >
                      <span
                        className={cn(
                          'size-1.5 rounded-full bg-primary-foreground transition-transform duration-(--dur-fast) ease-spring',
                          isSelected ? 'scale-100' : 'scale-0',
                        )}
                      />
                    </span>
                    <ItemName
                      name={stashItem.name}
                      quality={stashItem.quality.name}
                      className="block truncate"
                      style={{ fontFamily: 'DiabloFont' }}
                    />
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
