import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { readStatValue } from './stats';
import type { StatFilter } from './types';

/**
 * Stat-weighted score: `score = Σ weight × value` over enabled rows with a non-zero weight, where value is the
 * stat's raw roll (pseudo value for pseudo rows; 0 when the item lacks the stat). Weights are therefore "points
 * per point of stat": weight 1 on FCR and weight 2 on life make 20 FCR worth the same as 10 life.
 *
 * `value` is score per HR (`score / hr_price`); null without a weighted row or an HR price.
 */
export function scoreListing(
  listing: MarketListingEntry,
  stats: StatFilter[],
  pseudo: Record<string, number>,
): { score: number | null; value: number | null } {
  let score: number | null = null;
  for (const stat of stats) {
    if (!stat.enabled || !stat.weight) continue;
    const roll =
      stat.kind === 'pseudo' ? (pseudo[stat.key] ?? 0) : (readStatValue(listing.item?.modifiers, stat.key) ?? 0);
    score = (score ?? 0) + stat.weight * roll;
  }
  const hr = listing.hr_price;
  const value = score !== null && typeof hr === 'number' && hr > 0 ? score / hr : null;
  return { score, value };
}
