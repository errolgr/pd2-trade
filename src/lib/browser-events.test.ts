import { beforeEach, describe, expect, it, vi } from 'vitest';
import { listen as tauriListen } from '@tauri-apps/api/event';
import { listen } from './browser-events';

const tauri = vi.hoisted(() => ({ value: false }));

vi.mock('@tauri-apps/api/core', () => ({ isTauri: () => tauri.value }));
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn() }));

beforeEach(() => {
  tauri.value = false;
  vi.mocked(tauriListen).mockReset();
});

describe('listen', () => {
  it('is a no-op in browser mode that returns a callable unlisten', async () => {
    const cb = vi.fn();

    const off = await listen('diablo-focus-changed', cb);

    expect(tauriListen).not.toHaveBeenCalled();
    expect(() => off()).not.toThrow();
    expect(cb).not.toHaveBeenCalled();
  });

  it('subscribes through the Tauri bridge in the app and returns its unlisten', async () => {
    tauri.value = true;
    const tauriUnlisten = vi.fn();
    vi.mocked(tauriListen).mockResolvedValue(tauriUnlisten);
    const cb = vi.fn();

    const off = await listen('trade-message', cb);
    off();

    expect(tauriListen).toHaveBeenCalledWith('trade-message', cb);
    expect(tauriUnlisten).toHaveBeenCalledTimes(1);
  });
});
