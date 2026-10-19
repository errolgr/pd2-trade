// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { showToast } from '@/overlay';
import { check } from '@tauri-apps/plugin-updater';
import type { DownloadEvent, Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { useOptions } from '@/hooks/useOptions';
import type { ISettings } from '@/hooks/useOptions';
import { CustomToastPayload, ToastActionType } from '@/common/types/Events';
import { resetUpdateNotification, useAppUpdates } from './useAppUpdates';

vi.mock('@/overlay', () => ({ showToast: vi.fn() }));
vi.mock('@tauri-apps/plugin-updater', () => ({ check: vi.fn() }));
vi.mock('@tauri-apps/plugin-process', () => ({ relaunch: vi.fn() }));
vi.mock('@tauri-apps/api/core', () => ({ isTauri: () => true }));
vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));
vi.mock('@/hooks/useDialog', () => ({
  useDialog: () => ({ openDialog: vi.fn(), closeDialog: vi.fn() }),
}));

const FIVE_MINUTES = 5 * 60 * 1000;

// Ordered record of side effects so tests can assert "installed, then relaunched"
let calls: string[];
let options: { settings: Partial<ISettings>; isLoading: boolean };

function fakeUpdate(version: string): Update {
  const downloadAndInstall = vi.fn(async (onEvent?: (event: DownloadEvent) => void) => {
    onEvent?.({ event: 'Started', data: { contentLength: 100 } });
    onEvent?.({ event: 'Progress', data: { chunkLength: 100 } });
    onEvent?.({ event: 'Finished' });
    calls.push(`install ${version}`);
  });
  return { available: true, version, downloadAndInstall } as unknown as Update;
}

function updateToasts(): CustomToastPayload[] {
  return vi.mocked(showToast).mock.calls.map(([payload]) => payload as CustomToastPayload);
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

function renderAppUpdates(settings: Partial<ISettings>, isLoading = false) {
  options = { settings, isLoading };
  return renderHook(() => useAppUpdates());
}

beforeEach(() => {
  vi.useFakeTimers();
  calls = [];
  resetUpdateNotification();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.mocked(check).mockResolvedValue(fakeUpdate('1.2.0'));
  vi.mocked(relaunch).mockImplementation(async () => {
    calls.push('relaunch');
  });
  vi.mocked(useOptions).mockImplementation(() => ({
    isOpen: false,
    setIsOpen: vi.fn(),
    isLoading: options.isLoading,
    settings: options.settings as ISettings,
    updateSettings: vi.fn(),
  }));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('useAppUpdates auto-download', () => {
  it.each([
    ['enabled', true],
    ['unset (defaults to enabled)', undefined],
  ])('installs the update and then relaunches when auto-update is %s', async (_label, autoUpdateEnabled) => {
    renderAppUpdates({ autoUpdateEnabled });

    await advance(1999);
    expect(calls).toEqual([]);

    await advance(1);
    expect(calls).toEqual(['install 1.2.0', 'relaunch']);
  });

  it('does not auto-download while settings are still loading', async () => {
    const { rerender } = renderAppUpdates({ autoUpdateEnabled: true }, true);

    await advance(4000);
    expect(calls).toEqual([]);

    options.isLoading = false;
    rerender();
    await advance(2000);
    expect(calls).toEqual(['install 1.2.0', 'relaunch']);
  });

  it('does nothing when no update is available', async () => {
    vi.mocked(check).mockResolvedValue(null);
    renderAppUpdates({ autoUpdateEnabled: true });

    await advance(2 * FIVE_MINUTES);

    expect(check).toHaveBeenCalled();
    expect(calls).toEqual([]);
    expect(updateToasts()).toEqual([]);
  });
});

describe('useAppUpdates opted out', () => {
  it('only notifies, and re-enabling mid-session does not start a download', async () => {
    const { rerender } = renderAppUpdates({ autoUpdateEnabled: false });

    await advance(5000);
    expect(calls).toEqual([]);
    const toasts = updateToasts();
    expect(toasts).toHaveLength(1);
    expect(toasts[0].title).toBe('PD2 Trader - Update Available');
    expect(toasts[0].action?.type).toBe(ToastActionType.UPDATE_AVAILABLE);
    expect(toasts[0].action?.data).toEqual({ version: '1.2.0' });

    options.settings = { autoUpdateEnabled: true };
    rerender();
    await advance(2 * FIVE_MINUTES);
    expect(calls).toEqual([]);
  });
});

describe('useAppUpdates notifications', () => {
  it('notifies once per version and again after resetUpdateNotification()', async () => {
    renderAppUpdates({ autoUpdateEnabled: false });

    await advance(5000);
    await advance(2 * FIVE_MINUTES);
    expect(updateToasts().map((t) => t.action?.data?.version)).toEqual(['1.2.0']);

    vi.mocked(check).mockResolvedValue(fakeUpdate('1.3.0'));
    await advance(FIVE_MINUTES);
    await advance(FIVE_MINUTES);
    expect(updateToasts().map((t) => t.action?.data?.version)).toEqual(['1.2.0', '1.3.0']);

    resetUpdateNotification();
    await advance(FIVE_MINUTES);
    expect(updateToasts().map((t) => t.action?.data?.version)).toEqual(['1.2.0', '1.3.0', '1.3.0']);
  });

  it('survives a failing check and notifies on a later successful check', async () => {
    vi.mocked(check).mockRejectedValue(new Error('network unreachable'));
    renderAppUpdates({});

    await advance(5000);
    expect(check).toHaveBeenCalledTimes(2); // startup auto-download + first periodic check
    expect(updateToasts()).toEqual([]);
    expect(calls).toEqual([]);

    vi.mocked(check).mockResolvedValue(fakeUpdate('1.2.0'));
    await advance(FIVE_MINUTES);
    expect(updateToasts().map((t) => t.action?.data?.version)).toEqual(['1.2.0']);
  });
});
