// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readText, writeText } from '@/lib/browser-clipboard';
import { useClipboard } from './useClipboard';

vi.mock('@/lib/browser-clipboard', () => ({ readText: vi.fn(), writeText: vi.fn() }));

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('useClipboard', () => {
  it('starts empty and exposes what was read', async () => {
    vi.mocked(readText).mockResolvedValue('{"name":"Shako"}');
    const { result } = renderHook(() => useClipboard());
    expect(result.current.text).toBe('');

    let value: string | null | undefined;
    await act(async () => {
      value = await result.current.read();
    });

    expect(value).toBe('{"name":"Shako"}');
    expect(result.current.text).toBe('{"name":"Shako"}');
  });

  it('keeps the previous text when the clipboard is unreadable (null)', async () => {
    vi.mocked(readText).mockResolvedValueOnce('first').mockResolvedValueOnce(null);
    const { result } = renderHook(() => useClipboard());
    await act(() => result.current.read());

    let value: string | null | undefined;
    await act(async () => {
      value = await result.current.read();
    });

    expect(value).toBeNull();
    expect(result.current.text).toBe('first');
  });

  it('accepts an empty clipboard as a real value', async () => {
    vi.mocked(readText).mockResolvedValueOnce('first').mockResolvedValueOnce('');
    const { result } = renderHook(() => useClipboard());
    await act(() => result.current.read());
    await act(() => result.current.read());

    expect(result.current.text).toBe('');
  });

  it('resolves undefined and keeps text when reading throws', async () => {
    vi.mocked(readText).mockRejectedValue(new Error('denied'));
    const { result } = renderHook(() => useClipboard());

    let value: string | null | undefined = 'sentinel';
    await act(async () => {
      value = await result.current.read();
    });

    expect(value).toBeUndefined();
    expect(result.current.text).toBe('');
  });

  it('tracks copied text only after the write succeeds', async () => {
    vi.mocked(writeText).mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('denied'));
    const { result } = renderHook(() => useClipboard());

    await act(() => result.current.copy('/w *seller hi'));
    expect(result.current.text).toBe('/w *seller hi');

    await expect(act(() => result.current.copy('lost'))).resolves.toBeUndefined();
    expect(result.current.text).toBe('/w *seller hi');
  });
});
