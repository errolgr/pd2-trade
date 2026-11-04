import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { Button, CorruptionBadge, QualityBadge, StatLine, cn, DUR, EASE_OUT } from '@pd2-trader/ui';
import { Trans, useTranslation } from '@/i18n';
import { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import { itemCorruptions } from '@/lib/item-utils';

interface ItemStatsDisplayProps {
  stashItem: GameStashItem;
  isExpanded: boolean;
  onToggleExpanded: (itemHash: string) => void;
  hideToggle?: boolean;
}

const COLLAPSED_COUNT = 3;

const chip = 'inline-flex h-5 items-center gap-1 rounded-full border px-2 text-2xs font-medium leading-none';

const ItemStatsDisplay: React.FC<ItemStatsDisplayProps> = ({ stashItem, isExpanded, onToggleExpanded, hideToggle }) => {
  const { t } = useTranslation('quickList');
  const hasModifiers = stashItem.modifiers && stashItem.modifiers.length > 0;

  const filteredModifiers = stashItem.modifiers.filter((mod) => {
    return mod.name !== 'corrupted';
  });

  // Separate corrupted and non-corrupted modifiers
  const corruptions = itemCorruptions(stashItem);
  const isCorruptedMod = (name: string) => corruptions.includes(name);
  const corruptedModifiers = filteredModifiers.filter((mod) => isCorruptedMod(mod.name));
  const nonCorruptedModifiers = filteredModifiers.filter((mod) => !isCorruptedMod(mod.name));

  // Combine with corrupted modifiers at the top
  const sortedModifiers = [...corruptedModifiers, ...nonCorruptedModifiers];
  const visibleModifiers = sortedModifiers.slice(0, COLLAPSED_COUNT);
  const extraModifiers = sortedModifiers.slice(COLLAPSED_COUNT);
  const hasBadges = stashItem.is_ethereal || stashItem.corrupted || stashItem.is_runeword || stashItem.socket_count > 0;

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleExpanded(stashItem.hash);
  };

  const renderModifier = (mod: GameStashItem['modifiers'][number], idx: number) => (
    <StatLine
      key={idx}
      corrupted={isCorruptedMod(mod.name)}
      range={mod.min && mod.max ? [mod.min, mod.max] : undefined}
      className="truncate leading-5"
    >
      {mod.label}
    </StatLine>
  );

  return (
    <div className="text-xs">
      {hasBadges && (
        <div className="mt-1.5 flex flex-row flex-wrap gap-1">
          {stashItem.is_ethereal && (
            <span className={cn(chip, 'border-info/30 bg-info/10 text-info')}>{t('itemStats.ethereal')}</span>
          )}
          {stashItem.corrupted && <CorruptionBadge />}
          {stashItem.is_runeword && <QualityBadge quality="Runeword"
            runeword />}
          {stashItem.socket_count > 0 && (
            <span className={cn(chip, 'border-border bg-secondary/70 pl-0.5 text-secondary-foreground')}>
              <Trans
                t={t}
                i18nKey="itemStats.sockets"
                count={stashItem.socket_count}
                values={{ count: stashItem.socket_count }}
                components={{
                  num: (
                    <span className="inline-flex size-4 items-center justify-center rounded-full bg-foreground/90 text-3xs font-semibold tabular-nums text-background" />
                  ),
                }}
              />
            </span>
          )}
        </div>
      )}

      {hasModifiers && (
        <div className="mt-2">
          {visibleModifiers.map(renderModifier)}
          <AnimatePresence initial={false}>
            {isExpanded && extraModifiers.length > 0 && (
              <motion.div
                key="extra"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: DUR.med, ease: EASE_OUT }}
                className="overflow-hidden"
              >
                {extraModifiers.map((mod, idx) => renderModifier(mod, idx + COLLAPSED_COUNT))}
              </motion.div>
            )}
          </AnimatePresence>
          {!isExpanded && extraModifiers.length > 0 && !hideToggle && (
            <Button
              type="button"
              variant="ghost"
              size="inline"
              onClick={toggle}
              className="group mt-1 gap-0.5 rounded-sm text-xs text-primary hover:bg-transparent hover:text-primary/80"
            >
              {t('itemStats.showMore')}
              <span className="text-muted-foreground">({extraModifiers.length})</span>
              <ChevronDown className="size-3 transition-transform duration-(--dur-fast) group-hover:translate-y-px" />
            </Button>
          )}
          {isExpanded && !hideToggle && (
            <Button
              type="button"
              variant="quiet"
              size="inline"
              onClick={toggle}
              className="mt-1 gap-0.5 rounded-sm text-xs"
            >
              {t('itemStats.showLess')}
              <ChevronDown className="size-3 rotate-180" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default ItemStatsDisplay;
