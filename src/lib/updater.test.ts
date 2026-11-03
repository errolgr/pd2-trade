// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { showToast } from '@/overlay';
import { check } from '@tauri-apps/plugin-updater';
import type { DownloadEvent, Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { toast } from 'sonner';
import { useOptions } from '@/hooks/useOptions';
import type { ISettings } from '@/hooks/useOptions';
import { CustomToastPayload } from '@/common/types/Events';
import { resetUpdateNotification, useAppUpdates } from '@/hooks/useAppUpdates';
import { installUpdateAndRelaunch } from './updater';
import { isManualUpdateRequired, resetManualUpdateRequired } from './manual-update';

vi.mock('@/overlay', () => ({ showToast: vi.fn() }));
vi.mock('@tauri-apps/plugin-updater', () => ({ check: vi.fn() }));
vi.mock('@tauri-apps/plugin-process', () => ({ relaunch: vi.fn() }));
vi.mock('@tauri-apps/api/core', () => ({ isTauri: () => true }));
vi.mock('sonner', () => ({
  toast: { loading: vi.fn(), success: vi.fn(), error: vi.fn() },
}));
vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));
vi.mock('@/hooks/useDialog', () => ({
  useDialog: () => ({ openDialog: vi.fn(), closeDialog: vi.fn() }),
}));

let calls: string[];

function fakeUpdate(events: DownloadEvent[], failure?: Error): Update {
  const downloadAndInstall = vi.fn(async (onEvent?: (event: DownloadEvent) => void) => {
    events.forEach((event) => onEvent?.(event));
    if (failure) throw failure;
    calls.push('install');
  });
  return { available: true, version: '1.2.0', downloadAndInstall } as unknown as Update;
}

const fullDownload: DownloadEvent[] = [
  { event: 'Started', data: { contentLength: 200 } },
  { event: 'Progress', data: { chunkLength: 100 } },
  { event: 'Progress', data: { chunkLength: 100 } },
  { event: 'Finished' },
];

beforeEach(() => {
  calls = [];
  resetUpdateNotification();
  resetManualUpdateRequired();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.mocked(toast.loading).mockReturnValue('download-toast');
  vi.mocked(relaunch).mockImplementation(async () => {
    calls.push('relaunch');
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('installUpdateAndRelaunch', () => {
  it('installs an available update before relaunching, reporting progress', async () => {
    vi.mocked(check).mockResolvedValue(fakeUpdate(fullDownload));

    await installUpdateAndRelaunch();

    expect(calls).toEqual(['install', 'relaunch']);
    const loadingMessages = vi.mocked(toast.loading).mock.calls.map(([message]) => message);
    expect(loadingMessages).toEqual([
      'Downloading update...',
      'Downloading update... 50%',
      'Downloading update... 100%',
    ]);
    expect(toast.success).toHaveBeenCalledWith('Update downloaded! Restarting...', expect.anything());
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('reports 0% instead of NaN when the content length is unknown', async () => {
    vi.mocked(check).mockResolvedValue(
      fakeUpdate([
        { event: 'Started', data: {} },
        { event: 'Progress', data: { chunkLength: 50 } },
        { event: 'Finished' },
      ]),
    );

    await installUpdateAndRelaunch();

    expect(vi.mocked(toast.loading).mock.calls.map(([message]) => message)).toContain('Downloading update... 0%');
    expect(calls).toEqual(['install', 'relaunch']);
  });

  it('relaunches directly when no update is available', async () => {
    vi.mocked(check).mockResolvedValue(null);

    await installUpdateAndRelaunch();

    expect(calls).toEqual(['relaunch']);
    expect(toast.loading).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('shows an error, does not relaunch, and lets the same version notify again when the download fails', async () => {
    vi.useFakeTimers();
    vi.mocked(check).mockResolvedValue(fakeUpdate(fullDownload.slice(0, 2), new Error('download failed')));
    vi.mocked(useOptions).mockReturnValue({
      isOpen: false,
      setIsOpen: vi.fn(),
      isLoading: false,
      settings: { autoUpdateEnabled: false } as ISettings,
      updateSettings: vi.fn(),
    });
    const toastVersions = () =>
      vi.mocked(showToast).mock.calls.map(([payload]) => (payload as CustomToastPayload).action?.data?.version);
    const advance = (ms: number) =>
      act(async () => {
        await vi.advanceTimersByTimeAsync(ms);
      });

    renderHook(() => useAppUpdates());
    await advance(5000);
    await advance(5 * 60 * 1000);
    expect(toastVersions()).toEqual(['1.2.0']);

    // false lets windows without a Toaster (price check pill) show the failure
    expect(await installUpdateAndRelaunch()).toBe(false);

    expect(toast.error).toHaveBeenCalledWith('Failed to download update. Please try again later.', expect.anything());
    expect(relaunch).not.toHaveBeenCalled();
    expect(calls).toEqual([]);

    await advance(5 * 60 * 1000);
    expect(toastVersions()).toEqual(['1.2.0', '1.2.0']);
  });

  it('warns instead of reporting when GitHub is unreachable mid-download, with the same toast', async () => {
    vi.mocked(check).mockResolvedValue(fakeUpdate(fullDownload.slice(0, 2), new Error('error decoding response body')));

    expect(await installUpdateAndRelaunch()).toBe(false);

    expect(console.error).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith('Could not download update:', expect.any(Error));
    expect(toast.error).toHaveBeenCalledWith('Failed to download update. Please try again later.', expect.anything());
    expect(relaunch).not.toHaveBeenCalled();
  });
});

describe('installUpdateAndRelaunch on installs that cannot update in place', () => {
  it('links the release page instead of reporting an error when the install hits os error 13', async () => {
    vi.mocked(check).mockResolvedValue(
      fakeUpdate(fullDownload, new Error('Permission denied (os error 13) at path "/usr/bin/tauri_current_appXeR7LQ"')),
    );

    expect(await installUpdateAndRelaunch()).toBe(false);

    expect(console.error).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith('Update must be installed manually:', expect.any(Error));
    expect(toast.error).toHaveBeenCalledWith(
      'Update must be installed manually',
      expect.objectContaining({ action: expect.objectContaining({ label: 'Open Release Page' }) }),
    );
    expect(isManualUpdateRequired()).toBe(true);
    expect(relaunch).not.toHaveBeenCalled();
  });
});
