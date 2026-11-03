// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getVersion } from '@/lib/browser-app';
import { useOverlay } from '@/overlay';
import { useSignIn } from '@/hooks/useSignIn';
import { useOptions } from '@/hooks/useOptions';
import { CHANGELOG_DELAY_MS, useChangelog } from './useChangelog';

vi.mock('@/lib/browser-app', () => ({ getVersion: vi.fn() }));
vi.mock('@/overlay', () => ({ useOverlay: vi.fn() }));
vi.mock('@/hooks/useSignIn', () => ({ useSignIn: vi.fn() }));
vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));
vi.mock('@/assets/changeLog', () => ({ changeLog: { '1.2.0': ['New thing'] } }));

type Settings = { lastSeenVersion?: string; pd2Token?: string; pd2TokenExpiry?: number };
let options: { settings: Settings; isLoading: boolean };
let signInOpen: boolean;
const openPanel = vi.fn();

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

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: false });
  signInOpen = false;
  vi.mocked(useOptions).mockImplementation(() => options as never);
  vi.mocked(useOverlay).mockReturnValue({ openPanel } as never);
  vi.mocked(useSignIn).mockImplementation(() => ({ openSignIn: vi.fn(), isOpen: signInOpen }) as never);
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
    expect(openPanel).not.toHaveBeenCalled();
    await advance(1);
    expect(openPanel).toHaveBeenCalledTimes(1);
    expect(openPanel).toHaveBeenCalledWith('changeLog');
  });

  it('waits for sign-in instead of opening next to the sign-in prompt', async () => {
    const { rerender } = await renderChangelog({ lastSeenVersion: '1.1.0' }, '1.2.0');
    await advance(10_000);
    expect(openPanel).not.toHaveBeenCalled();

    options = { settings: { ...signedIn, lastSeenVersion: '1.1.0' }, isLoading: false };
    rerender();
    await flush();
    await advance(CHANGELOG_DELAY_MS);
    expect(openPanel).toHaveBeenCalledTimes(1);
  });

  it('treats an expired token as signed out until it is refreshed', async () => {
    const expired = { pd2Token: 'old', pd2TokenExpiry: Date.now() - 1000, lastSeenVersion: '1.1.0' };
    const { rerender } = await renderChangelog(expired, '1.2.0');
    await advance(10_000);
    expect(openPanel).not.toHaveBeenCalled();

    options = { settings: { ...signedIn, lastSeenVersion: '1.1.0' }, isLoading: false };
    rerender();
    await flush();
    await advance(CHANGELOG_DELAY_MS);
    expect(openPanel).toHaveBeenCalledTimes(1);
  });

  it('waits for the sign-in panel to close (account picker after the token is stored)', async () => {
    signInOpen = true;
    const { rerender } = await renderChangelog({ ...signedIn, lastSeenVersion: '1.1.0' }, '1.2.0');
    await advance(10_000);
    expect(openPanel).not.toHaveBeenCalled();

    signInOpen = false;
    rerender();
    await flush();
    await advance(CHANGELOG_DELAY_MS);
    expect(openPanel).toHaveBeenCalledTimes(1);
  });

  it('does not open when sign-out happens during the delay', async () => {
    const { rerender } = await renderChangelog({ ...signedIn, lastSeenVersion: '1.1.0' }, '1.2.0');
    options = { settings: { lastSeenVersion: '1.1.0' }, isLoading: false };
    rerender();
    await advance(CHANGELOG_DELAY_MS * 2);
    expect(openPanel).not.toHaveBeenCalled();
  });

  it('stays closed when the user already saw this version', async () => {
    await renderChangelog({ ...signedIn, lastSeenVersion: '1.2.0' }, '1.2.0');
    await advance(CHANGELOG_DELAY_MS);
    expect(openPanel).not.toHaveBeenCalled();
  });

  it('stays closed for a version without changelog notes', async () => {
    await renderChangelog({ ...signedIn, lastSeenVersion: '1.1.0' }, '1.2.1');
    await advance(CHANGELOG_DELAY_MS);
    expect(openPanel).not.toHaveBeenCalled();
  });

  it('stays closed when the version is unknown', async () => {
    await renderChangelog({ ...signedIn, lastSeenVersion: '1.1.0' }, '');
    await advance(CHANGELOG_DELAY_MS);
    expect(openPanel).not.toHaveBeenCalled();
  });

  it('waits for settings to load before comparing versions', async () => {
    const { rerender } = await renderChangelog({ ...signedIn, lastSeenVersion: '0.0.0' }, '1.2.0', true);
    expect(getVersion).not.toHaveBeenCalled();

    // Loaded settings show the user already saw 1.2.0: the default '0.0.0' must not trigger the popup
    options = { settings: { ...signedIn, lastSeenVersion: '1.2.0' }, isLoading: false };
    rerender();
    await flush();
    await advance(CHANGELOG_DELAY_MS);
    expect(openPanel).not.toHaveBeenCalled();
  });
});
