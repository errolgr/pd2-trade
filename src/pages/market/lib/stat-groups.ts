import type { StatFilter } from './types';

/** Any-of blocks a search can have (the market service rejects more). */
export const MAX_OR_BLOCKS = 5;

/** Where a stat row sits: required (`and`), an any-of block (1…MAX_OR_BLOCKS) or the exclusion group (`not`). */
export type StatGroup = 'and' | 'not' | number;

export const groupOf = (s: StatFilter): StatGroup => (s.not ? 'not' : (s.or ?? 'and'));

/** The row moved to `group` (the other group field cleared). */
export function withGroup(s: StatFilter, group: StatGroup): StatFilter {
  const { or: _or, not: _not, ...row } = s;
  if (group === 'not') return { ...row, not: true };
  if (group === 'and') return row;
  return { ...row, or: group };
}

/** True for a row stored before any-of blocks existed (`or: true` / `or: false`). */
export const hasLegacyOr = (s: Pick<StatFilter, 'or'>): boolean => s.or !== undefined && typeof s.or !== 'number';

/** A row stored before any-of blocks existed: its `or: true` is block 1, `or: false` none. */
export function upgradeRowGroup<T extends Pick<StatFilter, 'or'>>(row: T): T {
  if (!hasLegacyOr(row)) return row;
  const { or, ...rest } = row;
  return (or ? { ...rest, or: 1 } : rest) as T;
}

/** Any-of block numbers in use, ascending. */
export const orBlockNumbers = (stats: readonly StatFilter[]): number[] =>
  [...new Set(stats.flatMap((s) => (s.not || s.or === undefined ? [] : [s.or])))].sort((a, b) => a - b);

/** Renumbers the any-of blocks 1…n in their order, so an emptied block leaves no gap. */
export function compactBlocks(stats: StatFilter[]): StatFilter[] {
  const numbers = orBlockNumbers(stats);
  if (numbers.every((n, i) => n === i + 1)) return stats;
  return stats.map((s) => (s.not || s.or === undefined ? s : { ...s, or: numbers.indexOf(s.or) + 1 }));
}

/**
 * Moves row `id` to `group`; `new` opens another any-of block (unless MAX_OR_BLOCKS are in use, then nothing
 * changes). Blocks are renumbered afterwards.
 */
export function moveToGroup(stats: StatFilter[], id: string, group: StatGroup | 'new'): StatFilter[] {
  const row = stats.find((s) => s.id === id);
  if (!row) return stats;
  let target: StatGroup;
  if (group === 'new') {
    const blocks = orBlockNumbers(stats.filter((s) => s.id !== id));
    if (blocks.length >= MAX_OR_BLOCKS) return stats;
    target = (blocks[blocks.length - 1] ?? 0) + 1;
  } else target = group;
  if (groupOf(row) === target) return stats;
  return compactBlocks(stats.map((s) => (s.id === id ? withGroup(s, target) : s)));
}
