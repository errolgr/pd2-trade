import { beforeEach, describe, expect, it, vi } from 'vitest';
import { holdListener } from './listener';

const flush = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('holdListener', () => {
  it('releases the listener once, however often release is called', async () => {
    const off = vi.fn();
    const release = holdListener(Promise.resolve(off), 'test');
    await flush();

    release();
    release();
    await flush();

    expect(off).toHaveBeenCalledTimes(1);
  });

  it('releases a listener that resolves after release', async () => {
    const off = vi.fn();
    const pending = Promise.withResolvers<() => void>();
    const release = holdListener(pending.promise, 'test');

    release();
    expect(off).not.toHaveBeenCalled();
    pending.resolve(off);
    await flush();

    expect(off).toHaveBeenCalledTimes(1);
  });

  // Tauri's unlisten rejects with "listeners[eventId].handlerId" once its listener is already gone.
  // A caught rejection reaches console.warn; an uncaught one would fail the run as an unhandled rejection.
  it('contains a rejecting or throwing unlisten', async () => {
    const rejecting = holdListener(
      Promise.resolve(() => Promise.reject(new TypeError("Cannot read properties of undefined (reading 'handlerId')"))),
      'rejecting',
    );
    const throwing = holdListener(
      Promise.resolve(() => {
        throw new TypeError('gone');
      }),
      'throwing',
    );
    await flush();

    expect(() => rejecting()).not.toThrow();
    expect(() => throwing()).not.toThrow();
    await flush();

    expect(console.warn).toHaveBeenCalledTimes(2);
  });

  it('contains a failed listen()', async () => {
    const release = holdListener(Promise.reject(new Error('no ipc')), 'test');
    await flush();

    expect(() => release()).not.toThrow();
    expect(console.warn).toHaveBeenCalledTimes(1);
  });
});
