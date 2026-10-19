// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { openUrl as tauriOpenUrl } from '@tauri-apps/plugin-opener';
import { openUrl } from './browser-opener';

const tauri = vi.hoisted(() => ({ value: false }));

vi.mock('@tauri-apps/api/core', () => ({ isTauri: () => tauri.value }));
vi.mock('@tauri-apps/plugin-opener', () => ({ openUrl: vi.fn() }));

let windowOpen: MockInstance<typeof window.open>;

beforeEach(() => {
  windowOpen = vi.spyOn(window, 'open').mockReturnValue(null);
});

describe('openUrl', () => {
  it('opens in the system browser via the opener plugin in Tauri', async () => {
    tauri.value = true;

    await openUrl('https://projectdiablo2.com');

    expect(tauriOpenUrl).toHaveBeenCalledWith('https://projectdiablo2.com');
    expect(windowOpen).not.toHaveBeenCalled();
  });

  it('opens a new tab without opener access in the browser', async () => {
    tauri.value = false;

    await openUrl('https://projectdiablo2.com');

    expect(windowOpen).toHaveBeenCalledWith('https://projectdiablo2.com', '_blank', 'noopener,noreferrer');
    expect(tauriOpenUrl).not.toHaveBeenCalled();
  });
});
