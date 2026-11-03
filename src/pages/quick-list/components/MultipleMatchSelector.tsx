import React from 'react';
import { motion } from 'framer-motion';
import { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import ItemStatsDisplay from './ItemStatsDisplay';
import { AlertCircle, ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import { Badge, ScrollArea, Button, ItemName, fadeInUp, itemCardVariants, listItem, listStagger } from '@pd2-trader/ui';
import { useTranslation } from '@/i18n';

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
  const { t } = useTranslation('quickList');
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
          <div className="text-sm font-semibold text-foreground">{t('selection.multipleTitle')}</div>
          <div className="text-xs text-muted-foreground">{t('selection.multiplePrompt')}</div>
        </div>
      </motion.div>
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
      <ScrollArea className="pr-2 [&_[data-radix-scroll-area-viewport]>div]:!block">
        <motion.div
          className="flex max-h-80 flex-col gap-2 p-px"
          variants={listStagger}
          initial="hidden"
          animate="visible"
        >
          {matchingItems.map((stashItem, index) => (
            <motion.div
              variants={listItem}
              key={stashItem.hash || index}
              className={itemCardVariants({ tone: 'interactive' })}
              onClick={() => onItemSelect(stashItem)}
            >
              <div className="flex items-center justify-between gap-2">
                <ItemName
                  name={stashItem.name}
                  quality={stashItem.quality.name}
                  className="block truncate"
                  style={{ fontFamily: 'DiabloFont' }}
                />
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
                  {t('selection.select')}
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
