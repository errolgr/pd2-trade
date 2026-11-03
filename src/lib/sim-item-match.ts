/**
 * Finds the price-checked item in the PD2 stash, for sending it to Horadric Sim: the clipboard item has no hash,
 * the sim export needs the stash item as PD2 serialises it.
 */
import type { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import { ItemQuality } from '@/common/types/Item';
import type { Item as PriceCheckItem } from '@/pages/price-check/lib/interfaces';
import { StatId, statIdToProperty } from '@/pages/price-check/lib/stat-mappings';
import { cleanItemType } from '@/pages/price-check/lib/utils';

const norm = (text: string | undefined): string => (text ?? '').trim().toLowerCase();

const hasStat = (item: PriceCheckItem, id: number): boolean => item.stats.some((s) => s.stat_id === id);

/**
 * The same kind of item: name (uniques, sets, runewords), quality, base, ethereal and socket count must agree.
 * Other qualities' names are rolled affixes, so they only count towards the score.
 */
function sameKind(item: PriceCheckItem, stash: GameStashItem): boolean {
  if (item.isRuneword) {
    if (!stash.is_runeword || norm(stash.name) !== norm(item.runeword)) return false;
  } else {
    if (stash.is_runeword || norm(stash.quality?.name) !== norm(item.quality)) return false;
    const named = item.quality === ItemQuality.Unique || item.quality === ItemQuality.Set;
    if (named && norm(stash.name) !== norm(item.name)) return false;
  }
  const base = norm(cleanItemType(item.type ?? ''));
  if (base && norm(stash.base?.name) !== base) return false;
  const ethereal = item.isEthereal === true || hasStat(item, StatId.Ethereal);
  if (ethereal !== !!stash.is_ethereal) return false;
  // No socket count on the price-checked item: an unsocketed item.
  return (item.sockets ?? 0) === (stash.socket_count ?? 0);
}

/** +1 per stat value the stash item's modifier of that property carries, −1 per one it doesn't; name, corruption. */
function score(item: PriceCheckItem, stash: GameStashItem): number {
  const modifiers = new Map<string, number[]>();
  for (const mod of stash.modifiers ?? []) modifiers.set(mod.name, [...(modifiers.get(mod.name) ?? []), ...mod.values]);
  let total = 0;
  for (const stat of item.stats) {
    if (stat.value === undefined || stat.skill) continue;
    const values = modifiers.get(statIdToProperty[stat.stat_id]);
    if (values) total += values.includes(stat.value) ? 1 : -1;
  }
  total += hasStat(item, StatId.Corrupted) === !!stash.corrupted ? 1 : -1;
  if (!item.isRuneword && norm(stash.name) === norm(item.name)) total += 1;
  return total;
}

/** What tells two stash items apart for the sim; equal fingerprints are interchangeable copies. */
const fingerprint = (stash: GameStashItem): string =>
  JSON.stringify([
    stash.name,
    stash.base?.name,
    stash.quality?.name,
    stash.is_ethereal,
    stash.socket_count,
    stash.corrupted,
    (stash.modifiers ?? []).map((m) => `${m.name}:${m.values.join(',')}`).sort(),
  ]);

/**
 * The stash item that is `item`: the best-scoring one of the same kind. `null` when none is, or when the best
 * score is shared by items that differ (two rares on the same base the stats can't tell apart). Identical copies
 * (two perfect Shakos) are interchangeable, so the first is returned.
 */
export function matchStashItem(item: PriceCheckItem, stash: readonly GameStashItem[]): GameStashItem | null {
  const ranked = stash
    .filter((candidate) => sameKind(item, candidate))
    .map((candidate) => ({ candidate, score: score(item, candidate) }))
    .sort((a, b) => b.score - a.score);
  if (ranked.length === 0) return null;
  const best = ranked[0];
  const tied = ranked.filter((r) => r.score === best.score);
  const print = fingerprint(best.candidate);
  return tied.every((r) => fingerprint(r.candidate) === print) ? best.candidate : null;
}
