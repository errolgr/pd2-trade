// @vitest-environment happy-dom
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getSimLadderCharacters, type SimCharacter } from '@/lib/sim-characters';
import {
  clearSimLadderCharactersCache,
  SIM_CHARACTERS_FRESH_MS,
  useSimLadderCharacters,
} from './useSimLadderCharacters';

vi.mock('@/lib/sim-characters', () => ({ getSimLadderCharacters: vi.fn() }));

const OLD: SimCharacter[] = [{ name: 'hammer', account: 'Main', level: 90 }];
const NEW: SimCharacter[] = [{ name: 'hammer', account: 'Main', level: 91 }];
const open = () => renderHook(() => useSimLadderCharacters('tok', 'Main'));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  clearSimLadderCharactersCache();
  vi.mocked(getSimLadderCharacters).mockReset();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('useSimLadderCharacters', () => {
  it('reuses a fresh list on the next open without asking again, per login and account', async () => {
    vi.mocked(getSimLadderCharacters).mockResolvedValue(OLD);
    const first = open();
    await waitFor(() => expect(first.result.current).toEqual({ status: 'ok', data: OLD }));
    first.unmount();

    const again = renderHook(() => useSimLadderCharacters('tok', 'main'));
    // No loading frame
    expect(again.result.current).toEqual({ status: 'ok', data: OLD });
    expect(getSimLadderCharacters).toHaveBeenCalledTimes(1);

    renderHook(() => useSimLadderCharacters('tok', 'Alt'));
    expect(getSimLadderCharacters).toHaveBeenLastCalledWith('tok', 'Alt');
  });

  it('shows a stale list at once and swaps in the reload', async () => {
    vi.mocked(getSimLadderCharacters).mockResolvedValueOnce(OLD);
    const first = open();
    await waitFor(() => expect(first.result.current.status).toBe('ok'));
    first.unmount();

    vi.setSystemTime(Date.now() + SIM_CHARACTERS_FRESH_MS);
    const reload = Promise.withResolvers<SimCharacter[]>();
    vi.mocked(getSimLadderCharacters).mockReturnValueOnce(reload.promise);
    const again = open();
    expect(again.result.current).toEqual({ status: 'ok', data: OLD });
    reload.resolve(NEW);
    await waitFor(() => expect(again.result.current).toEqual({ status: 'ok', data: NEW }));
  });

  it('keeps showing the last list when a reload fails, and never caches a failure', async () => {
    const error = new Error('503');
    vi.mocked(getSimLadderCharacters).mockRejectedValueOnce(error);
    const failed = open();
    await waitFor(() => expect(failed.result.current).toEqual({ status: 'error', error }));
    failed.unmount();

    vi.mocked(getSimLadderCharacters).mockResolvedValueOnce(OLD);
    const retried = open();
    await waitFor(() => expect(retried.result.current).toEqual({ status: 'ok', data: OLD }));
    retried.unmount();

    vi.setSystemTime(Date.now() + SIM_CHARACTERS_FRESH_MS);
    vi.mocked(getSimLadderCharacters).mockRejectedValueOnce(error);
    const stale = open();
    await waitFor(() => expect(getSimLadderCharacters).toHaveBeenCalledTimes(3));
    await Promise.resolve();
    expect(stale.result.current).toEqual({ status: 'ok', data: OLD });
  });
});
