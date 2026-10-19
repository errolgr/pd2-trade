// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { check } from '@tauri-apps/plugin-updater';
import type { Update } from '@tauri-apps/plugin-updater';
import { useAvailableUpdate } from './useAvailableUpdate';

vi.mock('@tauri-apps/plugin-updater', () => ({ check: vi.fn() }));
vi.mock('@tauri-apps/api/core', () => ({ isTauri: () => true }));

const update = (version: string) => ({ version }) as unknown as Update; // only `version` is read

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

// Drives the price check "Restart to update" pill.
describe('useAvailableUpdate', () => {
  it('reports a newer release found on mount', async () => {
    vi.mocked(check).mockResolvedValue(update('1.2.0'));
    const { result } = renderHook(() => useAvailableUpdate());
    await act(async () => {});
    expect(result.current).toBe('1.2.0');
  });

  it('reports nothing when already up to date', async () => {
    vi.mocked(check).mockResolvedValue(null);
    const { result } = renderHook(() => useAvailableUpdate());
    await act(async () => {});
    expect(result.current).toBeNull();
  });

  it('picks up a release published later and keeps it through a failed check', async () => {
    vi.mocked(check)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(update('1.3.0'))
      .mockRejectedValueOnce(new Error('offline'));
    const { result } = renderHook(() => useAvailableUpdate());
    await act(async () => {});
    expect(result.current).toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30 * 60 * 1000);
    });
    expect(result.current).toBe('1.3.0');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30 * 60 * 1000);
    });
    expect(result.current).toBe('1.3.0');
  });
});
