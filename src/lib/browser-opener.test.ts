// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { openUrl } from './browser-opener';

const tauri = vi.hoisted(() => ({ value: false }));

vi.mock('@tauri-apps/api/core', () => ({ isTauri: () => tauri.value, invoke: vi.fn() }));

let windowOpen: MockInstance<typeof window.open>;

beforeEach(() => {
  vi.mocked(invoke).mockReset().mockResolvedValue(undefined);
  windowOpen = vi.spyOn(window, 'open').mockReturnValue(null);
});

describe('openUrl', () => {
  it("opens in the system browser through the app's opener in Tauri", async () => {
    tauri.value = true;

    await openUrl('https://projectdiablo2.com');

    expect(invoke).toHaveBeenCalledWith('open_url', { url: 'https://projectdiablo2.com' });
    expect(windowOpen).not.toHaveBeenCalled();
  });

  it('rejects in Tauri when nothing could open the browser', async () => {
    tauri.value = true;
    vi.mocked(invoke).mockRejectedValueOnce('/usr/bin/xdg-open failed (exit status: 3)');

    await expect(openUrl('https://projectdiablo2.com')).rejects.toBe('/usr/bin/xdg-open failed (exit status: 3)');
  });

  it('opens a new tab without opener access in the browser', async () => {
    tauri.value = false;

    await openUrl('https://projectdiablo2.com');

    expect(windowOpen).toHaveBeenCalledWith('https://projectdiablo2.com', '_blank', 'noopener,noreferrer');
    expect(invoke).not.toHaveBeenCalled();
  });
});
