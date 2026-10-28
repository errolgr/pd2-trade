import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRightLeft, ChevronDown, ChevronRight, ChevronUp, ExternalLink, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { openUrl } from '@/lib/browser-opener';
import { DUR, EASE_OUT, fadeInUp, listItem, listStagger } from '@/lib/motion';
import { ItemValue, RuneCombination } from '../lib/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface RunePricePopoverProps {
  loading: boolean;
  calculatedRuneValues: ItemValue[];
  selectedRuneBreakdown: string | null;
  selectedRuneCombinations: RuneCombination[];
  onRuneBreakdownSelect: (runeName: string | null) => void;
}

const RUNE_PRICES_URL = 'https://pd2trader.com/?category=runes';

const LOW_RUNES: Record<string, true> = {
  'Gul Rune': true,
  'Ist Rune': true,
  'Mal Rune': true,
  'Um Rune': true,
  'Pul Rune': true,
  'Lem Rune': true,
};

export function RunePricePopover({
  loading,
  calculatedRuneValues,
  selectedRuneBreakdown,
  selectedRuneCombinations,
  onRuneBreakdownSelect,
}: RunePricePopoverProps) {
  const [showMore, setShowMore] = useState(false);

  // Separate high and low runes
  const highRunes = calculatedRuneValues.filter((rune) => !LOW_RUNES[rune.name]);
  const lowRunes = calculatedRuneValues.filter((rune) => LOW_RUNES[rune.name]);

  // Determine which runes to display
  const displayedRunes = showMore ? calculatedRuneValues : highRunes;
  const targetValue = calculatedRuneValues.find((r) => r.name === selectedRuneBreakdown)?.price || 0;

  return (
    <Popover>
      <TooltipProvider>
        <Tooltip delayDuration={400}>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Rune prices"
                className="size-7 text-muted-foreground hover:text-foreground data-[state=open]:bg-accent data-[state=open]:text-foreground"
              >
                <ArrowRightLeft className="size-4" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">Rune prices</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <PopoverContent
        align="start"
        collisionPadding={8}
        className="w-[min(480px,calc(100vw-16px))] max-h-[min(1000px,calc(100vh-56px))] overflow-y-auto p-0"
      >
        <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-popover/95 px-4 py-3 backdrop-blur-sm">
          <h4 className="text-sm font-semibold tracking-tight">Current Rune Prices</h4>
          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Info className="size-4 cursor-help text-muted-foreground transition-colors hover:text-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  Rune prices are calculated from market listings using the median price over the last 7 days. Prices
                  are updated daily.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <a
            href={RUNE_PRICES_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.preventDefault();
              void openUrl(RUNE_PRICES_URL);
            }}
            className="ml-auto inline-flex items-center gap-1 rounded-sm text-xs font-medium text-info underline-offset-4 outline-none transition-colors hover:underline focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            View on pd2trader.com
            <ExternalLink className="size-3" />
          </a>
        </div>

        <div className="px-2 py-2">
          {loading ? (
            <div className="space-y-1 px-2 py-1"
              aria-busy="true">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i}
                  className="flex items-center justify-between py-1">
                  <Skeleton className="h-4 w-24 bg-muted-foreground/15" />
                  <Skeleton className="h-4 w-32 bg-muted-foreground/15" />
                </div>
              ))}
              <p className="pt-1 text-center text-xs text-muted-foreground">Loading rune data...</p>
            </div>
          ) : (
            <motion.div variants={listStagger}
              initial="hidden"
              animate="visible">
              {displayedRunes.map((rune) => {
                const isSelected = selectedRuneBreakdown === rune.name;
                return (
                  <motion.button
                    key={rune.name}
                    variants={listItem}
                    type="button"
                    onClick={() => onRuneBreakdownSelect(isSelected ? null : rune.name)}
                    aria-pressed={isSelected}
                    className={cn(
                      'group flex w-full items-center justify-between gap-3 rounded-md px-2 py-1 text-left text-sm outline-none transition-colors duration-(--dur-fast) hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring/60',
                      isSelected && 'bg-accent text-accent-foreground',
                    )}
                  >
                    <span className="flex items-center gap-1.5 font-medium">
                      <ChevronRight
                        className={cn(
                          'size-3.5 text-muted-foreground transition-transform duration-(--dur-med) ease-out',
                          isSelected ? 'rotate-90 text-foreground' : 'opacity-0 group-hover:opacity-100',
                        )}
                      />
                      <span className={cn('transition-colors', isSelected ? 'text-q-rune' : 'group-hover:text-q-rune')}>
                        {rune.name}
                      </span>
                    </span>
                    <span className="flex items-baseline gap-2">
                      <span
                        className={cn(
                          'font-semibold tabular-nums',
                          rune.isFixed ? 'text-muted-foreground' : 'text-success',
                        )}
                      >
                        {rune.price} HR
                        {rune.isFixed && <span className="ml-1 text-xs">*</span>}
                      </span>
                      <span className="w-[86px] text-right text-xs tabular-nums text-muted-foreground">
                        ({rune.isFixed ? 'fixed' : `${rune.numListings} listings`})
                      </span>
                    </span>
                  </motion.button>
                );
              })}
            </motion.div>
          )}

          {!loading && (
            <>
              {/* Show More/Less Button */}
              {lowRunes.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowMore(!showMore)}
                  className="mt-1 flex w-full items-center justify-center gap-1 rounded-md py-1.5 text-xs text-muted-foreground outline-none transition-colors hover:bg-accent/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
                >
                  {showMore ? (
                    <>
                      <ChevronUp className="size-3" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="size-3" />
                      Show More ({lowRunes.length} lower runes)
                    </>
                  )}
                </button>
              )}

              {/* Breakdown combinations */}
              <AnimatePresence mode="wait"
                initial={false}>
                {selectedRuneBreakdown && selectedRuneCombinations.length > 0 && (
                  <motion.div
                    key={selectedRuneBreakdown}
                    variants={fadeInUp}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="mx-2 mt-2 border-t border-border pt-3"
                  >
                    <h5 className="mb-2 flex items-baseline gap-2 text-sm font-semibold">
                      <span>
                        <span className="text-q-rune">{selectedRuneBreakdown}</span> Breakdown:
                      </span>
                      <span className="text-xs font-normal tabular-nums text-muted-foreground">
                        target {targetValue} HR
                      </span>
                    </h5>
                    <div className="space-y-1.5">
                      {selectedRuneCombinations.map((combo, index) => {
                        const tone =
                          combo.difference > targetValue * 0.4
                            ? 'far'
                            : combo.difference > targetValue * 0.2
                              ? 'near'
                              : 'exact';
                        return (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: DUR.med, ease: EASE_OUT, delay: index * 0.03 }}
                            className="rounded-md border border-border/60 bg-muted/50 px-2.5 py-2 text-xs"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-foreground/90">
                                {combo.runes.map((r) => `${r.count}x ${r.name.replace(' Rune', '')}`).join(' + ')}
                              </span>
                              <span
                                className={cn(
                                  'shrink-0 font-semibold tabular-nums',
                                  tone === 'exact' && 'text-success',
                                  tone === 'near' && 'text-warning',
                                  tone === 'far' && 'text-muted-foreground',
                                )}
                              >
                                = {combo.totalValue} HR
                              </span>
                            </div>
                            {combo.difference > 0.1 && (
                              <div
                                className={cn(
                                  'mt-1 tabular-nums',
                                  tone === 'near' ? 'text-warning/80' : 'text-muted-foreground',
                                )}
                              >
                                Diff: {combo.difference} HR
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mx-2 mt-3 border-t border-border pt-2 pb-1 text-xs leading-relaxed text-muted-foreground">
                * Fixed pricing used with Vex and below, as it generally does not change or when &lt;10 listings
                available
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
