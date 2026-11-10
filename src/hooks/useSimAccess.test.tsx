// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useOptions } from '@/hooks/useOptions';
import { getSimAccess, type SimAccess } from '@/lib/sim-export-api';
import { SIM_ACCESS_TTL_MS, useSimAccess } from './useSimAccess';

vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));
vi.mock('@/lib/sim-export-api', () => ({ getSimAccess: vi.fn() }));

let token: string | undefined;

const IN: SimAccess = { canUse: true, waitlistUrl: 'https://pd2trader.com/sim/beta', waitlistPosition: null };
const WAITING: SimAccess = { ...IN, canUse: false, waitlistPosition: 7 };
let isLoading: boolean;

async function renderAccess() {
  const view = renderHook(() => useSimAccess());
  await act(async () => {});
  return view;
}

beforeEach(() => {
  isLoading = false;
  vi.mocked(useOptions).mockImplementation(() => ({ settings: { pd2Token: token }, isLoading }) as never);
  vi.mocked(getSimAccess).mockReset();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('useSimAccess', () => {
  it('is unknown until the flag answers, then shares one request per login for a minute', async () => {
    token = 'tester';
    const { promise, resolve } = Promise.withResolvers<SimAccess | null>();
    vi.mocked(getSimAccess).mockReturnValueOnce(promise);
    const first = renderHook(() => useSimAccess());
    expect(first.result.current).toBeUndefined();
    await act(async () => resolve(IN));
    expect(first.result.current).toEqual(IN);

    // A card mounted later renders the cached answer at once.
    const second = renderHook(() => useSimAccess());
    expect(second.result.current).toEqual(IN);
    await act(async () => {});
    expect(vi.mocked(getSimAccess).mock.calls).toEqual([['tester']]);
  });

  it('asks again after the TTL and per token, anonymously when signed out', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    token = 'ttl';
    vi.mocked(getSimAccess).mockResolvedValue(null);
    await renderAccess();
    vi.setSystemTime(Date.now() + SIM_ACCESS_TTL_MS);
    await renderAccess();
    token = undefined;
    const { result } = await renderAccess();
    expect(result.current).toBeNull();
    expect(vi.mocked(getSimAccess).mock.calls).toEqual([['ttl'], ['ttl'], [null]]);
  });

  it('fails closed when the beta status cannot be read', async () => {
    token = 'offline';
    vi.mocked(getSimAccess).mockRejectedValueOnce(new Error('network down'));
    const { result } = await renderAccess();
    expect(result.current).toBeNull();
  });

  it('re-checks while mounted, so a login allowlisted after the first answer gets in without a restart', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
    token = 'allowlisted-later';
    vi.mocked(getSimAccess).mockResolvedValueOnce(WAITING).mockResolvedValueOnce(IN);
    const { result } = await renderAccess();
    expect(result.current).toEqual(WAITING);

    await act(async () => vi.advanceTimersByTime(SIM_ACCESS_TTL_MS));
    expect(result.current).toEqual(IN);
    expect(vi.mocked(getSimAccess).mock.calls).toEqual([['allowlisted-later'], ['allowlisted-later']]);
  });

  it('keeps the last answer when a re-check fails', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
    token = 'flaky';
    vi.mocked(getSimAccess).mockResolvedValueOnce(IN).mockRejectedValueOnce(new Error('503'));
    const { result } = await renderAccess();
    expect(result.current).toEqual(IN);

    await act(async () => vi.advanceTimersByTime(SIM_ACCESS_TTL_MS));
    expect(getSimAccess).toHaveBeenCalledTimes(2);
    expect(result.current).toEqual(IN);
  });

  it('waits for the settings before asking', async () => {
    token = 'later';
    isLoading = true;
    const { result } = await renderAccess();
    expect(result.current).toBeUndefined();
    expect(getSimAccess).not.toHaveBeenCalled();
  });
});
