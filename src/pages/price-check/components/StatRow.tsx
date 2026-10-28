import React, { useEffect, useState } from 'react';
import { AnimatePresence, animate, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import type { Item, Stat, StatFilterInput } from '@/pages/price-check/lib/interfaces';
import { DAMAGE_PAIRS, damagePairText, statIdToProperty, StatId } from '@/pages/price-check/lib/stat-mappings';
import { statText } from '@/pages/price-check/lib/tooltip-lines';
import { HoverPopover } from '@/components/custom/hover-popover';
import { Badge } from '@/components/ui/badge';
import { fuzzyMatchCharacterSkill } from '@/assets/character-skills';
import { fuzzyClassSkillByName, fuzzyClassSubSkillByName } from '@/assets/class-skills';
import { X, Check, Info, Eraser } from 'lucide-react';
import { DUR, EASE_OUT, listItem, listStagger } from '@/lib/motion';
import type { PseudoOption } from '@/pages/price-check/lib/pseudo-fold';
import { PseudoChip } from './PseudoChip';
import type { AppraisedStat } from '@/lib/rare-appraisal-api';
import { starsText, starTitle } from '@/components/rares/rares-format';
import { formatStatRange } from '@/pages/price-check/lib/stat-ranges';
import { getStatKey } from '@/pages/price-check/lib/utils';
import { useTranslation } from '@/i18n';

/**
 * The row as the item's tooltip draws it ("+20% Faster Cast Rate", "Adds 4-14 fire damage", "Socketed (4)"),
 * or null for rows the item has no line for (Σ totals, Ethereal, Corrupted): those keep "name: value".
 */
function itemLine(stat: Stat, item?: Item): string | null {
  if (stat.pseudo || stat.stat_id === StatId.Ethereal || stat.stat_id === StatId.Corrupted) return null;
  const value = stat.value;
  const pair = DAMAGE_PAIRS.find((p) => p.id === stat.stat_id);
  if (pair) {
    if (value === undefined || stat.maxValue === undefined) return null;
    return damagePairText(pair, { lo: value, hi: stat.maxValue, seconds: stat.seconds });
  }
  if (stat.stat_id === StatId.Socket) return value === undefined ? null : `Socketed (${value})`;
  if (stat.stat_id === StatId.AllResistances) {
    return value === undefined ? null : `All Resistances ${value < 0 ? value : `+${value}`}`;
  }
  if (stat.stat_id === StatId.AllAttributes) {
    return value === undefined ? null : `${value < 0 ? value : `+${value}`} to all Attributes`;
  }
  // Skill rows are renamed to their skill; the item's own stat keeps the line's wording (charges, chance to cast).
  const source = stat.skill
    ? item?.stats?.find((s) => s.stat_id === stat.stat_id && s.skill === stat.skill)
    : undefined;
  return statText(source ?? stat, item);
}

/** The min / max inputs of a row (damage pairs use all four). */
export const RANGE_FIELDS = ['min', 'max', 'maxMin', 'maxMax'] as const;

interface StatRowProps {
  stat: Stat;
  nested?: boolean;
  updateFilter: (key: string, field: keyof StatFilterInput, val: string) => void;
  filters: Record<string, StatFilterInput>;
  selected: Set<string>;
  toggle: (stat: Stat) => void;
  corruptedState?: number; // 0 = both, 1 = corrupted only, 2 = non-corrupted only
  /** Called when Enter is pressed inside the min/max inputs. */
  onSubmit?: () => void;
  /** Rare appraisal of this row (key stat stars or a "valuable from N" hint), when the item was appraised. */
  rare?: AppraisedStat;
  /** Σ totals this row feeds (or, on a Σ row, can switch to): its Σ chip's menu. */
  pseudoOptions?: PseudoOption[];
  /** Folds the Σ total in, or unfolds it when active (useStatSelection.togglePseudo). */
  onPseudo?: (id: string) => void;
  /** The item the row belongs to: skill lines read its class (o-skills draw no "(Class Only)"). */
  item?: Item;
  /** Bumped by the Stats header's "Clear ranges": every range line plays its clear wipe. */
  wipe?: number;
}

/** Counts from `from` to `value` once on mount: a Σ row's total adding up its folded lines. */
function CountUp({ from, value }: { from: number; value: number }) {
  const [shown, setShown] = useState(from);
  useEffect(() => {
    const controls = animate(from, value, {
      duration: DUR.slow * 2,
      ease: EASE_OUT,
      onUpdate: (v) => setShown(Math.round(v)),
    });
    return () => controls.stop();
  }, [from, value]);
  return <>{shown}</>;
}

/** Rows fold in and out of Σ totals: they open and close in height. */
const rowPresence = {
  initial: { height: 0, opacity: 0 },
  animate: { height: 'auto', opacity: 1, transition: { duration: DUR.slow, ease: EASE_OUT } },
  exit: { height: 0, opacity: 0, transition: { duration: DUR.med, ease: EASE_OUT } },
} as const;

// Rows are min-h-9 (py-1 + this 28px input) so selecting a stat doesn't change the row height.
const numberInputClass =
  'h-7 w-16 rounded-md border border-input bg-background/60 px-2 text-xs tabular-nums text-foreground shadow-xs outline-none transition-[border-color,box-shadow] duration-(--dur-fast) placeholder:text-muted-foreground hover:border-ring/40 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 dark:bg-input/30';

export const StatRow: React.FC<StatRowProps> = ({
  stat,
  nested,
  updateFilter,
  filters,
  selected,
  toggle,
  corruptedState = 0,
  onSubmit,
  rare,
  pseudoOptions,
  onPseudo,
  item,
  wipe,
}) => {
  const { t } = useTranslation('priceCheck');
  const statKey = getStatKey(stat);
  const isSocket = stat.stat_id === StatId.Socket;
  const isCorrupted = stat.stat_id === StatId.Corrupted;
  const isEthereal = stat.stat_id === StatId.Ethereal;
  const isSkill = 'skill' in stat;
  const isUnknownSkill =
    isSkill &&
    !fuzzyMatchCharacterSkill(stat.skill.toLowerCase()) &&
    !fuzzyClassSkillByName(stat.skill.toLowerCase()) &&
    !fuzzyClassSubSkillByName(stat.skill.toLowerCase());
  const isDamagePair = stat.maxValue !== undefined;
  const isUnknown =
    (statIdToProperty[stat.stat_id] === undefined && !isSkill && !isDamagePair && !stat.pseudo) || isUnknownSkill;

  // For corrupted stat, determine checkbox state
  const corruptedChecked = isCorrupted && corruptedState === 1;
  const corruptedIndeterminate = isCorrupted && corruptedState === 2;

  // Check if corrupted stat is injected (not actually on the item)
  const isInjectedCorrupted = isCorrupted && '_injected' in stat && stat._injected === true;

  const isSelected = selected.has(statKey);
  const isActive = isCorrupted ? corruptedState !== 0 : isSelected;
  const showRangeInputs = !isCorrupted && !isEthereal && isSelected;
  const corruptedHint = !isCorrupted
    ? undefined
    : corruptedState === 1
      ? t('statRow.corruptedOnly')
      : corruptedState === 2
        ? t('statRow.corruptedExcluded')
        : undefined;
  /** Clears per range line (`min` / `maxMin`): each one replays the clear sweep. */
  const [clearNonce, setClearNonce] = useState<Partial<Record<string, number>>>({});

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onSubmit) {
      e.preventDefault();
      onSubmit();
    }
  };

  // The bracket PD2 draws after the line: "[25 - 50]"; damage pairs "[a - b to c - d]" (min damage, then max).
  const rangeText = (() => {
    const own = stat.range?.min !== undefined && stat.range.max !== undefined ? stat.range : null;
    const to = stat.maxRange?.min !== undefined && stat.maxRange.max !== undefined ? stat.maxRange : null;
    if (own && to) return formatStatRange({ min: own.min!, max: own.max!, to: { min: to.min!, max: to.max! } });
    const only = own ?? to;
    return only ? formatStatRange({ ...only, min: only.min!, max: only.max! }) : null;
  })();

  // The row as it reads on the item; rows the item draws no line for show "name: value".
  const line = isUnknown ? null : itemLine(stat, item);

  const rangeBracket = !isSocket && rangeText && stat.value !== undefined && (
    <span className="ml-1 text-xs tabular-nums text-muted-foreground"
      title={t('statRow.rangeTitle')}>
      {rangeText}
    </span>
  );

  const valueParts = (showCorruptedValue: boolean) => (
    <>
      {showCorruptedValue && stat.value !== undefined && (
        <>
          <span className="text-muted-foreground">: </span>
          <span className="font-semibold tabular-nums">
            {stat.folded?.length ? (
              <CountUp from={stat.folded[0].value ?? 0}
                value={stat.value} />
            ) : isDamagePair && stat.maxValue !== stat.value ? (
              `${stat.value}-${stat.maxValue}`
            ) : (
              stat.value
            )}
          </span>
          {stat.seconds !== undefined && <span className="text-muted-foreground"> over {stat.seconds}s</span>}
        </>
      )}
      {showCorruptedValue && rangeBracket}
    </>
  );

  return (
    // Table rows with rounded highlights. Runs of selected rows join into one seamless block (inner corners
    // square, no line between them); lines touching a highlight are hidden so none sticks out.
    <motion.div
      {...rowPresence}
      data-active={isActive || undefined}
      className={cn(
        'overflow-hidden not-first:border-t not-first:border-border/70',
        'data-active:border-t-transparent [[data-active]+&]:border-t-transparent',
        '[[data-active]+&[data-active]]:border-t-0',
        '[[data-active]+&[data-active]]:*:rounded-t-none [&[data-active]:has(+[data-active])]:*:rounded-b-none',
      )}
    >
      <label
        key={statKey}
        className={cn(
          'group/row relative flex min-h-10 flex-row items-center justify-between gap-2 overflow-hidden rounded-md px-2.5 py-1',
          'transition-[background-color,box-shadow] duration-(--dur-fast) ease-out',
          isActive
            ? 'bg-linear-to-r from-glow/16 via-glow/7 to-glow/2 shadow-[inset_3px_0_0_var(--glow)]'
            : !isUnknown && 'hover:bg-foreground/4',
          !isActive && rare?.stars && 'bg-glow/6 hover:bg-glow/10',
          nested && 'pl-8',
          isUnknown && 'cursor-not-allowed',
          stat.folded && 'rounded-b-none',
        )}
      >
        {/* A Σ row arrives with a light sweep across it */}
        {stat.pseudo && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 w-1/2 bg-linear-to-r from-transparent via-info/25 to-transparent"
            initial={{ left: '-50%' }}
            animate={{ left: '110%' }}
            transition={{ duration: 0.8, ease: EASE_OUT, delay: 0.1 }}
          />
        )}
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
              aria-label={t('statRow.corruptedFilter')}
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
                  {t('statRow.unknown')}
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
                  {line ?? stat.name}
                  {line ? rangeBracket : valueParts(!isCorrupted)}
                  {/* Rare appraisal: inline after the text so it follows wrapped lines */}
                  {rare?.stars && (
                    <span
                      className="ml-1.5 cursor-help whitespace-nowrap text-xs tracking-tighter text-glow"
                      title={starTitle(rare)}
                    >
                      {starsText(rare.stars)}
                    </span>
                  )}
                  {rare && rare.stars === null && rare.keyFrom !== null && (
                    <span
                      className="ml-1.5 whitespace-nowrap text-[11px] text-muted-foreground/70"
                      title={t('statRow.keyFromTitle', { value: rare.keyFrom })}
                    >
                      {t('statRow.valuableFrom', { value: rare.keyFrom })}
                    </span>
                  )}
                </span>
                <AnimatePresence initial={false}>
                  {corruptedHint && (
                    <motion.span
                      key={corruptedState}
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
                        {t('statRow.injectedCorruptedHint')}
                      </div>
                    }
                  >
                    <Info className="size-3.5 cursor-help text-muted-foreground transition-colors hover:text-foreground" />
                  </HoverPopover>
                )}
                {stat.corrupted && (
                  <span className="text-q-corrupted"
                    title={t('statRow.corruptedStat')}>
                    *
                  </span>
                )}
                {pseudoOptions && pseudoOptions.length > 0 && onPseudo && (
                  <PseudoChip options={pseudoOptions}
                    active={stat.pseudo}
                    onPick={onPseudo} />
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
              className={cn('flex shrink-0 gap-1.5 pl-4', isDamagePair ? 'flex-col items-end py-1' : 'items-center')}
            >
              {(isDamagePair
                ? ([
                    ['min', 'max', t('statRow.minDamage'), t('statRow.minDamageAria', { name: stat.name })],
                    ['maxMin', 'maxMax', t('statRow.maxDamage'), t('statRow.maxDamageAria', { name: stat.name })],
                  ] as const)
                : ([['min', 'max', null, stat.name]] as const)
              ).map(([lo, hi, label, aria]) => {
                const hasRange = !!filters[statKey]?.[lo] || !!filters[statKey]?.[hi];
                // The line's own clears and "Clear ranges" both replay the wipe
                const clears = clearNonce[lo] !== undefined || wipe ? `${wipe ?? 0}:${clearNonce[lo] ?? 0}` : undefined;
                return (
                  <div key={lo}
                    className="flex items-center gap-1.5">
                    {label && (
                      <span className="whitespace-nowrap text-right text-[10px] uppercase tracking-wide text-muted-foreground">
                        {label}
                      </span>
                    )}
                    <span data-range-line
                      className="relative flex items-center gap-1.5 overflow-hidden rounded-md">
                      <input
                        type="number"
                        className={numberInputClass}
                        placeholder={t('statRow.minPlaceholder')}
                        aria-label={t('statRow.minimumAria', { label: aria })}
                        value={filters[statKey]?.[lo] ?? ''}
                        onChange={(e) => updateFilter(statKey, lo, e.target.value)}
                        onKeyDown={handleInputKeyDown}
                      />
                      {/* The "–" turns into the eraser while the row is hovered (or the eraser has keyboard focus): no
                          extra width. Hover only: focus in a min/max input would keep it showing after the pointer left. */}
                      <span className="relative inline-flex h-7 w-3.5 shrink-0 items-center justify-center">
                        <span
                          aria-hidden
                          className={cn(
                            'text-xs text-muted-foreground transition-opacity duration-(--dur-fast) [span:has(>button:focus-visible)>&]:opacity-0',
                            hasRange && 'group-hover/row:opacity-0',
                          )}
                        >
                          –
                        </span>
                        <button
                          type="button"
                          aria-label={t('statRow.clearRangeAria', { label: aria })}
                          title={t('statRow.clearRangeTitle')}
                          tabIndex={hasRange ? 0 : -1}
                          aria-hidden={!hasRange}
                          onClick={(e) => {
                            e.preventDefault();
                            updateFilter(statKey, lo, '');
                            updateFilter(statKey, hi, '');
                            setClearNonce((n) => ({ ...n, [lo]: (n[lo] ?? 0) + 1 }));
                            // Ready to type the new min
                            e.currentTarget
                              .closest('[data-range-line]')
                              ?.querySelector('input')
                              ?.focus({ preventScroll: true });
                          }}
                          className={cn(
                            'absolute inset-0 inline-flex items-center justify-center rounded text-muted-foreground opacity-0 outline-none transition-[opacity,color] duration-(--dur-fast) hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/60',
                            hasRange ? 'group-hover/row:opacity-70 hover:opacity-100!' : 'pointer-events-none',
                          )}
                        >
                          <Eraser className="size-3" />
                        </button>
                      </span>
                      <input
                        type="number"
                        className={numberInputClass}
                        placeholder={t('statRow.maxPlaceholder')}
                        aria-label={t('statRow.maximumAria', { label: aria })}
                        value={filters[statKey]?.[hi] ?? ''}
                        onChange={(e) => updateFilter(statKey, hi, e.target.value)}
                        onKeyDown={handleInputKeyDown}
                      />
                      {/* A cleared range is wiped by a light sweep across both inputs, their edges flashing once. Own
                          AnimatePresence: the range's `initial={false}` presence would otherwise skip these entries. */}
                      <AnimatePresence>
                        {clears !== undefined && (
                          <React.Fragment key={clears}>
                            <motion.span
                              aria-hidden
                              className="pointer-events-none absolute inset-y-0 w-2/3 bg-linear-to-r from-transparent via-glow/55 to-transparent"
                              initial={{ left: '-70%', opacity: 1 }}
                              animate={{ left: '110%', opacity: [1, 1, 0] }}
                              transition={{
                                duration: 0.5,
                                ease: EASE_OUT,
                                opacity: { duration: 0.5, times: [0, 0.75, 1] },
                              }}
                            />
                            <motion.span
                              aria-hidden
                              className="pointer-events-none absolute inset-0 rounded-md ring-1 ring-inset ring-glow/70"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: [0, 1, 0] }}
                              transition={{ duration: 0.6, times: [0, 0.2, 1], ease: 'easeOut' }}
                            />
                          </React.Fragment>
                        )}
                      </AnimatePresence>
                    </span>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </label>
      {/* Σ row: the lines it folded in, and a way back */}
      {stat.folded && stat.pseudo && (
        <motion.div
          variants={listStagger}
          initial="hidden"
          animate="visible"
          className={cn(
            'flex flex-wrap items-center gap-1 rounded-b-md pb-1.5 pl-9 pr-2.5',
            'transition-[background-color,box-shadow] duration-(--dur-fast) ease-out',
            isActive && 'bg-linear-to-r from-glow/16 via-glow/7 to-glow/2 shadow-[inset_3px_0_0_var(--glow)]',
          )}
        >
          {stat.folded.map((row) => (
            <motion.span
              key={getStatKey(row)}
              variants={listItem}
              className="inline-flex h-5 items-center rounded-sm bg-muted/60 px-1.5 text-[11px] tabular-nums text-muted-foreground"
            >
              {itemLine(row, item) ?? `${row.name} ${row.value}`}
            </motion.span>
          ))}
          <motion.button
            type="button"
            variants={listItem}
            onClick={() => onPseudo?.(stat.pseudo!)}
            className="ml-1 inline-flex h-5 items-center gap-0.5 rounded-sm px-1 text-[11px] text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <X className="size-3" />
            {t('statRow.unfold')}
          </motion.button>
        </motion.div>
      )}
    </motion.div>
  );
};
