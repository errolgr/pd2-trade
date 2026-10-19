// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NetWorthApiError } from '@/lib/networth-api';
import { useNetWorthQuery } from './useNetWorthQuery';

vi.mock('@/lib/browser-http', () => ({ fetch: vi.fn() }));

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** A loader whose every call returns the next pending promise. */
function queuedLoader<T>() {
  const calls: Deferred<T>[] = [];
  const load = vi.fn(() => {
    const d = deferred<T>();
    calls.push(d);
    return d.promise;
  });
  return { load, calls };
}

type Props = { load: (() => Promise<string>) | null; refreshKey?: string | null };

function setup(initial: Props) {
  return renderHook(({ load, refreshKey }: Props) => useNetWorthQuery(load, refreshKey), { initialProps: initial });
}

afterEach(cleanup);

describe('useNetWorthQuery', () => {
  it('is idle with no data when disabled', () => {
    const { result } = setup({ load: null });
    expect(result.current).toMatchObject({ data: null, loading: false, error: null });
  });

  it('loads, then exposes the data', async () => {
    const { load, calls } = queuedLoader<string>();
    const { result } = setup({ load });
    expect(result.current).toMatchObject({ data: null, loading: true, error: null });

    await act(async () => calls[0].resolve('v1'));
    expect(result.current).toMatchObject({ data: 'v1', loading: false, error: null });
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('maps a 401 to a sign-in message and passes other errors through', async () => {
    const { load, calls } = queuedLoader<string>();
    const { result } = setup({ load });
    await act(async () => calls[0].reject(new NetWorthApiError('Unauthorized', 401)));
    expect(result.current).toMatchObject({
      data: null,
      loading: false,
      error: 'Your PD2 session expired. Sign in again.',
    });

    act(() => result.current.reload());
    await act(async () => calls[1].reject(new NetWorthApiError('Account not linked', 403)));
    expect(result.current.error).toBe('Account not linked');

    act(() => result.current.reload());
    await act(async () => calls[2].reject('plain string failure'));
    expect(result.current.error).toBe('plain string failure');
  });

  it('keeps the previous data visible while a reload is in flight, and clears the stale error', async () => {
    const { load, calls } = queuedLoader<string>();
    const { result } = setup({ load });
    await act(async () => calls[0].resolve('v1'));

    act(() => result.current.reload());
    expect(result.current).toMatchObject({ data: 'v1', loading: true, error: null });
    await act(async () => calls[1].resolve('v2'));
    expect(result.current).toMatchObject({ data: 'v2', loading: false });

    act(() => result.current.reload());
    await act(async () => calls[2].reject(new Error('boom')));
    expect(result.current).toMatchObject({ data: null, loading: false, error: 'boom' });

    act(() => result.current.reload());
    expect(result.current).toMatchObject({ loading: true, error: null });
  });

  it('reloads when the refresh key changes but not on an unrelated re-render', async () => {
    const { load, calls } = queuedLoader<string>();
    const { result, rerender } = setup({ load, refreshKey: 'a' });
    await act(async () => calls[0].resolve('v1'));

    rerender({ load, refreshKey: 'a' });
    expect(load).toHaveBeenCalledTimes(1);
    expect(result.current.loading).toBe(false);

    rerender({ load, refreshKey: 'b' });
    expect(load).toHaveBeenCalledTimes(2);
    expect(result.current.loading).toBe(true);
    await act(async () => calls[1].resolve('v2'));
    expect(result.current).toMatchObject({ data: 'v2', loading: false });
  });

  it('ignores a slow response from a superseded loader', async () => {
    const first = queuedLoader<string>();
    const second = queuedLoader<string>();
    const { result, rerender } = setup({ load: first.load });

    rerender({ load: second.load });
    await act(async () => second.calls[0].resolve('new'));
    await act(async () => first.calls[0].resolve('old'));
    expect(result.current).toMatchObject({ data: 'new', loading: false });
  });

  it('ignores a failure from a superseded reload', async () => {
    const { load, calls } = queuedLoader<string>();
    const { result } = setup({ load });
    act(() => result.current.reload());
    await act(async () => calls[0].reject(new Error('stale failure')));
    expect(result.current).toMatchObject({ loading: true, error: null });
    await act(async () => calls[1].resolve('fresh'));
    expect(result.current).toMatchObject({ data: 'fresh', loading: false, error: null });
  });

  it('reports no data once disabled, and does not apply a response that lands afterwards', async () => {
    const { load, calls } = queuedLoader<string>();
    const { result, rerender } = setup({ load });
    rerender({ load: null });
    expect(result.current).toMatchObject({ data: null, loading: false, error: null });
    await act(async () => calls[0].resolve('late'));
    expect(result.current.data).toBeNull();
  });

  it('keeps reload identity stable across renders', async () => {
    const { load, calls } = queuedLoader<string>();
    const { result, rerender } = setup({ load });
    const reload = result.current.reload;
    await act(async () => calls[0].resolve('v1'));
    rerender({ load });
    expect(result.current.reload).toBe(reload);
  });
});
