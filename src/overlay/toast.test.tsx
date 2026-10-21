// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { openUrl } from '@/lib/browser-opener';
import { installUpdateAndRelaunch } from '@/lib/updater';
import { ToastActionType } from '@/common/types/Events';
import { ToastLayer, confirmToast, setToastBridge, showToast, undoToast } from './toast';

vi.mock('@tauri-apps/api/core', () => ({ isTauri: vi.fn(() => false), invoke: vi.fn() }));
vi.mock('@/lib/browser-opener', () => ({ openUrl: vi.fn() }));
vi.mock('@/lib/updater', () => ({ installUpdateAndRelaunch: vi.fn() }));
vi.mock('@/lib/themes', () => ({ useThemeMode: () => 'dark' }));
const overlay = vi.hoisted(() => ({ gameFocused: true }));
vi.mock('./OverlayProvider', () => ({
  useOverlay: () => ({ gameRect: { x: 100, y: 50, width: 1280, height: 720 }, gameFocused: overlay.gameFocused }),
}));

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

/** showToast/confirmToast, then let sonner mount the toast. */
async function show(fn: () => void) {
  act(fn);
  await advance(0);
}

async function click(el: HTMLElement) {
  await act(async () => {
    fireEvent.click(el);
  });
  await advance(0);
}

const toastEl = (text: string): HTMLElement | null => screen.queryByText(text)?.closest('[data-sonner-toast]') ?? null;

async function renderLayer() {
  const view = render(<ToastLayer />);
  await advance(0);
  return view;
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: false });
  vi.clearAllMocks();
  vi.mocked(openUrl).mockResolvedValue(undefined);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  window.innerWidth = 1920;
  window.innerHeight = 1080;
  overlay.gameFocused = true;
});

afterEach(async () => {
  act(() => {
    toast.dismiss();
  });
  await advance(1000);
  cleanup();
  setToastBridge(null);
  vi.useRealTimers();
});

describe('ToastLayer', () => {
  it('pins the toaster to the bottom-right corner of the game rect', async () => {
    await renderLayer();
    await show(() => showToast('hello'));
    const toaster = document.querySelector<HTMLElement>('[data-sonner-toaster]')!;
    // right = 1920 - (100 + 1280) + 16, bottom = 1080 - (50 + 720) + 16
    expect(toaster.style.getPropertyValue('--offset-right')).toBe('556px');
    expect(toaster.style.getPropertyValue('--offset-bottom')).toBe('326px');
  });

  it('outside the game, pins it to the bottom-right corner of the screen instead', async () => {
    overlay.gameFocused = false;
    await renderLayer();
    await show(() => showToast('hello'));
    const toaster = document.querySelector<HTMLElement>('[data-sonner-toaster]')!;
    expect(toaster.style.getPropertyValue('--offset-right')).toBe('16px');
    expect(toaster.style.getPropertyValue('--offset-bottom')).toBe('16px');
  });
});

describe('showToast', () => {
  it('shows a plain string payload as a PD2 Trader toast', async () => {
    await renderLayer();
    await show(() => showToast('Listing bumped'));
    expect(toastEl('Listing bumped')?.textContent).toContain('PD2 Trader');
  });

  it.each([
    ['error', 'error'],
    ['success', 'success'],
    ['warning', 'warning'],
    ['info', 'info'],
    [undefined, null],
  ] as const)('renders generic variant %s with toast type %s', async (variant, type) => {
    await renderLayer();
    await show(() => showToast({ title: 'Sync', description: `variant ${variant}`, variant }));
    const el = toastEl(`variant ${variant}`);
    expect(el?.getAttribute('data-type')).toBe(type);
    expect(el?.textContent).toContain('Sync');
  });

  it('falls back to the PD2 Trader title when a generic payload has none', async () => {
    await renderLayer();
    await show(() => showToast({ description: 'untitled' }));
    expect(toastEl('untitled')?.textContent).toContain('PD2 Trader');
  });

  it('stacks multiple toasts and dismisses one via its close button', async () => {
    await renderLayer();
    await show(() => showToast('first'));
    await show(() => showToast('second'));
    await click(toastEl('first')!.querySelector<HTMLElement>('[data-close-button]')!);
    await advance(1000);
    expect(toastEl('first')).toBeNull();
    expect(toastEl('second')).not.toBeNull();
  });

  it('auto-closes after the requested duration', async () => {
    await renderLayer();
    await show(() => showToast({ title: 'Short', description: 'brief', duration: 1000 }));
    expect(toastEl('brief')).not.toBeNull();
    await advance(1500);
    expect(toastEl('brief')).toBeNull();
  });

  it('ignores null payloads', async () => {
    await renderLayer();
    await show(() => showToast(null as never));
    expect(document.querySelector('[data-sonner-toast]')).toBeNull();
  });
});

describe('showToast action toasts', () => {
  it('opens the market listing from the action button and dismisses the toast', async () => {
    await renderLayer();
    await show(() =>
      showToast({
        title: 'New offer',
        description: 'Shako 2 ist',
        action: { label: 'View', type: ToastActionType.OPEN_MARKET_LISTING, data: { listingId: 'abc123' } },
      }),
    );
    await click(screen.getByText('View'));
    await advance(1000);
    expect(openUrl).toHaveBeenCalledWith('https://www.projectdiablo2.com/market/listing/abc123');
    expect(toastEl('Shako 2 ist')).toBeNull();
  });

  it('falls back to window.open when the opener fails', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    vi.mocked(openUrl).mockRejectedValue(new Error('no opener'));
    await renderLayer();
    await show(() =>
      showToast({
        description: 'offer',
        action: { label: 'View', type: ToastActionType.OPEN_MARKET_LISTING, data: { listingId: 'abc123' } },
      }),
    );
    await click(screen.getByText('View'));
    expect(open).toHaveBeenCalledWith('https://www.projectdiablo2.com/market/listing/abc123', '_blank');
  });

  it('does nothing for a market listing action without a listing id', async () => {
    await renderLayer();
    await show(() =>
      showToast({
        description: 'offer',
        action: { label: 'View', type: ToastActionType.OPEN_MARKET_LISTING, data: {} },
      }),
    );
    await click(screen.getByText('View'));
    expect(openUrl).not.toHaveBeenCalled();
  });

  it('Reply opens chat on the conversation or whisper thread with the composer focused', async () => {
    const openChat = vi.fn();
    setToastBridge({ openChat, openMarket: vi.fn() });
    await renderLayer();
    await show(() =>
      showToast({
        title: 'New message',
        description: 'hi there',
        action: { label: 'Reply', type: ToastActionType.OPEN_CHAT_CONVERSATION, data: { conversationId: 'c1' } },
      }),
    );
    await click(screen.getByText('Reply'));
    expect(openChat).toHaveBeenLastCalledWith({ conversationId: 'c1', threadId: undefined, reply: true });

    await show(() =>
      showToast({
        title: 'Whisper',
        description: 'wtb',
        action: { label: 'Reply', type: ToastActionType.OPEN_CHAT_CONVERSATION, data: { threadId: 'whisper:zed' } },
      }),
    );
    await click(within(toastEl('wtb')!).getByText('Reply'));
    expect(openChat).toHaveBeenLastCalledWith({ conversationId: undefined, threadId: 'whisper:zed', reply: true });
  });

  it('a market alert action opens the market panel with its payload', async () => {
    const openMarket = vi.fn();
    setToastBridge({ openChat: vi.fn(), openMarket });
    await renderLayer();
    await show(() =>
      showToast({
        title: 'Market alert',
        description: '1 new: Shako',
        action: {
          label: 'View',
          type: ToastActionType.OPEN_MARKET_PANEL,
          data: { savedSearchId: 's1', focusListingId: 'l1', tab: 'search' },
        },
      }),
    );
    await click(screen.getByText('View'));
    expect(openMarket).toHaveBeenCalledWith({ savedSearchId: 's1', focusListingId: 'l1', tab: 'search' });
  });

  it('installs the update from the action button', async () => {
    await renderLayer();
    await show(() =>
      showToast({
        title: 'Update available',
        description: 'v2',
        action: { label: 'Install', type: ToastActionType.UPDATE_AVAILABLE },
      }),
    );
    await click(screen.getByText('Install'));
    expect(installUpdateAndRelaunch).toHaveBeenCalledTimes(1);
  });

  it('treats an object with a falsy action as a plain PD2 Trader toast', async () => {
    await renderLayer();
    await show(() => showToast({ title: 'Ignored title', description: 'no action', action: undefined }));
    const el = toastEl('no action');
    expect(el?.textContent).toContain('PD2 Trader');
    expect(el?.textContent).not.toContain('Ignored title');
    expect(el?.querySelector('[data-button]')).toBeNull();
  });
});

describe('confirmToast', () => {
  it('runs onConfirm from the confirm button and dismisses', async () => {
    const onConfirm = vi.fn();
    await renderLayer();
    await show(() => confirmToast({ title: 'Really?', description: 'sure', confirmLabel: 'Yes', onConfirm }));
    await click(screen.getByText('Yes'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await advance(1000);
    expect(toastEl('sure')).toBeNull();
  });

  it('cancel and auto-dismiss never confirm', async () => {
    const onConfirm = vi.fn();
    await renderLayer();
    await show(() => confirmToast({ title: 'A', description: 'cancel me', onConfirm }));
    await click(screen.getByText('Cancel'));
    await show(() => confirmToast({ title: 'B', description: 'time out', duration: 1000, onConfirm }));
    await advance(2000);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(toastEl('cancel me')).toBeNull();
    expect(toastEl('time out')).toBeNull();
  });

  it('logs instead of throwing when onConfirm rejects', async () => {
    await renderLayer();
    await show(() =>
      confirmToast({ title: 'A', description: 'x', onConfirm: () => Promise.reject(new Error('boom')) }),
    );
    await click(screen.getByText('Confirm'));
    expect(console.error).toHaveBeenCalledWith('[overlay] confirm action failed:', expect.any(Error));
  });
});

describe('undoToast', () => {
  it('runs onUndo from its Undo button, and the returned function dismisses it', async () => {
    const onUndo = vi.fn();
    await renderLayer();
    await show(() => undoToast({ title: 'Deleted', description: 'undo me', duration: 6000, onUndo }));
    await click(within(toastEl('undo me')!).getByText('Undo'));
    expect(onUndo).toHaveBeenCalledTimes(1);

    // sonner removes a dismissed toast on a later animation frame: check the dismissal itself
    const dismissSpy = vi.spyOn(toast, 'dismiss');
    let dismiss = () => {};
    await show(() => {
      dismiss = undoToast({ title: 'Deleted', description: 'dismiss me', duration: 6000, onUndo });
    });
    expect(toastEl('dismiss me')).not.toBeNull();
    dismiss();
    expect(dismissSpy).toHaveBeenCalledTimes(1);
    expect(dismissSpy.mock.calls[0][0]).toBeDefined();
    expect(onUndo).toHaveBeenCalledTimes(1);
  });
});
