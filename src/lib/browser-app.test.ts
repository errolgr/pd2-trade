import { describe, expect, it, vi } from 'vitest';
import { getVersion as tauriGetVersion } from '@tauri-apps/api/app';
import { getVersion } from './browser-app';

const tauri = vi.hoisted(() => ({ value: false }));

vi.mock('@tauri-apps/api/core', () => ({ isTauri: () => tauri.value }));
vi.mock('@tauri-apps/api/app', () => ({ getVersion: vi.fn() }));

describe('getVersion', () => {
  it('reports the bundled app version in Tauri', async () => {
    tauri.value = true;
    vi.mocked(tauriGetVersion).mockResolvedValue('1.4.2');

    expect(await getVersion()).toBe('1.4.2');
  });

  it('reports a browser placeholder version without calling Tauri', async () => {
    tauri.value = false;

    expect(await getVersion()).toBe('0.0.0-browser');
    expect(tauriGetVersion).not.toHaveBeenCalled();
  });
});
