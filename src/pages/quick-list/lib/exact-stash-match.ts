/**
 * Which stash items are the very item the user copied/inspected (not just the same base and quality). The
 * clipboard item carries no stash id or position, so identity comes from what both sides do carry: item level,
 * ethereal, sockets and the numbers on every stat line. Pure: no React.
 */
import type { Item as PriceCheckItem } from '@/pages/price-check/lib/interfaces';
import type { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
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

function clipboardNumbers(item: PriceCheckItem): Set<number> {
  return magnitudes(
    (item.stats ?? [])
      .filter((s) => !s._injected && !s.pseudo && !SKIPPED_STAT_IDS.has(s.stat_id))
      .flatMap((s) => [s.value, s.maxValue, s.level, s.chance, s.seconds, ...numbersIn(s.charges)])
      .filter((n): n is number => typeof n === 'number' && Number.isFinite(n)),
  );
}

function sameFrame(item: PriceCheckItem, stash: GameStashItem): boolean {
  if (typeof item.iLevel === 'number' && typeof stash.item_level === 'number' && item.iLevel !== stash.item_level) {
    return false;
  }
  return !!item.isEthereal === !!stash.is_ethereal && (item.sockets ?? 0) === (stash.socket_count ?? 0);
}

function sameNumbers(clip: Set<number>, stash: GameStashItem): boolean {
  const modifiers = (stash.modifiers ?? []).filter((m) => !SKIPPED_MODIFIERS[m.name]);
  const shown = magnitudes(modifiers.flatMap((m) => numbersIn(m.label)));
  // Label-less flags ("Knockback") arrive with a clipboard value only the modifier's raw values hold.
  const raw = magnitudes(modifiers.flatMap((m) => m.values ?? []));
  for (const n of shown) if (!clip.has(n)) return false;
  for (const n of clip) if (!shown.has(n) && !raw.has(n)) return false;
  return true;
}

/**
 * The candidates that are this exact item: same item level, ethereal and sockets, and every number on its
 * stat lines matching the stash item's modifier labels both ways. Several identical copies all match; the
 * stash name (magic/unique names; rares only keep the base name there) then breaks the tie when it can.
 * Empty when no candidate is provably this item, so callers fall back to the whole candidate list.
 */
export function exactStashMatches(item: PriceCheckItem, candidates: GameStashItem[]): GameStashItem[] {
  const clip = clipboardNumbers(item);
  const exact = candidates.filter((stash) => sameFrame(item, stash) && sameNumbers(clip, stash));
  if (exact.length < 2) return exact;
  const name = (item.isRuneword ? item.runeword : item.name)?.trim().toLowerCase();
  const named = name ? exact.filter((stash) => stash.name?.trim().toLowerCase() === name) : [];
  return named.length > 0 ? named : exact;
}
