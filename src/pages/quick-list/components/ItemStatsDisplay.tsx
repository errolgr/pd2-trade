import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Trans, useTranslation } from '@/i18n';
import { DUR, EASE_OUT } from '@/lib/motion';
import { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import type { Item as PriceCheckItem } from '@/pages/price-check/lib/interfaces';
import { StatId } from '@/pages/price-check/lib/stat-mappings';
import { tooltipLines } from '@/pages/price-check/lib/tooltip-lines';
import { socketCount } from '@/pages/price-check/lib/tooltip-stats';
import { itemCorruptions } from '@/lib/item-utils';

interface StatsDisplayProps {
  isExpanded: boolean;
  onToggleExpanded: (itemHash: string) => void;
  hideToggle?: boolean;
}

interface StatLine {
  text: string;
  /** Muted after the text: the roll range. */
  detail?: string;
  corrupted: boolean;
}

interface StatsViewProps extends StatsDisplayProps {
  /** Passed to onToggleExpanded. */
  id: string;
  ethereal: boolean;
  corrupted: boolean;
  runeword: boolean;
  sockets: number;
  /** Corrupted lines first. */
  lines: StatLine[];
}

const COLLAPSED_COUNT = 3;

const chip = 'inline-flex h-5 items-center gap-1 rounded-full border px-2 text-[11px] font-medium leading-none';

const StatsView: React.FC<StatsViewProps> = ({
  id,
  ethereal,
  corrupted,
  runeword,
  sockets,
  lines,
  isExpanded,
  onToggleExpanded,
  hideToggle,
}) => {
  const { t } = useTranslation('quickList');
  const visibleLines = lines.slice(0, COLLAPSED_COUNT);
  const extraLines = lines.slice(COLLAPSED_COUNT);
  const hasBadges = ethereal || corrupted || runeword || sockets > 0;

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleExpanded(id);
  };

  const renderLine = (line: StatLine, idx: number) => (
    <div key={idx}
      className={cn('truncate leading-5 text-foreground/85', line.corrupted && 'text-q-corrupted')}>
      {line.text}
      {line.detail && <span className="text-muted-foreground">{line.detail}</span>}
    </div>
  );

  return (
    <div className="text-xs">
      {hasBadges && (
        <div className="mt-1.5 flex flex-row flex-wrap gap-1">
          {ethereal && (
            <span className={cn(chip, 'border-info/30 bg-info/10 text-info')}>{t('itemStats.ethereal')}</span>
          )}
          {corrupted && (
            <span className={cn(chip, 'border-destructive/35 bg-destructive/12 text-q-corrupted')}>
              {t('itemStats.corrupted')}
            </span>
          )}
          {runeword && (
            <span className={cn(chip, 'border-q-rune/30 bg-q-rune/10 text-q-rune')}>{t('itemStats.runeword')}</span>
          )}
          {sockets > 0 && (
            <span className={cn(chip, 'border-border bg-secondary/70 pl-0.5 text-secondary-foreground')}>
              <Trans
                t={t}
                i18nKey="itemStats.sockets"
                count={sockets}
                values={{ count: sockets }}
                components={{
                  num: (
                    <span className="inline-flex size-4 items-center justify-center rounded-full bg-foreground/90 text-[10px] font-semibold tabular-nums text-background" />
                  ),
                }}
              />
            </span>
          )}
        </div>
      )}

      {lines.length > 0 && (
        <div className="mt-2">
          {visibleLines.map(renderLine)}
          <AnimatePresence initial={false}>
            {isExpanded && extraLines.length > 0 && (
              <motion.div
                key="extra"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: DUR.med, ease: EASE_OUT }}
                className="overflow-hidden"
              >
                {extraLines.map((line, idx) => renderLine(line, idx + COLLAPSED_COUNT))}
              </motion.div>
            )}
          </AnimatePresence>
          {!isExpanded && extraLines.length > 0 && !hideToggle && (
            <button
              type="button"
              onClick={toggle}
              className="group mt-1 inline-flex items-center gap-0.5 rounded-sm text-xs font-medium text-primary outline-none transition-colors duration-(--dur-fast) hover:text-primary/80 focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              {t('itemStats.showMore')}
              <span className="text-muted-foreground">({extraLines.length})</span>
              <ChevronDown className="size-3 transition-transform duration-(--dur-fast) group-hover:translate-y-px" />
            </button>
          )}
          {isExpanded && !hideToggle && (
            <button
              type="button"
              onClick={toggle}
              className="mt-1 inline-flex items-center gap-0.5 rounded-sm text-xs font-medium text-muted-foreground outline-none transition-colors duration-(--dur-fast) hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              {t('itemStats.showLess')}
              <ChevronDown className="size-3 rotate-180" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const byCorruption = (lines: StatLine[]): StatLine[] => [
  ...lines.filter((l) => l.corrupted),
  ...lines.filter((l) => !l.corrupted),
];

/** A stash item's modifiers and flags. */
const ItemStatsDisplay: React.FC<StatsDisplayProps & { stashItem: GameStashItem }> = ({ stashItem, ...props }) => {
  const corruptions = itemCorruptions(stashItem);
  const lines = (stashItem.modifiers ?? [])
    .filter((mod) => mod.name !== 'corrupted')
    .map((mod) => ({
      text: mod.label,
      detail: mod?.min && mod?.max ? `: [${mod.min} - ${mod.max}]` : undefined,
      corrupted: corruptions.includes(mod.name),
    }));
  return (
    <StatsView
      {...props}
      id={stashItem.hash}
      ethereal={!!stashItem.is_ethereal}
      corrupted={!!stashItem.corrupted}
      runeword={!!stashItem.is_runeword}
      sockets={stashItem.socket_count ?? 0}
      lines={byCorruption(lines)}
    />
  );
};

/** A copied (clipboard) item's properties as its tooltip shows them, laid out like a stash item's. */
export const ClipboardStatsDisplay: React.FC<StatsDisplayProps & { item: PriceCheckItem; id: string }> = ({
  item,
  ...props
}) => {
  const { stats } = tooltipLines(item);
  const lines = stats
    // The Corrupted line is the badge
    .filter((line) => !(line.color === 'red' && line.text === 'Corrupted'))
    .map((line) => ({ text: line.text, detail: line.range && ` ${line.range}`, corrupted: !!line.star }));
  return (
    <StatsView
      {...props}
      ethereal={item.isEthereal === true || (item.stats ?? []).some((s) => s.stat_id === StatId.Ethereal)}
      corrupted={(item.stats ?? []).some((s) => s.stat_id === StatId.Corrupted && !s._injected)}
      runeword={!!item.isRuneword}
      sockets={socketCount(item)}
      lines={byCorruption(lines)}
    />
  );
};

export default ItemStatsDisplay;
