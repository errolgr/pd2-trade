import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DUR, EASE_OUT } from '@/lib/motion';
import { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';

interface ItemStatsDisplayProps {
  stashItem: GameStashItem;
  isExpanded: boolean;
  onToggleExpanded: (itemHash: string) => void;
  hideToggle?: boolean;
}

const COLLAPSED_COUNT = 3;

const chip = 'inline-flex h-5 items-center gap-1 rounded-full border px-2 text-[11px] font-medium leading-none';

const ItemStatsDisplay: React.FC<ItemStatsDisplayProps> = ({ stashItem, isExpanded, onToggleExpanded, hideToggle }) => {
  const hasModifiers = stashItem.modifiers && stashItem.modifiers.length > 0;

  const filteredModifiers = stashItem.modifiers.filter((mod) => {
    return mod.name !== 'corrupted';
  });

  // Separate corrupted and non-corrupted modifiers
  const isCorruptedMod = (name: string) => stashItem.corruptions?.includes(name) ?? false;
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
    <div
      key={idx}
      className={cn('truncate leading-5 text-foreground/85', isCorruptedMod(mod.name) && 'text-q-corrupted')}
    >
      {mod.label}
      {mod?.min && mod?.max && <span className="text-muted-foreground">{`: [${mod.min} - ${mod.max}]`}</span>}
    </div>
  );

  return (
    <div className="text-xs">
      {hasBadges && (
        <div className="mt-1.5 flex flex-row flex-wrap gap-1">
          {stashItem.is_ethereal && <span className={cn(chip, 'border-info/30 bg-info/10 text-info')}>Ethereal</span>}
          {stashItem.corrupted && (
            <span className={cn(chip, 'border-destructive/35 bg-destructive/12 text-q-corrupted')}>Corrupted</span>
          )}
          {stashItem.is_runeword && (
            <span className={cn(chip, 'border-q-rune/30 bg-q-rune/10 text-q-rune')}>Runeword</span>
          )}
          {stashItem.socket_count > 0 && (
            <span className={cn(chip, 'border-border bg-secondary/70 pl-0.5 text-secondary-foreground')}>
              <span className="inline-flex size-4 items-center justify-center rounded-full bg-foreground/90 text-[10px] font-semibold tabular-nums text-background">
                {stashItem.socket_count}
              </span>
              Socket{stashItem.socket_count > 1 ? 's' : ''}
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
            <button
              type="button"
              onClick={toggle}
              className="group mt-1 inline-flex items-center gap-0.5 rounded-sm text-xs font-medium text-primary outline-none transition-colors duration-(--dur-fast) hover:text-primary/80 focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              Show More
              <span className="text-muted-foreground">({extraModifiers.length})</span>
              <ChevronDown className="size-3 transition-transform duration-(--dur-fast) group-hover:translate-y-px" />
            </button>
          )}
          {isExpanded && !hideToggle && (
            <button
              type="button"
              onClick={toggle}
              className="mt-1 inline-flex items-center gap-0.5 rounded-sm text-xs font-medium text-muted-foreground outline-none transition-colors duration-(--dur-fast) hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              Show Less
              <ChevronDown className="size-3 rotate-180" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ItemStatsDisplay;
