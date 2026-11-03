import type { NetWorthSummary } from '@pd2-trader/plugin-sdk';
import type { Valuation } from '@/lib/networth-api';

/** Lines passed to plugins (highest value first); the full valuation is not a plugin contract. */
export const NET_WORTH_TOP_LINES = 20;

/** Plain-JSON view of the latest stash valuation for `networth.*` / `ticker.widget` slots and `sdk.stash.summary`. */
export function toNetWorthSummary(valuation: Valuation): NetWorthSummary;
export function toNetWorthSummary(valuation: Valuation | null | undefined): NetWorthSummary | null;
export function toNetWorthSummary(valuation: Valuation | null | undefined): NetWorthSummary | null {
  if (!valuation) return null;
  return {
    account: valuation.account,
    ladder: valuation.isLadder,
    hardcore: valuation.isHardcore,
    totalHr: valuation.totalHr,
    uncertainHr: valuation.uncertainHr,
    gold: valuation.gold,
    takenAt: valuation.takenAt,
    byCategory: { ...valuation.byCategory },
    topLines: [...valuation.lines]
      .sort((a, b) => b.value - a.value)
      .slice(0, NET_WORTH_TOP_LINES)
      .map((line) => ({ name: line.name, category: line.category, qty: line.qty, valueHr: line.value })),
  };
}
