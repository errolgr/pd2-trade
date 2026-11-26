/**
 * Which stash items are the very item the user copied/inspected (not just the same base and quality), and how a
 * stash item differs from it. The clipboard item carries no stash id or position, so identity comes from what both
 * sides do carry: item level, ethereal, sockets and the numbers on every stat line. Pure: no React.
 */
import type { Item as PriceCheckItem, Stat } from '@/pages/price-check/lib/interfaces';
import type { Item as GameStashItem, Modifier } from '@/common/types/pd2-website/GameStashResponse';
import { StatId } from '@/pages/price-check/lib/stat-mappings';

/** Clipboard rows whose numbers no stash label shows (corruption outcome, cold/poison frame lengths, sockets). */
const SKIPPED_STAT_IDS = new Set<number>([
  StatId.Corrupted,
  361, // corruptor
  56, // coldlength
  59, // poisonlength
  194, // item_numsockets: compared through `sockets`
  StatId.Socket,
  StatId.Ethereal,
  StatId.Pseudo,
]);
/** Stash modifiers whose label numbers are compared elsewhere (sockets) or carry none of the item's rolls. */
const SKIPPED_MODIFIERS: Record<string, true> = {
  corrupted: true,
  item_numsockets: true,
  item_numsockets_textonly: true,
};
const NUM_RE = /\d+(?:\.\d+)?/g;

const numbersIn = (text: string | undefined): number[] => (text?.match(NUM_RE) ?? []).map(Number);

/** Distinct non-zero magnitudes: one roll can arrive as several rows (ED as min+max %, all res as four). */
const magnitudes = (nums: number[]): Set<number> => new Set(nums.map(Math.abs).filter((n) => n !== 0));

const statNumbers = (s: Stat): number[] =>
  [s.value, s.maxValue, s.level, s.chance, s.seconds, ...numbersIn(s.charges)].filter(
    (n): n is number => typeof n === 'number' && Number.isFinite(n),
  );

/** The clipboard side, read once per item: its comparable stat rows and every number on them. */
interface ClipboardNumbers {
  item: PriceCheckItem;
  stats: Stat[];
  all: Set<number>;
}

function readClipboard(item: PriceCheckItem): ClipboardNumbers {
  const stats = (item.stats ?? []).filter((s) => !s._injected && !s.pseudo && !SKIPPED_STAT_IDS.has(s.stat_id));
  return { item, stats, all: magnitudes(stats.flatMap(statNumbers)) };
}

/** Where a stash item differs from the clipboard item; all false and empty when it is that item. */
export interface StashItemDiff {
  itemLevel: boolean;
  ethereal: boolean;
  sockets: boolean;
  /** Clipboard stat ids with a number no stash modifier carries. */
  clipboardOnlyStats: number[];
  /** Stash modifiers whose label shows a number the clipboard lacks. */
  stashOnlyModifiers: string[];
}

function diffAgainst(clip: ClipboardNumbers, stash: GameStashItem): StashItemDiff {
  const { item } = clip;
  const modifiers: Modifier[] = (stash.modifiers ?? []).filter((m) => !SKIPPED_MODIFIERS[m.name]);
  const shown = magnitudes(modifiers.flatMap((m) => numbersIn(m.label)));
  // Label-less flags ("Knockback") arrive with a clipboard value only the modifier's raw values hold.
  const raw = magnitudes(modifiers.flatMap((m) => m.values ?? []));
  const clipboardOnly = clip.stats.filter((s) =>
    [...magnitudes(statNumbers(s))].some((n) => !shown.has(n) && !raw.has(n)),
  );
  const stashOnly = modifiers.filter((m) => [...magnitudes(numbersIn(m.label))].some((n) => !clip.all.has(n)));
  return {
    itemLevel:
      typeof item.iLevel === 'number' && typeof stash.item_level === 'number' && item.iLevel !== stash.item_level,
    ethereal: !!item.isEthereal !== !!stash.is_ethereal,
    sockets: (item.sockets ?? 0) !== (stash.socket_count ?? 0),
    clipboardOnlyStats: [...new Set(clipboardOnly.map((s) => s.stat_id))],
    stashOnlyModifiers: [...new Set(stashOnly.map((m) => m.name))],
  };
}

export function diffStashItem(item: PriceCheckItem, stash: GameStashItem): StashItemDiff {
  return diffAgainst(readClipboard(item), stash);
}

/** `exact`: provably this item; `loose`: this item if the clipboard copy dropped stat lines; `none`: neither. */
export type StashMatchTier = 'exact' | 'loose' | 'none';

/** Several identical copies all match; the stash name (magic/unique names; rares keep the base name there) breaks the tie when it can. */
function byName(item: PriceCheckItem, matches: GameStashItem[]): GameStashItem[] {
  if (matches.length < 2) return matches;
  const name = (item.isRuneword ? item.runeword : item.name)?.trim().toLowerCase();
  const named = name ? matches.filter((stash) => stash.name?.trim().toLowerCase() === name) : [];
  return named.length > 0 ? named : matches;
}

/**
 * The candidates that are this item. `exact`: same item level, ethereal and sockets, and every number on its stat
 * lines matching the stash item's modifier labels both ways. `loose`, only when none is exact: the same, except the
 * stash item may show lines the clipboard lacks (the clipboard copy sometimes drops stat lines); never for a
 * clipboard item without numbers, which would match every item of its frame. `none`: no candidate is this item.
 */
export function matchStashItem(
  item: PriceCheckItem,
  candidates: GameStashItem[],
): { tier: StashMatchTier; items: GameStashItem[] } {
  const clip = readClipboard(item);
  const sameRolls = candidates
    .map((stash) => ({ stash, diff: diffAgainst(clip, stash) }))
    .filter(({ diff }) => !diff.itemLevel && !diff.ethereal && !diff.sockets && diff.clipboardOnlyStats.length === 0);
  const exact = sameRolls.filter(({ diff }) => diff.stashOnlyModifiers.length === 0).map(({ stash }) => stash);
  if (exact.length > 0) return { tier: 'exact', items: byName(item, exact) };
  if (clip.all.size > 0 && sameRolls.length > 0) {
    return {
      tier: 'loose',
      items: byName(
        item,
        sameRolls.map(({ stash }) => stash),
      ),
    };
  }
  return { tier: 'none', items: [] };
}
