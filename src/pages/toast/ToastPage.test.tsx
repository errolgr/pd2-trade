// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { isTauri } from '@tauri-apps/api/core';
import { emit, listen } from '@/lib/browser-events';
import { openUrl } from '@/lib/browser-opener';
import { installUpdateAndRelaunch } from '@/lib/updater';
import { ToastActionType } from '@/common/types/Events';
import ToastPage from './ToastPage';

vi.mock('@tauri-apps/api/core', () => ({ isTauri: vi.fn(() => true), invoke: vi.fn() }));
vi.mock('@/lib/browser-events', () => ({ emit: vi.fn(), listen: vi.fn() }));
vi.mock('@/lib/browser-opener', () => ({ openUrl: vi.fn() }));
vi.mock('@/lib/updater', () => ({ installUpdateAndRelaunch: vi.fn() }));
vi.mock('@/lib/themes', () => ({ useThemeMode: () => 'dark' }));
const win = { show: vi.fn(async () => {}), hide: vi.fn(async () => {}) };
vi.mock('@/lib/browser-webview', () => ({ getCurrentWebviewWindow: () => win }));

type Handler = (event: { payload: unknown }) => unknown;
let handlers: Map<string, Handler>;
let unlistened: string[];

async function fire(event: string, payload?: unknown) {
  const handler = handlers.get(event);
  if (!handler) throw new Error(`no listener for ${event}`);
  await act(async () => {
    await handler({ payload });
  });
  // Let sonner mount the toast
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

async function click(el: HTMLElement) {
  await act(async () => {
    fireEvent.click(el);
  });
  await advance(0);
}

function toastEl(title: string): HTMLElement | null {
  return screen.queryByText(title)?.closest('[data-sonner-toast]') ?? null;
}

async function renderPage() {
  const view = render(<ToastPage />);
  await advance(0);
  return view;
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: false });
  handlers = new Map();
  unlistened = [];
  win.show.mockClear();
  win.hide.mockClear();
  vi.mocked(listen).mockImplementation(async (event: string, cb: Handler) => {
    handlers.set(event, cb);
    return () => unlistened.push(event);
  });
  vi.mocked(emit).mockResolvedValue(undefined);
  vi.mocked(openUrl).mockResolvedValue(undefined);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(async () => {
  act(() => {
    toast.dismiss();
  });
  await advance(1000);
  cleanup();
  vi.useRealTimers();
});

describe('ToastPage toast-event', () => {
  it('shows a plain string payload as a PD2 Trader toast and reveals the window', async () => {
    await renderPage();
    await fire('toast-event', 'Listing bumped');

    const el = toastEl('Listing bumped');
    expect(el?.textContent).toContain('PD2 Trader');
    expect(win.show).toHaveBeenCalledTimes(1);
  });

  it('does not touch the window outside Tauri', async () => {
    vi.mocked(isTauri).mockReturnValue(false);
    await renderPage();
    await fire('toast-event', 'Browser toast');

    expect(toastEl('Browser toast')).not.toBeNull();
    expect(win.show).not.toHaveBeenCalled();
  });

  it.each([
    ['error', 'error'],
    ['success', 'success'],
    ['warning', 'warning'],
    [undefined, null],
  ] as const)('renders generic variant %s with toast type %s', async (variant, type) => {
    await renderPage();
    await fire('toast-event', { title: 'Sync', description: `variant ${variant}`, variant });

    const el = toastEl(`variant ${variant}`);
    expect(el?.getAttribute('data-type')).toBe(type);
    expect(el?.textContent).toContain('Sync');
  });

  it('falls back to the PD2 Trader title when a generic payload has none', async () => {
    await renderPage();
    await fire('toast-event', { description: 'untitled' });
    expect(toastEl('untitled')?.textContent).toContain('PD2 Trader');
  });

  it('stacks multiple toasts and dismisses one via its close button', async () => {
    await renderPage();
    await fire('toast-event', 'first');
    await fire('toast-event', 'second');
    expect(toastEl('first')).not.toBeNull();
    expect(toastEl('second')).not.toBeNull();

    const close = toastEl('first')!.querySelector<HTMLElement>('[data-close-button]')!;
    await click(close);
    await advance(1000);

    expect(toastEl('first')).toBeNull();
    expect(toastEl('second')).not.toBeNull();
    expect(win.hide).toHaveBeenCalled();
  });

  it('auto-closes after the requested duration and hides the window', async () => {
    await renderPage();
    await fire('toast-event', { title: 'Short', description: 'brief', duration: 1000 });
    expect(toastEl('brief')).not.toBeNull();

    await advance(1500);
    expect(toastEl('brief')).toBeNull();
    expect(win.hide).toHaveBeenCalled();
  });

  it('ignores null payloads', async () => {
    await renderPage();
    await fire('toast-event', null);
    expect(document.querySelector('[data-sonner-toast]')).toBeNull();
  });
});

describe('ToastPage action toasts', () => {
  it('opens the market listing from the action button, dismisses the toast and hides the window', async () => {
    await renderPage();
    await fire('toast-event', {
      title: 'New offer',
      description: 'Shako 2 ist',
      action: { label: 'View', type: ToastActionType.OPEN_MARKET_LISTING, data: { listingId: 'abc123' } },
    });

    await click(screen.getByText('View'));
    await advance(1000);

    expect(vi.mocked(openUrl)).toHaveBeenCalledWith('https://www.projectdiablo2.com/market/listing/abc123');
    expect(win.hide).toHaveBeenCalled();
    expect(toastEl('Shako 2 ist')).toBeNull();
  });

  it('falls back to window.open when the opener fails', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    vi.mocked(openUrl).mockRejectedValue(new Error('no opener'));
    await renderPage();
    await fire('toast-event', {
      description: 'offer',
      action: { label: 'View', type: ToastActionType.OPEN_MARKET_LISTING, data: { listingId: 'abc123' } },
    });

    await click(screen.getByText('View'));

    expect(open).toHaveBeenCalledWith('https://www.projectdiablo2.com/market/listing/abc123', '_blank');
  });

  it('does nothing for a market listing action without a listing id', async () => {
    await renderPage();
    await fire('toast-event', {
      description: 'offer',
      action: { label: 'View', type: ToastActionType.OPEN_MARKET_LISTING, data: {} },
    });

    await click(screen.getByText('View'));

    expect(vi.mocked(openUrl)).not.toHaveBeenCalled();
  });

  it('opens the chat conversation from the action button', async () => {
    await renderPage();
    await fire('toast-event', {
      title: 'New message',
      description: 'hi there',
      action: { label: 'Reply', type: ToastActionType.OPEN_CHAT_CONVERSATION, data: { conversationId: 'c1' } },
    });

    await click(screen.getByText('Reply'));

    expect(vi.mocked(emit)).toHaveBeenCalledWith('toggle-chat-window', { conversationId: 'c1' });
    expect(win.hide).toHaveBeenCalled();
  });

  it('installs the update from the action button', async () => {
    await renderPage();
    await fire('toast-event', {
      title: 'Update available',
      description: 'v2',
      action: { label: 'Install', type: ToastActionType.UPDATE_AVAILABLE },
    });

    await click(screen.getByText('Install'));

    expect(vi.mocked(installUpdateAndRelaunch)).toHaveBeenCalledTimes(1);
  });

  it('treats an object with a falsy action as a plain PD2 Trader toast', async () => {
    await renderPage();
    await fire('toast-event', { title: 'Ignored title', description: 'no action', action: undefined });

    const el = toastEl('no action');
    expect(el?.textContent).toContain('PD2 Trader');
    expect(el?.textContent).not.toContain('Ignored title');
    expect(el?.querySelector('[data-button]')).toBeNull();
  });
});

describe('ToastPage confirmation toasts', () => {
  it('emits confirm-disable-overlay when Disable is clicked, then hides the window after the fade', async () => {
    await renderPage();
    await fire('toast-confirm-disable-overlay');
    expect(toastEl('Disable Chat Button Overlay?')).not.toBeNull();

    await click(screen.getByText('Disable'));
    expect(vi.mocked(emit)).toHaveBeenCalledWith('confirm-disable-overlay');
    expect(win.hide).not.toHaveBeenCalled();

    await advance(500);
    expect(win.hide).toHaveBeenCalled();
    await advance(500);
    expect(toastEl('Disable Chat Button Overlay?')).toBeNull();
  });

  it('cancelling the disable confirmation does not disable the overlay', async () => {
    await renderPage();
    await fire('toast-confirm-disable-overlay');

    await click(screen.getByText('Cancel'));
    await advance(1000);

    expect(vi.mocked(emit)).not.toHaveBeenCalledWith('confirm-disable-overlay');
    expect(toastEl('Disable Chat Button Overlay?')).toBeNull();
    expect(win.hide).toHaveBeenCalled();
  });

  it('names the item in the delete confirmation and emits the listing id on Delete', async () => {
    await renderPage();
    await fire('toast-confirm-delete-listing', { listingId: 'L1', itemName: 'Shako' });

    expect(screen.queryByText('Are you sure you want to delete the listing for Shako?')).not.toBeNull();
    expect(toastEl('Delete Listing?')?.getAttribute('data-type')).toBe('warning');

    await click(screen.getByText('Delete'));
    expect(vi.mocked(emit)).toHaveBeenCalledWith('confirm-delete-listing', { listingId: 'L1' });
  });

  it('uses a generic delete description when no item name is given', async () => {
    await renderPage();
    await fire('toast-confirm-delete-listing', { listingId: 'L1' });
    expect(screen.queryByText('Are you sure you want to delete this listing?')).not.toBeNull();
  });

  it('keeps the window visible until every open confirmation is resolved', async () => {
    await renderPage();
    await fire('toast-confirm-delete-listing', { listingId: 'L1', itemName: 'Shako' });
    await fire('toast-confirm-delete-listing', { listingId: 'L2', itemName: 'Arach' });

    const first = toastEl('Are you sure you want to delete the listing for Shako?')!;
    await click(first.querySelector<HTMLElement>('[data-cancel]')!);
    await advance(1000);
    expect(win.hide).not.toHaveBeenCalled();

    const second = toastEl('Are you sure you want to delete the listing for Arach?')!;
    await click(second.querySelector<HTMLElement>('[data-cancel]')!);
    await advance(500);
    expect(win.hide).toHaveBeenCalled();
  });

  it('a new confirmation within the fade-out delay keeps the window open', async () => {
    await renderPage();
    await fire('toast-confirm-disable-overlay');
    await click(screen.getByText('Cancel'));

    await advance(200);
    await fire('toast-confirm-delete-listing', { listingId: 'L1' });
    await advance(400);

    expect(win.hide).not.toHaveBeenCalled();
    expect(screen.queryByText('Delete Listing?')).not.toBeNull();
  });
});

describe('ToastPage lifecycle', () => {
  it('unsubscribes every listener on unmount', async () => {
    const view = await renderPage();
    view.unmount();
    await advance(0);
    expect(unlistened.sort()).toEqual(['toast-confirm-delete-listing', 'toast-confirm-disable-overlay', 'toast-event']);
  });
});
