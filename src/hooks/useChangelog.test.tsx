// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { getVersion } from '@/lib/browser-app';
import { openCenteredWindow } from '@/lib/window';
import { useOptions } from '@/hooks/useOptions';
import { CHANGELOG_DELAY_MS, useChangelog } from './useChangelog';

vi.mock('@tauri-apps/api/core', () => ({ isTauri: () => true }));
vi.mock('@tauri-apps/api/webviewWindow', () => ({ WebviewWindow: { getByLabel: vi.fn() } }));
vi.mock('@/lib/browser-app', () => ({ getVersion: vi.fn() }));
vi.mock('@/lib/window', () => ({ openCenteredWindow: vi.fn() }));
vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));
vi.mock('@/assets/changeLog', () => ({ changeLog: { '1.2.0': ['New thing'] } }));

type Settings = { lastSeenVersion?: string; pd2Token?: string; pd2TokenExpiry?: number };
let options: { settings: Settings; isLoading: boolean };

const signedIn: Settings = { pd2Token: 'token', pd2TokenExpiry: Date.now() + 60 * 60 * 1000 };

const flush = () => act(async () => {});
const advance = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });

async function renderChangelog(settings: Settings, version: string, isLoading = false) {
  options = { settings, isLoading };
  vi.mocked(getVersion).mockResolvedValue(version);
  const view = renderHook(() => useChangelog());
  await flush();
  return view;
}

/** An open sign-in window whose `tauri://destroyed` listener can be fired by the test. */
function openSignInWindow() {
  let destroyed: (() => void) | undefined;
  const win = { once: vi.fn((_event: string, cb: () => void) => (destroyed = cb)) };
  vi.mocked(WebviewWindow.getByLabel).mockResolvedValue(win as never);
  return {
    close: async () => {
      vi.mocked(WebviewWindow.getByLabel).mockResolvedValue(null);
      await act(async () => destroyed?.());
    },
  };
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: false });
  vi.mocked(useOptions).mockImplementation(() => options as never);
  vi.mocked(WebviewWindow.getByLabel).mockResolvedValue(null);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe('useChangelog', () => {
  it('opens the changelog shortly after startup for a signed-in user who upgraded', async () => {
    await renderChangelog({ ...signedIn, lastSeenVersion: '1.1.0' }, '1.2.0');
    await advance(CHANGELOG_DELAY_MS - 1);
    expect(openCenteredWindow).not.toHaveBeenCalled();
    await advance(1);
    expect(openCenteredWindow).toHaveBeenCalledTimes(1);
    expect(vi.mocked(openCenteredWindow).mock.calls[0][1]).toBe('/change-log');
  });

  it('waits for sign-in instead of opening next to the sign-in prompt', async () => {
    const { rerender } = await renderChangelog({ lastSeenVersion: '1.1.0' }, '1.2.0');
    await advance(10_000);
    expect(openCenteredWindow).not.toHaveBeenCalled();

    options = { settings: { ...signedIn, lastSeenVersion: '1.1.0' }, isLoading: false };
    rerender();
    await flush();
    await advance(CHANGELOG_DELAY_MS);
    expect(openCenteredWindow).toHaveBeenCalledTimes(1);
  });

  it('treats an expired token as signed out until it is refreshed', async () => {
    const expired = { pd2Token: 'old', pd2TokenExpiry: Date.now() - 1000, lastSeenVersion: '1.1.0' };
    const { rerender } = await renderChangelog(expired, '1.2.0');
    await advance(10_000);
    expect(openCenteredWindow).not.toHaveBeenCalled();

    options = { settings: { ...signedIn, lastSeenVersion: '1.1.0' }, isLoading: false };
    rerender();
    await flush();
    await advance(CHANGELOG_DELAY_MS);
    expect(openCenteredWindow).toHaveBeenCalledTimes(1);
  });

  it('waits for the sign-in window to close (account picker after the token is stored)', async () => {
    const signIn = openSignInWindow();
    await renderChangelog({ ...signedIn, lastSeenVersion: '1.1.0' }, '1.2.0');
    await advance(10_000);
    expect(openCenteredWindow).not.toHaveBeenCalled();

    await signIn.close();
    await advance(CHANGELOG_DELAY_MS);
    expect(openCenteredWindow).toHaveBeenCalledTimes(1);
  });

  it('does not open when sign-out happens during the delay', async () => {
    const { rerender } = await renderChangelog({ ...signedIn, lastSeenVersion: '1.1.0' }, '1.2.0');
    options = { settings: { lastSeenVersion: '1.1.0' }, isLoading: false };
    rerender();
    await advance(CHANGELOG_DELAY_MS * 2);
    expect(openCenteredWindow).not.toHaveBeenCalled();
  });

  it('stays closed when the user already saw this version', async () => {
    await renderChangelog({ ...signedIn, lastSeenVersion: '1.2.0' }, '1.2.0');
    await advance(CHANGELOG_DELAY_MS);
    expect(openCenteredWindow).not.toHaveBeenCalled();
  });

  it('stays closed for a version without changelog notes', async () => {
    await renderChangelog({ ...signedIn, lastSeenVersion: '1.1.0' }, '1.2.1');
    await advance(CHANGELOG_DELAY_MS);
    expect(openCenteredWindow).not.toHaveBeenCalled();
  });

  it('stays closed when the version is unknown', async () => {
    await renderChangelog({ ...signedIn, lastSeenVersion: '1.1.0' }, '');
    await advance(CHANGELOG_DELAY_MS);
    expect(openCenteredWindow).not.toHaveBeenCalled();
  });

  it('waits for settings to load before comparing versions', async () => {
    const { rerender } = await renderChangelog({ ...signedIn, lastSeenVersion: '0.0.0' }, '1.2.0', true);
    expect(getVersion).not.toHaveBeenCalled();

    // Loaded settings show the user already saw 1.2.0: the default '0.0.0' must not trigger the popup
    options = { settings: { ...signedIn, lastSeenVersion: '1.2.0' }, isLoading: false };
    rerender();
    await flush();
    await advance(CHANGELOG_DELAY_MS);
    expect(openCenteredWindow).not.toHaveBeenCalled();
  });
});
