// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MotionGlobalConfig } from 'framer-motion';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  confirmToast,
  setBadgeCount,
  showToast,
  useOverlay,
  type ConfirmToastOptions,
  type OverlayApi,
} from '@/overlay';
import type * as Overlay from '@/overlay';
import { useOptions } from '@/hooks/useOptions';
import ChatButtonPage from './ChatButtonPage';

vi.mock('@/overlay', async (importOriginal) => ({
  ...(await importOriginal<typeof Overlay>()),
  showToast: vi.fn(),
  confirmToast: vi.fn(),
  useOverlay: vi.fn(),
}));
vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
});
afterAll(() => {
  MotionGlobalConfig.skipAnimations = false;
});

const updateSettings = vi.fn();
const overlay = { openPanel: vi.fn(), togglePanel: vi.fn() };

beforeEach(() => {
  vi.clearAllMocks();
  updateSettings.mockResolvedValue(undefined);
  vi.mocked(useOptions).mockImplementation(() => ({ updateSettings }) as never);
  vi.mocked(useOverlay).mockImplementation(() => overlay as unknown as OverlayApi);
});

afterEach(() => {
  cleanup();
  act(() => {
    setBadgeCount('chatUnread', 0);
    setBadgeCount('whisperTrades', 0);
    setBadgeCount('tradeOffers', 0);
  });
});

describe('ChatButtonPage', () => {
  it('shows the unread chat badge count', async () => {
    render(<ChatButtonPage />);
    expect(screen.queryByLabelText(/unread messages$/)).toBeNull();

    act(() => setBadgeCount('chatUnread', 4));
    expect(screen.getByLabelText('4 unread messages').textContent).toBe('4');

    // let the badge finish its exit animation
    await act(async () => setBadgeCount('chatUnread', 0));
    await waitFor(() => expect(screen.queryByLabelText(/unread messages$/)).toBeNull());
  });

  it('sums whisper and website offer badges into one trade badge, each source replacing its own share', () => {
    render(<ChatButtonPage />);
    act(() => setBadgeCount('whisperTrades', 2));
    expect(screen.getByLabelText('2 trade offers')).not.toBeNull();

    act(() => setBadgeCount('tradeOffers', 4));
    expect(screen.getByLabelText('6 trade offers')).not.toBeNull();

    act(() => setBadgeCount('whisperTrades', 0));
    expect(screen.getByLabelText('4 trade offers')).not.toBeNull();
  });

  it('asks for confirmation before disabling the overlay, then disables it and notifies the user', async () => {
    const order: string[] = [];
    updateSettings.mockImplementation(async (s: unknown) => {
      order.push(`update ${JSON.stringify(s)}`);
    });
    vi.mocked(showToast).mockImplementation(() => {
      order.push('showToast');
    });
    render(<ChatButtonPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Disable Overlay' }));
    expect(confirmToast).toHaveBeenCalledTimes(1);
    expect(updateSettings).not.toHaveBeenCalled();

    const options = vi.mocked(confirmToast).mock.calls[0][0] as ConfirmToastOptions;
    expect(options).toMatchObject({ title: 'Disable Chat Button Overlay?', confirmLabel: 'Disable' });
    await act(async () => {
      await options.onConfirm();
    });
    expect(order).toEqual(['update {"chatButtonOverlayEnabled":false}', 'showToast']);
  });

  it.each([
    ['Open PD2 Chat', 'togglePanel', ['chat']],
    ['Settings', 'openPanel', ['settings']],
    // Offers: chat on the Selling filter
    ['Offers', 'openPanel', ['chat', { filter: 'selling' }]],
    // keepPayload: an open quick list keeps the item being listed
    ['Manage Listings', 'openPanel', ['quickList', undefined, { placement: 'gameCenter', keepPayload: true }]],
  ] as const)('%s calls %s', (name, method, args) => {
    render(<ChatButtonPage />);
    fireEvent.click(screen.getByRole('button', { name }));
    expect(overlay[method].mock.calls).toEqual([args]);
  });
});
