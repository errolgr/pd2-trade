// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MotionGlobalConfig } from 'framer-motion';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatButton } from './ChatButton';

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
  return render(<ChatButton size={SIZE}
    onChatClick={vi.fn()}
    onOffersClick={vi.fn()}
    {...props} />);
}

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
      <ChatButton size={SIZE}
        onChatClick={vi.fn()}
        onOffersClick={vi.fn()}
        unreadCount={100}
        tradeOffersCount={99} />,
    );
    expect(screen.getByLabelText('100 unread messages').textContent).toBe('99+');
    expect(screen.getByLabelText('99 trade offers').textContent).toBe('99');
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
