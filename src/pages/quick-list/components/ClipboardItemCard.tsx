import React from 'react';
import { Hourglass, Info } from 'lucide-react';
import { Item as PriceCheckItem } from '@/pages/price-check/lib/interfaces';
import { tooltipLines } from '@/pages/price-check/lib/tooltip-lines';
import { qualityColor } from '@/pages/price-check/lib/qualityColor';
import { cn } from '@/lib/utils';
import { itemCard } from './styles';

interface ClipboardItemCardProps {
  item: PriceCheckItem;
}

/**
 * The copied item when the stash has no match: a dotted card that will be queued, listed once the stash
 * syncs it.
 */
const ClipboardItemCard: React.FC<ClipboardItemCardProps> = ({ item }) => {
  const { header, stats, footer } = tooltipLines(item);
  const name = (item.isRuneword && item.runeword) || item.name || item.type;
  const meta = [item.type !== name ? item.type : null, item.isRuneword ? 'Runeword' : item.quality]
    .filter(Boolean)
    .join(' · ');

  return (
    <div
      role="group"
      aria-label={`${name}, from clipboard, not synced to stash`}
      className={cn(itemCard({ tone: 'static' }), 'border-2 border-dotted border-primary/60 bg-primary/6')}
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

      <div className="pl-6 text-xs">
        {meta && <div className="mt-1 text-muted-foreground">{meta}</div>}
        {header.length > 0 && (
          <div className="mt-2">
            {header.map((line, i) => (
              <div key={i}
                className="truncate leading-5 text-muted-foreground">
                {line.text}
              </div>
            ))}
          </div>
        )}
        {stats.length > 0 && (
          <div className="mt-2">
            {stats.map((line, i) => (
              <div key={i}
                className={cn('truncate leading-5', line.color === 'red' ? 'text-q-corrupted' : 'text-foreground/85')}>
                {line.text}
              </div>
            ))}
          </div>
        )}
        {footer.map((line, i) => (
          <div key={i}
            className="truncate leading-5 text-muted-foreground">
            {line.text}
          </div>
        ))}

        <div className="mt-3 flex items-start gap-1.5 border-t border-dotted border-border pt-2.5 text-[11px] leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          <span>
            Not in your shared stash yet. Queue it and we&apos;ll list it automatically once it syncs: put it in your
            shared stash (not personal), make a new game, and allow a few minutes.
          </span>
        </div>
      </div>
    </div>
  );
};

export default ClipboardItemCard;
