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

const mainButton = () => screen.getByRole('button', { name: 'Open PD2 Chat' });
const tradeBadge = () => screen.queryByLabelText(/trade offers$/);

function hover(el: Element) {
  act(() => {
    fireEvent.mouseEnter(el);
  });
}

function unhover(el: Element) {
  act(() => {
    fireEvent.mouseLeave(el);
  });
}

describe('ChatButton', () => {
  it('opens chat from the main orb', () => {
    const handleClick = vi.fn();
    render(<ChatButton handleClick={handleClick} />);
    fireEvent.click(mainButton());
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('only renders fan buttons whose handlers are provided', () => {
    render(<ChatButton handleClick={vi.fn()}
      onSettingsClick={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Settings' })).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Trade Messages' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Manage Listings' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Disable Overlay' })).toBeNull();
  });

  it('shows no badges when counts are zero', () => {
    render(<ChatButton handleClick={vi.fn()}
      onTradeMessagesClick={vi.fn()} />);
    expect(screen.queryByLabelText(/unread messages$/)).toBeNull();
    expect(tradeBadge()).toBeNull();
  });

  it('shows the unread count and caps large counts at 99+', () => {
    const { rerender } = render(<ChatButton handleClick={vi.fn()}
      unreadCount={7} />);
    expect(screen.getByLabelText('7 unread messages').textContent).toBe('7');

    rerender(<ChatButton handleClick={vi.fn()}
      unreadCount={100} />);
    expect(screen.getByLabelText('100 unread messages').textContent).toBe('99+');
    rerender(<ChatButton handleClick={vi.fn()}
      unreadCount={99} />);
    expect(screen.getByLabelText('99 unread messages').textContent).toBe('99');
  });

  it('expands the fan on hover and collapses only after a short grace period', () => {
    render(<ChatButton handleClick={vi.fn()}
      onSettingsClick={vi.fn()} />);
    const settings = screen.getByRole('button', { name: 'Settings' });
    expect(settings.style.pointerEvents).toBe('none');
    expect(settings.style.opacity).toBe('0');

    hover(mainButton().parentElement!.parentElement!);
    expect(settings.style.pointerEvents).toBe('auto');
    expect(settings.style.opacity).toBe('1');

    unhover(mainButton().parentElement!.parentElement!);
    act(() => {
      vi.advanceTimersByTime(199);
    });
    expect(settings.style.pointerEvents).toBe('auto');
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(settings.style.pointerEvents).toBe('none');
  });

  it('re-entering during the grace period keeps the fan open', () => {
    render(<ChatButton handleClick={vi.fn()}
      onSettingsClick={vi.fn()} />);
    const cluster = mainButton().parentElement!.parentElement!;
    const settings = screen.getByRole('button', { name: 'Settings' });

    hover(cluster);
    unhover(cluster);
    act(() => {
      vi.advanceTimersByTime(100);
    });
    hover(cluster);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(settings.style.pointerEvents).toBe('auto');
  });

  it('moves the trade offers badge from the main orb to the trade button while expanded', async () => {
    render(<ChatButton handleClick={vi.fn()}
      onTradeMessagesClick={vi.fn()}
      tradeOffersCount={3} />);
    const tradeButton = screen.getByRole('button', { name: 'Trade Messages' });

    expect(tradeBadge()!.parentElement).toBe(mainButton().parentElement);

    hover(mainButton().parentElement!.parentElement!);
    // Let the collapsed-position badge finish its exit
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    expect(screen.queryAllByLabelText('3 trade offers')).toHaveLength(1);
    expect(tradeBadge()!.parentElement).toBe(tradeButton.parentElement);
  });

  it('hands the disable click to its handler (the page asks for confirmation)', () => {
    const onDisableClick = vi.fn();
    render(<ChatButton handleClick={vi.fn()}
      onDisableClick={onDisableClick} />);
    fireEvent.click(screen.getByRole('button', { name: 'Disable Overlay' }));
    expect(onDisableClick).toHaveBeenCalledTimes(1);
  });

  it('keeps only the orb interactive until the fan expands', () => {
    render(<ChatButton handleClick={vi.fn()}
      onSettingsClick={vi.fn()} />);
    const cluster = mainButton().parentElement!.parentElement!;
    expect(Array.from(document.querySelectorAll('[data-interactive="true"]'))).toEqual([cluster]);

    hover(cluster);
    expect(document.querySelectorAll('[data-interactive="true"]')).toHaveLength(2);
    expect(document.querySelector('[data-panel-drag]')).not.toBeNull();
  });

  it('routes fan buttons to their handlers', () => {
    const onSettingsClick = vi.fn();
    const onTradeMessagesClick = vi.fn();
    const onManageListingsClick = vi.fn();
    render(
      <ChatButton
        handleClick={vi.fn()}
        onSettingsClick={onSettingsClick}
        onTradeMessagesClick={onTradeMessagesClick}
        onManageListingsClick={onManageListingsClick}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Trade Messages' }));
    fireEvent.click(screen.getByRole('button', { name: 'Manage Listings' }));
    expect(onTradeMessagesClick).toHaveBeenCalledTimes(1);
    expect(onManageListingsClick).toHaveBeenCalledTimes(1);
    expect(onSettingsClick).not.toHaveBeenCalled();
  });
});
