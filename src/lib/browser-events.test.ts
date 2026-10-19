// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emit as tauriEmit, listen as tauriListen } from '@tauri-apps/api/event';
import { emit, listen } from './browser-events';

const tauri = vi.hoisted(() => ({ value: false }));

vi.mock('@tauri-apps/api/core', () => ({ isTauri: () => tauri.value }));
vi.mock('@tauri-apps/api/event', () => ({ emit: vi.fn(), listen: vi.fn() }));

const unlisteners: Array<() => void> = [];

async function track<T>(event: string, cb: (e: { payload: T }) => void) {
  const off = await listen<T>(event, cb);
  unlisteners.push(off);
  return off;
}

beforeEach(() => {
  tauri.value = false;
});

afterEach(() => {
  unlisteners.splice(0).forEach((off) => off());
});

describe('browser mode', () => {
  // BUG: browser-events.ts:22-36 — emit() dispatches a window CustomEvent (which the listen() handler
  // forwards to the callback) AND calls the same callback again from the eventListeners map, so every
  // browser-mode listener receives each event twice.
  it.fails('delivers each emitted payload to a listener exactly once', async () => {
    const cb = vi.fn();
    await track('settings-updated', cb);

    await emit('settings-updated', { themeId: 'ember' });

    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('delivers the payload to listeners of that event only', async () => {
    const a = vi.fn();
    const b = vi.fn();
    await track('a', a);
    await track('b', b);

    await emit('a', 42);

    expect(a.mock.calls.every(([e]) => e.payload === 42)).toBe(true);
    expect(a).toHaveBeenCalled();
    expect(b).not.toHaveBeenCalled();
  });

  it('stops delivering after unlisten, while other listeners of the same event keep receiving', async () => {
    const removed = vi.fn();
    const kept = vi.fn();
    const off = await listen('evt', removed);
    await track('evt', kept);

    off();
    await emit('evt', 'x');

    expect(removed).not.toHaveBeenCalled();
    expect(kept).toHaveBeenCalled();
  });

  it('does not touch the Tauri event bridge', async () => {
    await track('evt', vi.fn());
    await emit('evt', 1);

    expect(tauriEmit).not.toHaveBeenCalled();
    expect(tauriListen).not.toHaveBeenCalled();
  });
});

describe('Tauri mode', () => {
  it('routes emit and listen through the Tauri bridge and never through window events', async () => {
    tauri.value = true;
    const tauriUnlisten = vi.fn();
    vi.mocked(tauriListen).mockResolvedValue(tauriUnlisten);
    const windowListener = vi.fn();
    window.addEventListener('evt', windowListener);

    const off = await listen('evt', vi.fn());
    await emit('evt', { a: 1 });
    off();

    expect(tauriEmit).toHaveBeenCalledWith('evt', { a: 1 });
    expect(tauriUnlisten).toHaveBeenCalledTimes(1);
    expect(windowListener).not.toHaveBeenCalled();
    window.removeEventListener('evt', windowListener);
  });
});
