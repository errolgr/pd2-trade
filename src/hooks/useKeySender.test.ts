// @vitest-environment happy-dom
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { useKeySender } from './useKeySender';

const env = vi.hoisted(() => ({ tauri: true }));
vi.mock('@tauri-apps/api/core', () => ({ isTauri: () => env.tauri, invoke: vi.fn() }));

beforeEach(() => {
  env.tauri = true;
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('useKeySender', () => {
  it('returns a stable function across renders', () => {
    const { result, rerender } = renderHook(() => useKeySender());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });

  it('swallows native failures so callers are not interrupted', async () => {
    vi.mocked(invoke).mockRejectedValue(new Error('no window'));
    const { result } = renderHook(() => useKeySender());
    await expect(result.current('F4')).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalled();
  });

  it('is a no-op in the browser', async () => {
    env.tauri = false;
    const { result } = renderHook(() => useKeySender());
    await result.current('F4');
    expect(invoke).not.toHaveBeenCalled();
  });
});
