import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Stat } from '@/pages/price-check/lib/interfaces';
import { statIdToProperty, StatId } from '@/pages/price-check/lib/stat-mappings';
import { HoverPopover } from '@/components/custom/hover-popover';
import { Badge } from '@/components/ui/badge';
import { fuzzyMatchCharacterSkill } from '@/assets/character-skills';
import { fuzzyClassSkillByName, fuzzyClassSubSkillByName } from '@/assets/class-skills';
import { X, Check, Info } from 'lucide-react';
import { DUR, EASE_OUT } from '@/lib/motion';

interface StatRowProps {
  stat: Stat;
  nested?: boolean;
  updateFilter: (key: string, field: 'value' | 'min' | 'max', val: string) => void;
  filters: Record<string, { value?: string; min?: string; max?: string }>;
  selected: Set<string>;
  toggle: (stat: Stat) => void;
  corruptedState?: number; // 0 = both, 1 = corrupted only, 2 = non-corrupted only
  /** Called when Enter is pressed inside the min/max inputs. */
  onSubmit?: () => void;
}

// h-6 keeps the row at its min-h-8 (py-1 + 24px) so selecting a stat doesn't change the row height.
const numberInputClass =
  'h-6 w-16 rounded-md border border-input bg-background/60 px-2 text-xs tabular-nums text-foreground shadow-xs outline-none transition-[border-color,box-shadow] duration-(--dur-fast) placeholder:text-muted-foreground hover:border-ring/40 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 dark:bg-input/30';

const CORRUPTED_STATE_HINT: Record<number, string> = {
  1: 'only',
  2: 'excluded',
};

export const StatRow: React.FC<StatRowProps> = ({
  stat,
  nested,
  updateFilter,
  filters,
  selected,
  toggle,
  corruptedState = 0,
  onSubmit,
}) => {
  const statKey = 'skill' in stat && stat.skill ? `skill:${stat.skill.toLowerCase()}` : `id:${stat.stat_id}`;
  const isSocket = stat.stat_id === StatId.Socket;
  const isCorrupted = stat.stat_id === StatId.Corrupted;
  const isEthereal = stat.stat_id === StatId.Ethereal;
  const isSkill = 'skill' in stat;
  const isUnknownSkill =
    isSkill &&
    !fuzzyMatchCharacterSkill(stat.skill.toLowerCase()) &&
    !fuzzyClassSkillByName(stat.skill.toLowerCase()) &&
    !fuzzyClassSubSkillByName(stat.skill.toLowerCase());
  const isUnknown = (statIdToProperty[stat.stat_id] === undefined && !isSkill) || isUnknownSkill;

  // For corrupted stat, determine checkbox state
  const corruptedChecked = isCorrupted && corruptedState === 1;
  const corruptedIndeterminate = isCorrupted && corruptedState === 2;

  // Check if corrupted stat is injected (not actually on the item)
  const isInjectedCorrupted = isCorrupted && '_injected' in stat && stat._injected === true;

  const isSelected = selected.has(statKey);
  const isActive = isCorrupted ? corruptedState !== 0 : isSelected;
  const showRangeInputs = !isCorrupted && !isEthereal && isSelected;
  const corruptedHint = isCorrupted ? CORRUPTED_STATE_HINT[corruptedState] : undefined;

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onSubmit) {
      e.preventDefault();
      onSubmit();
    }
  };

  const valueParts = (showCorruptedValue: boolean) => (
    <>
      {showCorruptedValue && stat.value !== undefined && (
        <>
          <span className="text-muted-foreground">: </span>
          <span className="font-semibold tabular-nums">{stat.value}</span>
        </>
      )}
      {!isSocket && showCorruptedValue && stat.range && stat.value !== undefined && (
        <span className="ml-1 text-xs tabular-nums text-muted-foreground">
          ({stat.range.min}-{stat.range.max})
        </span>
      )}
    </>
  );

  return (
    <div
      data-active={isActive || undefined}
      className={cn(
        'rounded-md transition-[background-color,box-shadow] duration-(--dur-fast) ease-out',
        isActive ? 'bg-accent/60 shadow-[inset_2px_0_0_var(--glow)]' : !isUnknown && 'hover:bg-accent/40',
      )}
    >
      <label
        key={statKey}
        className={cn(
          'flex min-h-8 flex-row items-center justify-between gap-2 px-2 py-1',
          nested && 'pl-8',
          isUnknown && 'cursor-not-allowed',
        )}
      >
        <div className="flex min-w-0 cursor-pointer select-none items-center gap-2.5">
          {isCorrupted ? (
            <div
              className={cn(
                'peer flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-[4px] border border-input shadow-xs outline-none transition-[background-color,border-color,box-shadow] duration-(--dur-fast) focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/60',
                corruptedChecked && 'border-primary bg-primary text-primary-foreground',
                corruptedIndeterminate && 'border-destructive bg-destructive text-destructive-foreground',
                !corruptedChecked && !corruptedIndeterminate && 'hover:border-ring/60 dark:bg-input/30',
              )}
              onClick={() => toggle(stat)}
              role="checkbox"
              aria-checked={corruptedChecked ? 'true' : corruptedIndeterminate ? 'mixed' : 'false'}
              aria-label="Corrupted filter"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggle(stat);
                }
              }}
            >
              {corruptedChecked && <Check className="size-3.5 motion-safe:animate-in motion-safe:zoom-in-50" />}
              {corruptedIndeterminate && <X className="size-3.5 motion-safe:animate-in motion-safe:zoom-in-50" />}
            </div>
          ) : (
            <Checkbox checked={isSelected}
              onCheckedChange={() => toggle(stat)}
              disabled={isUnknown} />
          )}

          <div className="flex min-w-0 flex-row items-center">
            {isUnknown && (
              <div className="flex min-w-0 flex-row items-center gap-2">
                <span className="min-w-0 flex-1 text-sm text-muted-foreground">
                  {stat.name}
                  {valueParts(true)}
                </span>
                <Badge variant="destructive"
                  className="h-4.5 px-1.5 text-[10px] uppercase tracking-wide">
                  Unknown
                </Badge>
              </div>
            )}

            {!isUnknown && (
              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                <span
                  className={cn(
                    'text-sm leading-snug transition-colors duration-(--dur-fast)',
                    isCorrupted && !isInjectedCorrupted && 'text-q-corrupted',
                    isInjectedCorrupted && 'text-muted-foreground',
                    !isCorrupted && 'text-foreground',
                    isCorrupted && 'cursor-pointer',
                  )}
                  onClick={isCorrupted ? () => toggle(stat) : undefined}
                >
                  {stat.name}
                  {valueParts(!isCorrupted)}
                </span>
                <AnimatePresence initial={false}>
                  {corruptedHint && (
                    <motion.span
                      key={corruptedHint}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: DUR.fast, ease: EASE_OUT }}
                      className={cn(
                        'rounded-full border px-1.5 py-px text-[10px] font-medium uppercase leading-none tracking-wide',
                        corruptedState === 1
                          ? 'border-q-corrupted/40 text-q-corrupted'
                          : 'border-border text-muted-foreground line-through decoration-q-corrupted/70',
                      )}
                    >
                      {corruptedHint}
                    </motion.span>
                  )}
                </AnimatePresence>
                {isInjectedCorrupted && (
                  <HoverPopover
                    content={
                      <div className="max-w-xs rounded-lg border border-border bg-popover p-2.5 text-xs leading-relaxed text-popover-foreground shadow-panel">
                        This item can be corrupted. Use this filter to search for corrupted or non-corrupted versions.
                      </div>
                    }
                  >
                    <Info className="size-3.5 cursor-help text-muted-foreground transition-colors hover:text-foreground" />
                  </HoverPopover>
                )}
                {stat.corrupted && (
                  <span className="text-q-corrupted"
                    title="Corrupted stat">
                    *
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <AnimatePresence initial={false}>
          {showRangeInputs && (
            <motion.div
              key="range"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: DUR.med, ease: EASE_OUT }}
              className="flex shrink-0 items-center gap-1.5 pl-4"
            >
              <input
                type="number"
                className={numberInputClass}
                placeholder="min"
                aria-label={`${stat.name} minimum`}
                value={filters[statKey]?.min ?? ''}
                onChange={(e) => updateFilter(statKey, 'min', e.target.value)}
                onKeyDown={handleInputKeyDown}
              />
              <span className="text-xs text-muted-foreground">–</span>
              <input
                type="number"
                className={numberInputClass}
                placeholder="max"
                aria-label={`${stat.name} maximum`}
                value={filters[statKey]?.max ?? ''}
                onChange={(e) => updateFilter(statKey, 'max', e.target.value)}
                onKeyDown={handleInputKeyDown}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </label>
    </div>
  );
};
