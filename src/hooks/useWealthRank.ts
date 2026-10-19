import { useCallback } from 'react';
import { useOptions } from '@/hooks/useOptions';
import { useNetWorth } from '@/hooks/useNetWorth';
import { getStanding } from '@/lib/networth-api';
import { useNetWorthQuery } from '@/pages/currency/lib/useNetWorthQuery';

/**
 * "#41 Wealth · Top 7%" for the signed-in user's mode and the current season, from `/api/networth/standing`;
 * null while the server has leaderboards off (404), unranked, or on any error.
 * Must be used under a NetWorth provider. Refreshes when the valuation's price day changes (boards are daily).
 */
export function useWealthRank(): string | null {
  const { settings } = useOptions();
  const { owner, currentSeasonId, latest } = useNetWorth();
  const token = settings.pd2Token ?? null;
  const isLadder = owner?.isLadder;
  const isHardcore = owner?.isHardcore;

  const load = useCallback(
    () => getStanding(token!, { isLadder: isLadder!, isHardcore: isHardcore! }, currentSeasonId ?? undefined),
    [token, isLadder, isHardcore, currentSeasonId],
  );
  const { data } = useNetWorthQuery(
    token && isLadder !== undefined && isHardcore !== undefined ? load : null,
    latest?.valuation.priceDay,
  );

  const wealth = data?.ranks.wealth;
  if (!wealth) return null;
  // Same rounding as the website's leaderboard ("Top 1%" at best).
  const top = data.percentile === null ? null : Math.max(1, Math.round(100 - data.percentile));
  return `#${wealth.rank} Wealth${top === null ? '' : ` · Top ${top}%`}`;
}
