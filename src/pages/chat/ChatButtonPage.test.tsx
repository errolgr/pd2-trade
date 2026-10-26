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
import { setChatDockOffset } from './chat-dock';
import { publishChatFeed, provideChatFeedActions, resetChatFeed, type FeedItem } from './chat-feed';
import { PEEK_DELAY_MS } from '@/components/custom/ChatButton';

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
// A 1920x1080 game: the dock is 43x118, flush on the right edge, 9px above the bottom (x 1877, y 953)
const overlay = { openPanel: vi.fn(), togglePanel: vi.fn(), gameRect: { x: 0, y: 0, width: 1920, height: 1080 } };

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
    setChatDockOffset(0.008);
  });
  localStorage.clear();
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

    fireEvent.click(screen.getByRole('button', { name: 'More' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Disable overlay' }));
    expect(confirmToast).toHaveBeenCalledTimes(1);
    expect(updateSettings).not.toHaveBeenCalled();

    const options = vi.mocked(confirmToast).mock.calls[0][0] as ConfirmToastOptions;
    expect(options).toMatchObject({ title: 'Disable Chat Button Overlay?', confirmLabel: 'Disable' });
    await act(async () => {
      await options.onConfirm();
    });
    expect(order).toEqual(['update {"chatButtonOverlayEnabled":false}', 'showToast']);
  });

  it('opens chat from the pill, on the newest unread thread when there is one', () => {
    render(<ChatButtonPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Open PD2 Chat' }));
    act(() => setBadgeCount('chatUnread', 2));
    fireEvent.click(screen.getByRole('button', { name: 'Open PD2 Chat' }));
    expect(overlay.togglePanel.mock.calls).toEqual([['chat'], ['chat', { newestUnread: true }]]);
  });

  it.each([
    ['Market browser', ['market']],
    ['Builds', ['builds']],
    // Beside the dock: right edges aligned, above it (no room below)
    ['Net worth', ['netWorthPanel', undefined, { placement: { x: 1560, y: 525 } }]],
    ['Stash value', ['currency']],
    // Offers: chat on the Selling filter
    ['Offers', ['chat', { filter: 'selling' }]],
    // keepPayload: an open quick list keeps the item being listed
    ['Manage listings', ['quickList', undefined, { placement: 'gameCenter', keepPayload: true }]],
    ['Settings', ['settings']],
  ] as const)('menu: %s opens its window and closes the menu', (name, args) => {
    render(<ChatButtonPage />);
    fireEvent.click(screen.getByRole('button', { name: 'More' }));
    fireEvent.click(screen.getByRole('menuitem', { name }));
    expect(overlay.openPanel.mock.calls).toEqual([args]);
    expect(screen.getByRole('button', { name: 'More' }).getAttribute('aria-expanded')).toBe('false');
  });

  it('slides along the edge when dragged, saves the spot on release, and the drag does not click', () => {
    render(<ChatButtonPage />);
    const tab = screen.getByTitle('Drag to move');
    const dock = () => tab.closest<HTMLElement>('.absolute.right-0')!;
    expect(dock().style.top).toBe('953px');

    fireEvent.pointerDown(tab, { button: 0, clientY: 1000, pointerId: 1 });
    fireEvent.pointerMove(tab, { clientY: 900, pointerId: 1 });
    expect(dock().style.top).toBe('853px');
    expect(localStorage.getItem('pd2-chat-dock-offset-v1')).toBeNull(); // saved on release only

    // Dragged past the top: stops with the tab inside the game
    fireEvent.pointerMove(tab, { clientY: -2000, pointerId: 1 });
    expect(dock().style.top).toBe('0px');
    fireEvent.pointerUp(tab, { pointerId: 1 });
    fireEvent.click(screen.getByRole('button', { name: 'Open PD2 Chat' }));
    expect(overlay.togglePanel).not.toHaveBeenCalled();
    expect(Number(localStorage.getItem('pd2-chat-dock-offset-v1'))).toBeCloseTo(1 - 118 / 1080);

    // Near the top the menu opens below the tab
    fireEvent.click(screen.getByRole('button', { name: 'More' }));
    expect(screen.getByRole('menu').className).toContain('top-full');
  });
});

const item = (n: number, over: Partial<FeedItem> = {}): FeedItem => ({
  key: `k${n}`,
  kind: 'message',
  name: `Trader${n}`,
  at: n * 1000,
  open: { threadId: `whisper:t${n}` },
  ...over,
});

function provideActions() {
  const actions = { markAllRead: vi.fn(), seeOffers: vi.fn() };
  provideChatFeedActions(actions);
  return actions;
}

describe('ChatButtonPage feed', () => {
  afterEach(() => resetChatFeed());

  it('Offers lands on Buying for an accepted offer and marks offers seen', () => {
    const actions = provideActions();
    publishChatFeed({ items: [item(1, { kind: 'offerAccepted', open: { filter: 'buying' } })], canMarkAllRead: false });
    render(<ChatButtonPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Offers' }));
    expect(overlay.openPanel.mock.calls).toEqual([['chat', { filter: 'buying' }]]);
    expect(actions.seeOffers).toHaveBeenCalledTimes(1);
  });

  it("Offers lands on a single trade whisper's thread", () => {
    provideActions();
    publishChatFeed({ items: [item(1, { kind: 'trade', open: { threadId: 'whisper:bob' } })], canMarkAllRead: false });
    render(<ChatButtonPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Offers' }));
    expect(overlay.openPanel.mock.calls).toEqual([['chat', { threadId: 'whisper:bob' }]]);
  });

  it('Offers with nothing new lands on Selling', () => {
    render(<ChatButtonPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Offers' }));
    expect(overlay.openPanel.mock.calls).toEqual([['chat', { filter: 'selling' }]]);
  });

  describe('peek', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    const peek = () => screen.queryByRole('group', { name: "What's new" });
    const hover = () =>
      act(() => {
        fireEvent.pointerEnter(screen.getByRole('button', { name: 'Offers' }).closest('[data-interactive]')!);
        vi.advanceTimersByTime(PEEK_DELAY_MS);
      });
    const six = () => [6, 5, 4, 3, 2, 1].map((n) => item(n));

    it('lists the 5 newest items, newest first', () => {
      publishChatFeed({ items: six(), canMarkAllRead: true });
      render(<ChatButtonPage />);
      hover();
      const buttons = peek()!.querySelectorAll('li button');
      expect(buttons).toHaveLength(5);
      expect([...buttons].map((b) => b.textContent)).toEqual(
        [6, 5, 4, 3, 2].map((n) => expect.stringContaining(`Trader${n}`)),
      );
      expect(screen.queryByText('Trader1')).toBeNull();
    });

    it('clicking an item opens it and closes the peek', async () => {
      publishChatFeed({ items: six(), canMarkAllRead: true });
      render(<ChatButtonPage />);
      hover();
      fireEvent.click(screen.getByText('Trader5'));
      expect(overlay.openPanel.mock.calls).toEqual([['chat', { threadId: 'whisper:t5' }]]);
      // the exit animation runs on real frames
      vi.useRealTimers();
      await waitFor(() => expect(peek()).toBeNull());
    });

    it('Mark all read calls the provided action, disabled when there is nothing to mark', () => {
      const actions = provideActions();
      publishChatFeed({ items: six(), canMarkAllRead: true });
      render(<ChatButtonPage />);
      hover();
      fireEvent.click(screen.getByRole('button', { name: 'Mark all read' }));
      expect(actions.markAllRead).toHaveBeenCalledTimes(1);

      act(() => publishChatFeed({ items: six(), canMarkAllRead: false }));
      expect((screen.getByRole('button', { name: 'Mark all read' }) as HTMLButtonElement).disabled).toBe(true);
    });

    it('Open chat opens chat, on the newest unread with unread messages', () => {
      render(<ChatButtonPage />);
      hover();
      fireEvent.click(screen.getByRole('button', { name: 'Open chat' }));
      act(() => setBadgeCount('chatUnread', 3));
      hover();
      fireEvent.click(screen.getByRole('button', { name: 'Open chat' }));
      expect(overlay.openPanel.mock.calls).toEqual([
        ['chat', undefined],
        ['chat', { newestUnread: true }],
      ]);
    });

    it("an empty feed shows You're all caught up", () => {
      render(<ChatButtonPage />);
      hover();
      expect(screen.getByText("You're all caught up")).not.toBeNull();
    });
  });
});
