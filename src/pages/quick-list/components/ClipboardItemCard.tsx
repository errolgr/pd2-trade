import React, { useMemo } from 'react';
import { Hourglass } from 'lucide-react';
import { Item as PriceCheckItem } from '@/pages/price-check/lib/interfaces';
import { tooltipLines } from '@/pages/price-check/lib/tooltip-lines';
import { qualityColor } from '@/pages/price-check/lib/qualityColor';
import { cn } from '@/lib/utils';
import ItemStatsDisplay, { StatsItem } from './ItemStatsDisplay';
import { itemCard } from './styles';

/** Expand-state key of the clipboard card (stash items use their hash). */
export const CLIPBOARD_HASH = 'clipboard';

interface ClipboardItemCardProps {
  item: PriceCheckItem;
  /** Picked to be queued (always, when it is the only card). */
  selected: boolean;
  /** Picks the card when stash items are listed with it; absent when it is the only card. */
  onSelect?: () => void;
  isExpanded: boolean;
  onToggleExpanded: (itemHash: string) => void;
}

/**
 * The copied item, drawn like the stash item cards with a dotted border: picking it queues the listing until
 * the stash syncs the item.
 */
const ClipboardItemCard: React.FC<ClipboardItemCardProps> = ({
  item,
  selected,
  onSelect,
  isExpanded,
  onToggleExpanded,
}) => {
  const name = (item.isRuneword && item.runeword) || item.name || item.type;

  const statsItem = useMemo<StatsItem>(() => {
    const lines = tooltipLines(item).stats;
    const corrupted = lines.some((l) => l.text === 'Corrupted');
    const modifiers = lines
      .filter((l) => l.text !== 'Corrupted')
      .map((l, i) => ({ name: l.star ? `corrupted-${i}` : `stat-${i}`, label: l.text }));
    return {
      hash: CLIPBOARD_HASH,
      is_ethereal: item.isEthereal === true,
      corrupted,
      is_runeword: item.isRuneword === true,
      socket_count: item.sockets ?? 0,
      corruptions: modifiers.filter((m) => m.name.startsWith('corrupted-')).map((m) => m.name),
      modifiers,
    };
  }, [item]);

  return (
    <div
      role={onSelect ? 'button' : 'group'}
      aria-pressed={onSelect ? selected : undefined}
      tabIndex={onSelect ? 0 : undefined}
      aria-label={`${name}, from clipboard, not synced to stash`}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (!onSelect || e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        itemCard({ tone: selected ? 'selected' : 'interactive' }),
        'border-dotted',
        selected ? 'border-primary ring-0' : 'border-muted-foreground/60',
        !onSelect && 'cursor-default',
      )}
    >
      <div className="flex min-h-7 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden
            className={cn(
              'flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors duration-(--dur-fast)',
              selected ? 'border-primary bg-primary' : 'border-muted-foreground/50 group-hover/card:border-ring',
            )}
          >
            <span
              className={cn(
                'size-1.5 rounded-full bg-primary-foreground transition-transform duration-(--dur-fast) ease-spring',
                selected ? 'scale-100' : 'scale-0',
              )}
            />
          </span>
          <div className={cn('truncate', qualityColor(item.isRuneword ? 'Unique' : item.quality))}
            style={{ fontFamily: 'DiabloFont' }}>
            {name}
          </div>
        </div>
        <span
          className={cn(
            'inline-flex h-5 shrink-0 items-center gap-1 rounded-full border px-2 text-[11px] font-medium leading-none',
            selected
              ? 'border-warning/35 bg-warning/12 text-warning'
              : 'border-dotted border-muted-foreground/60 text-muted-foreground',
          )}
        >
          <Hourglass className="size-3" />
          Not synced to stash
        </span>
      </div>
      <div className="pl-6">
        <ItemStatsDisplay stashItem={statsItem}
          isExpanded={isExpanded}
          onToggleExpanded={onToggleExpanded} />
      </div>
    </div>
  );
};

export default ClipboardItemCard;
