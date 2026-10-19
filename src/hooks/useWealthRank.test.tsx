// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getStanding } from '@/lib/networth-api';
import type { NetWorthOwner, StandingResponse } from '@/lib/networth-api';
import { useOptions } from '@/hooks/useOptions';
import { useNetWorth } from '@/hooks/useNetWorth';
import { useWealthRank } from './useWealthRank';

const flags = vi.hoisted(() => ({ live: true }));

vi.mock('@/lib/feature-flags', () => ({
  get LEADERBOARD_LIVE() {
    return flags.live;
  },
}));
vi.mock('@/lib/networth-api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getStanding: vi.fn(),
}));
vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));
vi.mock('@/hooks/useNetWorth', () => ({ useNetWorth: vi.fn() }));

let token: string | undefined;
let netWorth: { owner: Partial<NetWorthOwner> | null; currentSeasonId: string | null; priceDay: string };

function standing(rank: number | null, percentile: number | null): StandingResponse {
  return {
    seasonId: 's13',
    ranks: { wealth: rank === null ? null : { rank, rankChange: null, value: 1, total: 100 } },
    percentile,
    activeUsers: 100,
  };
}

async function renderRank() {
  const view = renderHook(() => useWealthRank());
  await act(async () => {});
  return view;
}

beforeEach(() => {
  flags.live = true;
  token = 'tok';
  netWorth = { owner: { isLadder: true, isHardcore: false }, currentSeasonId: 's13', priceDay: '2026-10-18' };
  vi.mocked(useOptions).mockImplementation(() => ({ settings: { pd2Token: token } }) as never);
  vi.mocked(useNetWorth).mockImplementation(
    () =>
      ({
        owner: netWorth.owner,
        currentSeasonId: netWorth.currentSeasonId,
        latest: { valuation: { priceDay: netWorth.priceDay } },
      }) as never,
  );
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('useWealthRank', () => {
  it('formats rank and top percentage, rounding like the website', async () => {
    vi.mocked(getStanding).mockResolvedValue(standing(41, 93.4));
    const { result } = await renderRank();
    expect(result.current).toBe('#41 Wealth · Top 7%');
  });

  it('never shows better than Top 1%', async () => {
    vi.mocked(getStanding).mockResolvedValue(standing(1, 99.9));
    const { result } = await renderRank();
    expect(result.current).toBe('#1 Wealth · Top 1%');
  });

  it('omits the percentage when the percentile is unknown', async () => {
    vi.mocked(getStanding).mockResolvedValue(standing(41, null));
    const { result } = await renderRank();
    expect(result.current).toBe('#41 Wealth');
  });

  it('is null when unranked on the wealth board', async () => {
    vi.mocked(getStanding).mockResolvedValue(standing(null, 50));
    const { result } = await renderRank();
    expect(result.current).toBeNull();
  });

  it('is null when the standing request fails (e.g. leaderboards 404)', async () => {
    vi.mocked(getStanding).mockRejectedValue(new Error('404'));
    const { result } = await renderRank();
    expect(result.current).toBeNull();
  });

  it('queries the signed-in mode and current season', async () => {
    netWorth.owner = { isLadder: false, isHardcore: true };
    vi.mocked(getStanding).mockResolvedValue(standing(3, 90));
    await renderRank();
    expect(getStanding).toHaveBeenCalledWith('tok', { isLadder: false, isHardcore: true }, 's13');
  });

  it('omits the season when none is current', async () => {
    netWorth.currentSeasonId = null;
    vi.mocked(getStanding).mockResolvedValue(standing(3, 90));
    await renderRank();
    expect(vi.mocked(getStanding).mock.calls[0][2]).toBeUndefined();
  });

  it.each([
    ['leaderboards are not live', () => (flags.live = false)],
    ['signed out', () => (token = undefined)],
    ['the owner is unknown', () => (netWorth.owner = null)],
  ])('does not query when %s', async (_label, setup) => {
    setup();
    vi.mocked(getStanding).mockResolvedValue(standing(41, 93.4));
    const { result } = await renderRank();
    expect(getStanding).not.toHaveBeenCalled();
    expect(result.current).toBeNull();
  });

  it('refreshes when the valuation price day changes', async () => {
    vi.mocked(getStanding).mockResolvedValueOnce(standing(41, 93.4)).mockResolvedValueOnce(standing(30, 96));
    const { result, rerender } = await renderRank();
    expect(result.current).toBe('#41 Wealth · Top 7%');

    netWorth.priceDay = '2026-10-19';
    rerender();
    await act(async () => {});

    expect(getStanding).toHaveBeenCalledTimes(2);
    expect(result.current).toBe('#30 Wealth · Top 4%');
  });
});
