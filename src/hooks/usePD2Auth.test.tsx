// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useOverlay } from '@/overlay';
import { useOptions } from '@/hooks/useOptions';
import type { ISettings } from '@/hooks/useOptions';
import { useOAuth } from '@/hooks/useOAuth';
import { usePD2Auth } from './usePD2Auth';

vi.mock('@/overlay', () => ({ useOverlay: vi.fn() }));
vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));
vi.mock('@/hooks/useOAuth', () => ({ useOAuth: vi.fn() }));

const NOW = new Date('2026-10-18T12:00:00Z').getTime();
const FIVE_MINUTES = 5 * 60 * 1000;

const openPanel = vi.fn();
const refreshTokens = vi.fn<(refreshToken: string) => Promise<boolean>>();
let options: { settings: Partial<ISettings>; isLoading: boolean };

function signInPrompts() {
  return openPanel.mock.calls.filter(([id]) => id === 'signIn').length;
}

function renderAuth(settings: Partial<ISettings>, isLoading = false) {
  options = { settings, isLoading };
  return renderHook(() => usePD2Auth());
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  openPanel.mockReset();
  vi.mocked(useOverlay).mockReturnValue({ openPanel } as never);
  refreshTokens.mockReset().mockResolvedValue(true);
  vi.mocked(useOAuth).mockReturnValue({ startOAuthFlow: vi.fn(), refreshTokens });
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

describe('usePD2Auth', () => {
  it('waits for settings to load before prompting sign-in for a missing token', () => {
    const { rerender } = renderAuth({}, true);
    expect(signInPrompts()).toBe(0);

    options.isLoading = false;
    rerender();
    expect(signInPrompts()).toBe(1);
    expect(refreshTokens).not.toHaveBeenCalled();
  });

  it('does nothing for a token without a known expiry', async () => {
    renderAuth({ pd2Token: 't', pd2RefreshToken: 'r' });
    await act(() => vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1000));
    expect(refreshTokens).not.toHaveBeenCalled();
    expect(signInPrompts()).toBe(0);
  });

  it('refreshes immediately when the token expires within 5 minutes', async () => {
    renderAuth({ pd2Token: 't', pd2RefreshToken: 'r', pd2TokenExpiry: NOW + FIVE_MINUTES });
    await act(async () => {});
    expect(refreshTokens).toHaveBeenCalledExactlyOnceWith('r');
    expect(signInPrompts()).toBe(0);
  });

  it('prompts sign-in when the immediate refresh fails', async () => {
    refreshTokens.mockResolvedValue(false);
    renderAuth({ pd2Token: 't', pd2RefreshToken: 'r', pd2TokenExpiry: NOW - 1 });
    await act(async () => {});
    expect(signInPrompts()).toBe(1);
  });

  it('does not start a second refresh while one is in flight', async () => {
    const refresh = Promise.withResolvers<boolean>();
    refreshTokens.mockReturnValue(refresh.promise);
    const { rerender } = renderAuth({ pd2Token: 't', pd2RefreshToken: 'r', pd2TokenExpiry: NOW - 1 });

    // A settings change that re-runs the effect while the refresh is pending.
    options.settings = { ...options.settings, pd2RefreshToken: 'r2' };
    rerender();
    expect(refreshTokens).toHaveBeenCalledTimes(1);

    await act(async () => refresh.resolve(true));
    options.settings = { ...options.settings, pd2RefreshToken: 'r3' };
    rerender();
    expect(refreshTokens).toHaveBeenLastCalledWith('r3');
    expect(refreshTokens).toHaveBeenCalledTimes(2);
  });

  it('schedules the refresh 5 minutes before expiry and prompts sign-in if it fails', async () => {
    refreshTokens.mockResolvedValue(false);
    renderAuth({ pd2Token: 't', pd2RefreshToken: 'r', pd2TokenExpiry: NOW + FIVE_MINUTES + 60_000 });

    await act(() => vi.advanceTimersByTimeAsync(59_999));
    expect(refreshTokens).not.toHaveBeenCalled();

    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(refreshTokens).toHaveBeenCalledExactlyOnceWith('r');
    expect(signInPrompts()).toBe(1);
  });

  it('cancels the scheduled refresh when the token changes or the hook unmounts', async () => {
    const { rerender, unmount } = renderAuth({
      pd2Token: 't',
      pd2RefreshToken: 'r',
      pd2TokenExpiry: NOW + FIVE_MINUTES + 60_000,
    });

    // New token with a later expiry replaces the old timer.
    options.settings = { pd2Token: 't2', pd2RefreshToken: 'r2', pd2TokenExpiry: NOW + FIVE_MINUTES + 120_000 };
    rerender();
    await act(() => vi.advanceTimersByTimeAsync(60_000));
    expect(refreshTokens).not.toHaveBeenCalled();

    unmount();
    await act(() => vi.advanceTimersByTimeAsync(10 * 60_000));
    expect(refreshTokens).not.toHaveBeenCalled();
  });

  it('never schedules a refresh without a refresh token', async () => {
    renderAuth({ pd2Token: 't', pd2TokenExpiry: NOW + FIVE_MINUTES + 1000 });
    await act(() => vi.advanceTimersByTimeAsync(60 * 60_000));
    expect(refreshTokens).not.toHaveBeenCalled();
  });
});
