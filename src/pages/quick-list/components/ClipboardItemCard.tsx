import React, { useMemo, useState } from 'react';
import { Hourglass } from 'lucide-react';
import { Item as PriceCheckItem } from '@/pages/price-check/lib/interfaces';
import { tooltipLines } from '@/pages/price-check/lib/tooltip-lines';
import { qualityColor } from '@/pages/price-check/lib/qualityColor';
import { cn } from '@/lib/utils';
import ItemStatsDisplay, { StatsItem } from './ItemStatsDisplay';
import { itemCard } from './styles';

interface ClipboardItemCardProps {
  item: PriceCheckItem;
}

/**
 * The copied item when the stash has no match, drawn like the stash item cards with a dotted border: it is
 * what gets queued, listed once the stash syncs it.
 */
const ClipboardItemCard: React.FC<ClipboardItemCardProps> = ({ item }) => {
  const [expanded, setExpanded] = useState(false);
  const name = (item.isRuneword && item.runeword) || item.name || item.type;

  const statsItem = useMemo<StatsItem>(() => {
    const lines = tooltipLines(item).stats;
    const corrupted = lines.some((l) => l.text === 'Corrupted');
    const modifiers = lines
      .filter((l) => l.text !== 'Corrupted')
      .map((l, i) => ({ name: l.star ? `corrupted-${i}` : `stat-${i}`, label: l.text }));
    return {
      hash: 'clipboard',
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
      role="group"
      aria-label={`${name}, from clipboard, not synced to stash`}
      className={cn(itemCard({ tone: 'selected' }), 'cursor-default border-dotted border-primary ring-0')}
    >
      <div className="flex min-h-7 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span aria-hidden
            className="flex size-4 shrink-0 items-center justify-center rounded-full border border-primary bg-primary">
            <span className="size-1.5 rounded-full bg-primary-foreground" />
          </span>
          <div className={cn('truncate', qualityColor(item.isRuneword ? 'Unique' : item.quality))}
            style={{ fontFamily: 'DiabloFont' }}>
            {name}
          </div>
        </div>
        <span className="inline-flex h-5 shrink-0 items-center gap-1 rounded-full border border-warning/35 bg-warning/12 px-2 text-[11px] font-medium leading-none text-warning">
          <Hourglass className="size-3" />
          Not synced to stash
        </span>
      </div>
      <div className="pl-6">
        <ItemStatsDisplay stashItem={statsItem}
          isExpanded={expanded}
          onToggleExpanded={() => setExpanded((e) => !e)} />
      </div>
    </div>
  );
};

export default ClipboardItemCard;
