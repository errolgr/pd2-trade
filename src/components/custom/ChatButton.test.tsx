// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MotionGlobalConfig } from 'framer-motion';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { INTERACTIVE_SELECTOR } from '@/overlay/region';
import { CHAT_DOCK_ITEMS } from '@/pages/chat/chat-dock';
import { ChatButton, PEEK_DELAY_MS } from './ChatButton';

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
});
afterAll(() => {
  MotionGlobalConfig.skipAnimations = false;
});

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const SIZE = { width: 40, height: 110 };
const caret = () => screen.getByRole('button', { name: 'More' });
const menu = () => screen.queryByRole('menu');
const dock = () => caret().closest('[data-interactive="true"]')!;

function renderDock(props: Partial<React.ComponentProps<typeof ChatButton>> = {}) {
  return render(
    <ChatButton
      size={SIZE}
      onChatClick={vi.fn()}
      onOffersClick={vi.fn()}
      order={CHAT_DOCK_ITEMS}
      favorites={['chat', 'offers']}
      {...props}
    />,
  );
}

/** The tab's own buttons, top to bottom (the caret last). */
const tabButtons = () =>
  Array.from(caret().parentElement!.querySelectorAll('button')).map((el) => el.getAttribute('aria-label'));

describe('ChatButton', () => {
  it('nothing opens on hover: the menu only opens from the caret', () => {
    renderDock({ onSettingsClick: vi.fn() });
    act(() => {
      fireEvent.pointerEnter(dock());
      fireEvent.mouseEnter(dock());
    });
    expect(menu()).toBeNull();

    fireEvent.click(caret());
    expect(menu()).not.toBeNull();
    expect(caret().getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(caret());
    expect(caret().getAttribute('aria-expanded')).toBe('false');
  });

  it('lists only the windows whose handlers are provided, with Disable apart at the end', () => {
    renderDock({ onSettingsClick: vi.fn(), onDisableClick: vi.fn() });
    fireEvent.click(caret());
    expect(screen.getAllByRole('menuitem').map((el) => el.textContent)).toEqual([
      'Chat',
      'Offers',
      'Settings',
      'Disable overlay',
    ]);
  });

  it('shows no badges when counts are zero and caps large counts at 99+', () => {
    const { rerender } = renderDock();
    expect(screen.queryByLabelText(/unread messages$/)).toBeNull();
    expect(screen.queryByLabelText(/trade offers$/)).toBeNull();

    rerender(
      <ChatButton
        size={SIZE}
        onChatClick={vi.fn()}
        onOffersClick={vi.fn()}
        order={CHAT_DOCK_ITEMS}
        favorites={['chat', 'offers']}
        unreadCount={100}
        tradeOffersCount={99}
      />,
    );
    expect(screen.getByLabelText('100 unread messages').textContent).toBe('99+');
    expect(screen.getByLabelText('99 trade offers').textContent).toBe('99');
  });

  it('shows the favorites on the tab in menu order, skipping ones without a handler', () => {
    renderDock({ favorites: ['settings', 'market', 'chat'], onSettingsClick: vi.fn() });
    expect(tabButtons()).toEqual(['Open PD2 Chat', 'Settings', 'More']);
  });

  it('with no favorites the tab is only the caret, and the menu still opens every window', () => {
    const onChatClick = vi.fn();
    renderDock({ favorites: [], onChatClick });
    expect(tabButtons()).toEqual(['More']);
    fireEvent.click(caret());
    fireEvent.click(screen.getByRole('menuitem', { name: 'Chat' }));
    expect(onChatClick).toHaveBeenCalledTimes(1);
  });

  it('stars and unstars windows from the menu, keeping it open', () => {
    const onFavoritesChange = vi.fn();
    renderDock({ onSettingsClick: vi.fn(), onFavoritesChange });
    fireEvent.click(caret());
    const star = (name: string) => screen.getByRole('menuitemcheckbox', { name: `Favorite ${name}` });
    expect(star('Chat').getAttribute('aria-checked')).toBe('true');
    expect(star('Settings').getAttribute('aria-checked')).toBe('false');

    fireEvent.click(star('Settings'));
    expect(onFavoritesChange).toHaveBeenLastCalledWith(['chat', 'offers', 'settings']);
    fireEvent.click(star('Chat'));
    expect(onFavoritesChange).toHaveBeenLastCalledWith(['offers']);
    expect(menu()).not.toBeNull();
  });

  it('has no stars or grips when the layout cannot be changed', () => {
    renderDock({ onSettingsClick: vi.fn() });
    fireEvent.click(caret());
    expect(screen.queryAllByRole('menuitemcheckbox')).toEqual([]);
    expect(screen.queryByRole('button', { name: 'Move Chat' })).toBeNull();
  });

  it('moves a row with the arrow keys on its grip; the menu and the tab follow, hidden windows keep their slot', () => {
    const onOrderChange = vi.fn();
    renderDock({ onSettingsClick: vi.fn(), onOrderChange });
    fireEvent.click(caret());

    fireEvent.keyDown(screen.getByRole('button', { name: 'Move Offers' }), { key: 'ArrowUp' });
    // Offers swaps with Chat (the shown row above it); market…stashValue have no handler and stay put
    expect(onOrderChange).toHaveBeenLastCalledWith([
      'offers',
      'market',
      'builds',
      'netWorth',
      'stashValue',
      'chat',
      'manageListings',
      'settings',
    ]);
    expect(screen.getAllByRole('menuitem').map((el) => el.textContent)).toEqual(['Offers', 'Chat', 'Settings']);
    expect(tabButtons()).toEqual(['Offers', 'Open PD2 Chat', 'More']);

    // Already first: nothing to save
    onOrderChange.mockClear();
    fireEvent.keyDown(screen.getByRole('button', { name: 'Move Offers' }), { key: 'ArrowUp' });
    expect(onOrderChange).not.toHaveBeenCalled();
    expect(menu()).not.toBeNull();
  });

  it.each([false, true])('the open menu is in the click region itself (menuBelow %s)', (menuBelow) => {
    // It overflows the tab's box, so the tab's rect alone leaves it outside the OS region (invisible, click-through)
    renderDock({ onSettingsClick: vi.fn(), menuBelow });
    fireEvent.click(caret());
    expect(menu()!.matches(INTERACTIVE_SELECTOR)).toBe(true);
  });

  it('closes the open menu after the pointer stays out for the grace period, not when it comes back in time', () => {
    renderDock({ onSettingsClick: vi.fn() });
    fireEvent.click(caret());

    act(() => {
      fireEvent.pointerLeave(dock());
      vi.advanceTimersByTime(300);
      fireEvent.pointerEnter(dock());
      vi.advanceTimersByTime(1000);
    });
    expect(menu()).not.toBeNull();

    act(() => {
      fireEvent.pointerLeave(dock());
      vi.advanceTimersByTime(400);
    });
    expect(caret().getAttribute('aria-expanded')).toBe('false');
  });
});

describe('ChatButton peek', () => {
  const peekText = () => screen.queryByText('peek content');
  // The exit animation runs on real frames: finish it on real timers
  const expectClosed = async () => {
    vi.useRealTimers();
    await waitFor(() => expect(peekText()).toBeNull());
  };
  const renderPeek = () =>
    renderDock({
      onSettingsClick: vi.fn(),
      peek: (close) => (
        <button type="button"
          onClick={close}>
          peek content
        </button>
      ),
    });
  const hover = (ms = PEEK_DELAY_MS) =>
    act(() => {
      fireEvent.pointerEnter(dock());
      vi.advanceTimersByTime(ms);
    });
  const tab = () => caret().parentElement!;

  it('opens only after the pointer rests PEEK_DELAY_MS, in its own interactive rect', () => {
    renderPeek();
    hover(PEEK_DELAY_MS - 1);
    expect(peekText()).toBeNull();
    act(() => vi.advanceTimersByTime(1));
    const rect = peekText()!.closest(INTERACTIVE_SELECTOR);
    expect(rect).not.toBeNull();
    expect(rect).not.toBe(dock());
  });

  it('without a peek nothing opens on hover', () => {
    renderDock();
    hover(5000);
    expect(dock().querySelectorAll(INTERACTIVE_SELECTOR)).toHaveLength(0);
  });

  it('a quick pass over the tab never opens it', () => {
    renderPeek();
    act(() => {
      fireEvent.pointerEnter(dock());
      vi.advanceTimersByTime(PEEK_DELAY_MS - 100);
      fireEvent.pointerLeave(dock());
      vi.advanceTimersByTime(5000);
    });
    expect(peekText()).toBeNull();
  });

  it('pressing the tab cancels a pending peek and closes an open one', async () => {
    renderPeek();
    act(() => {
      fireEvent.pointerEnter(dock());
      vi.advanceTimersByTime(300);
      fireEvent.pointerDown(tab(), { button: 0 });
      vi.advanceTimersByTime(5000);
    });
    expect(peekText()).toBeNull();

    act(() => {
      fireEvent.pointerLeave(dock());
    });
    hover();
    expect(peekText()).not.toBeNull();
    act(() => {
      fireEvent.pointerDown(tab(), { button: 0 });
    });
    await expectClosed();
  });

  it('opening the menu hides it', async () => {
    renderPeek();
    hover();
    expect(peekText()).not.toBeNull();
    fireEvent.click(caret());
    expect(menu()).not.toBeNull();
    await expectClosed();
  });

  it('closes after the leave grace, not when the pointer comes back in time', async () => {
    renderPeek();
    hover();
    act(() => {
      fireEvent.pointerLeave(dock());
      vi.advanceTimersByTime(300);
      fireEvent.pointerEnter(dock());
      vi.advanceTimersByTime(1000);
    });
    expect(peekText()).not.toBeNull();

    act(() => {
      fireEvent.pointerLeave(dock());
      vi.advanceTimersByTime(399);
    });
    expect(peekText()).not.toBeNull();
    act(() => vi.advanceTimersByTime(1));
    await expectClosed();
  });

  it('the render prop gets a close that closes it', async () => {
    renderPeek();
    hover();
    fireEvent.click(screen.getByText('peek content'));
    await expectClosed();
  });
});
