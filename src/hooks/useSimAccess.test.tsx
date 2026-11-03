// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useOptions } from '@/hooks/useOptions';
import { getSimEnabled } from '@/lib/sim-export-api';
import { SIM_ACCESS_TTL_MS, useSimAccess } from './useSimAccess';

vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));
vi.mock('@/lib/sim-export-api', () => ({ getSimEnabled: vi.fn() }));

let token: string | undefined;
let isLoading: boolean;

async function renderAccess() {
  const view = renderHook(() => useSimAccess());
  await act(async () => {});
  return view;
}

beforeEach(() => {
  isLoading = false;
  vi.mocked(useOptions).mockImplementation(() => ({ settings: { pd2Token: token }, isLoading }) as never);
  vi.mocked(getSimEnabled).mockReset();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('useSimAccess', () => {
  it('is unknown until the flag answers, then shares one request per login for a minute', async () => {
    token = 'tester';
    const { promise, resolve } = Promise.withResolvers<boolean>();
    vi.mocked(getSimEnabled).mockReturnValueOnce(promise);
    const first = renderHook(() => useSimAccess());
    expect(first.result.current).toBeUndefined();
    await act(async () => resolve(true));
    expect(first.result.current).toBe(true);

    // A card mounted later renders the cached answer at once.
    const second = renderHook(() => useSimAccess());
    expect(second.result.current).toBe(true);
    await act(async () => {});
    expect(vi.mocked(getSimEnabled).mock.calls).toEqual([['tester']]);
  });

  it('asks again after the TTL and per token, anonymously when signed out', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    token = 'ttl';
    vi.mocked(getSimEnabled).mockResolvedValue(false);
    await renderAccess();
    vi.setSystemTime(Date.now() + SIM_ACCESS_TTL_MS);
    await renderAccess();
    token = undefined;
    const { result } = await renderAccess();
    expect(result.current).toBe(false);
    expect(vi.mocked(getSimEnabled).mock.calls).toEqual([['ttl'], ['ttl'], [null]]);
  });

  it('fails closed when the flags cannot be read', async () => {
    token = 'offline';
    vi.mocked(getSimEnabled).mockRejectedValueOnce(new Error('network down'));
    const { result } = await renderAccess();
    expect(result.current).toBe(false);
  });

  it('re-checks while mounted, so a login allowlisted after the first answer gets in without a restart', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
    token = 'allowlisted-later';
    vi.mocked(getSimEnabled).mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const { result } = await renderAccess();
    expect(result.current).toBe(false);

    await act(async () => vi.advanceTimersByTime(SIM_ACCESS_TTL_MS));
    expect(result.current).toBe(true);
    expect(vi.mocked(getSimEnabled).mock.calls).toEqual([['allowlisted-later'], ['allowlisted-later']]);
  });

  it('keeps the last answer when a re-check fails', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
    token = 'flaky';
    vi.mocked(getSimEnabled).mockResolvedValueOnce(true).mockRejectedValueOnce(new Error('503'));
    const { result } = await renderAccess();
    expect(result.current).toBe(true);

    await act(async () => vi.advanceTimersByTime(SIM_ACCESS_TTL_MS));
    expect(getSimEnabled).toHaveBeenCalledTimes(2);
    expect(result.current).toBe(true);
  });

  it('waits for the settings before asking', async () => {
    token = 'later';
    isLoading = true;
    const { result } = await renderAccess();
    expect(result.current).toBeUndefined();
    expect(getSimEnabled).not.toHaveBeenCalled();
  });
});
