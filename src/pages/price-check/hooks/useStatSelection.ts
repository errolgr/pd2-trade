import { useState, useMemo, useEffect } from 'react';
import type { Range, Stat, StatFilterInput } from '../lib/interfaces';
import { StatId } from '../lib/stat-mappings';
import { getStatKey } from '../lib/utils';
import { buildStatRows, isItemCorruptable } from '../lib/stat-rows';
import { useOptions } from '@/hooks/useOptions';

type MarginFn = (value: number) => number;

const corruptedFilterToState = (filter: string | undefined): number =>
  filter === 'corrupted' ? 1 : filter === 'non-corrupted' ? 2 : 0;

/**
 * value ± margin, kept inside the range PD2 shows. Per-level ranges are per character level, and a value outside
 * the range (stacked or corrupted stats) can't be clamped by it.
 */
function fillAround(v: number, margin: number, range: Range | undefined): [number, number] {
  let min = v - margin;
  let max = v + margin;
  if (range && !range.perLevel && range.min !== undefined && range.max !== undefined && v >= range.min && v <= range.max) {
    min = Math.max(min, range.min);
    max = Math.min(max, range.max);
  }
  return [min, max];
}

export type StatFilterField = keyof StatFilterInput;

export function useStatSelection(item: any) {
  const { settings } = useOptions();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<Record<string, StatFilterInput>>({});

  // The corrupted checkbox is only shown when isItemCorruptable() is true (the same
  // gate that injects the Corrupted stat row); applying a corrupted filter to a
  // non-corruptable item (rune, gem, charm, map orb) would yield zero results.
  const itemIsCorruptable = useMemo(() => isItemCorruptable(item), [item]);

  // Corrupted state: 0 = both, 1 = corrupted only, 2 = non-corrupted only.
  const [corruptedState, setCorruptedState] = useState<number>(() =>
    itemIsCorruptable ? corruptedFilterToState(settings?.statDefaultCorruptedFilter) : 0,
  );

  // Reset to the saved default whenever the item changes. Skipped for non-corruptable
  // items so we don't apply a filter the user has no UI to undo.
  useEffect(() => {
    setCorruptedState(itemIsCorruptable ? corruptedFilterToState(settings?.statDefaultCorruptedFilter) : 0);
  }, [item, itemIsCorruptable, settings?.statDefaultCorruptedFilter]);

  const leaveMinEmpty = settings?.statFillLeaveMinEmpty ?? false;
  const leaveMaxEmpty = settings?.statFillLeaveMaxEmpty ?? false;

  // Get margin function from settings — supports percent or flat units.
  const getMargin = useMemo<MarginFn>(() => {
    const fillStatValue = settings?.fillStatValue ?? 5;
    const unit = settings?.statFillMarginUnit ?? 'percent';
    if (unit === 'flat') {
      return () => fillStatValue;
    }
    return (value: number) => Math.ceil(value * (fillStatValue / 100));
  }, [settings?.fillStatValue, settings?.statFillMarginUnit]);

  const sortedStats = useMemo(() => buildStatRows(item), [item]);

  const updateFilter = (key: string, field: StatFilterField, val: string) =>
    setFilters((f) => ({
      ...f,
      [key]: { ...f[key], [field]: val },
    }));

  /** Toggle selection and initialise filter defaults */
  const toggle = (stat: Stat) => {
    const key = getStatKey(stat);

    // Special handling for corrupted stat - three states
    if (stat.stat_id === StatId.Corrupted) {
      setCorruptedState((prev) => {
        const next = (prev + 1) % 3; // Cycle: 0 -> 1 -> 2 -> 0
        // Update selected set based on state
        setSelected((sel) => {
          const nextSel = new Set([...sel]);
          if (next === 0) {
            // State 0: both - remove from selected
            nextSel.delete(key);
          } else {
            // State 1 or 2: add to selected
            nextSel.add(key);
          }
          return nextSel;
        });
        return next;
      });
      return;
    }

    setSelected((prev) => {
      const next = new Set([...prev]);
      if (next.has(key)) {
        next.delete(key);
        setFilters((f) => {
          const { [key]: _removed, ...rest } = f;
          return rest;
        });
      } else {
        next.add(key);
        setFilters((f) => {
          const v = stat.value ?? 0;
          const [min, max] = fillAround(v, getMargin(v), stat.range);
          const input: StatFilterInput = {
            min: leaveMinEmpty ? '' : String(min),
            max: leaveMaxEmpty ? '' : String(max),
          };
          // Damage pair rows: a second pair around the max damage.
          if (stat.maxValue !== undefined) {
            const [maxMin, maxMax] = fillAround(stat.maxValue, getMargin(stat.maxValue), stat.maxRange);
            input.maxMin = leaveMinEmpty ? '' : String(maxMin);
            input.maxMax = leaveMaxEmpty ? '' : String(maxMax);
          }
          return { ...f, [key]: input };
        });
      }
      return next;
    });
  };

  return {
    selected,
    setSelected,
    filters,
    setFilters,
    sortedStats,
    updateFilter,
    toggle,
    corruptedState,
    setCorruptedState,
  };
}
