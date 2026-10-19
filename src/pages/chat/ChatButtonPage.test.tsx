// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MotionGlobalConfig } from 'framer-motion';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { emit, listen } from '@/lib/browser-events';
import { useOptions } from '@/hooks/useOptions';
import ChatButtonPage from './ChatButtonPage';

vi.mock('@/lib/browser-events', () => ({ emit: vi.fn(), listen: vi.fn() }));
vi.mock('@/hooks/useOptions', () => ({
  useOptions: vi.fn(),
  OptionsProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('@/hooks/pd2website/usePD2Website', () => ({
  ChildPd2WebsiteProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('@/hooks/useItems', () => ({ ItemsProvider: ({ children }: { children: ReactNode }) => children }));

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
});
afterAll(() => {
  MotionGlobalConfig.skipAnimations = false;
});

type Handler = (event: { payload: unknown }) => unknown;
let handlers: Map<string, Handler>;
let unlistened: string[];
const updateSettings = vi.fn();

async function fire(event: string, payload?: unknown) {
  await act(async () => {
    await handlers.get(event)!({ payload });
  });
}

async function renderPage() {
  const view = render(<ChatButtonPage />);
  await act(async () => {});
  return view;
}

beforeEach(() => {
  handlers = new Map();
  unlistened = [];
  updateSettings.mockResolvedValue(undefined);
  vi.mocked(useOptions).mockImplementation(
    () => ({ updateSettings }) as unknown as ReturnType<typeof useOptions>,
  );
  vi.mocked(emit).mockResolvedValue(undefined);
  vi.mocked(listen).mockImplementation(async (event: string, cb: Handler) => {
    handlers.set(event, cb);
    return () => unlistened.push(event);
  });
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(cleanup);

describe('ChatButtonPage', () => {
  it('shows the unread chat count pushed by the chat window', async () => {
    await renderPage();
    expect(screen.queryByLabelText(/unread messages$/)).toBeNull();

    await fire('chat-unread-count-updated', { count: 4 });
    expect(screen.getByLabelText('4 unread messages').textContent).toBe('4');

    await fire('chat-unread-count-updated', { count: 0 });
    expect(screen.queryByLabelText(/unread messages$/)).toBeNull();
  });

  it('sums whisper and website offer counts into one trade badge, each source replacing its own share', async () => {
    await renderPage();
    await fire('trade-messages-count-updated', { count: 2 });
    expect(screen.getByLabelText('2 trade offers')).not.toBeNull();

    await fire('trade-offers-count-updated', { incomingCount: 3, outgoingCount: 1, totalCount: 4 });
    expect(screen.getByLabelText('6 trade offers')).not.toBeNull();

    await fire('trade-messages-count-updated', { count: 0 });
    expect(screen.getByLabelText('4 trade offers')).not.toBeNull();
  });

  it('disables the overlay setting once the toast confirmation arrives, then notifies the user', async () => {
    const order: string[] = [];
    updateSettings.mockImplementation(async (s: unknown) => {
      order.push(`update ${JSON.stringify(s)}`);
    });
    vi.mocked(emit).mockImplementation(async (event: string) => {
      order.push(`emit ${event}`);
    });
    await renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Disable Overlay' }));
    expect(updateSettings).not.toHaveBeenCalled();

    await fire('confirm-disable-overlay');
    expect(order).toEqual([
      'emit toast-confirm-disable-overlay',
      'update {"chatButtonOverlayEnabled":false}',
      'emit toast-event',
    ]);
  });

  it.each([
    ['Open PD2 Chat', 'toggle-chat-window'],
    ['Settings', 'open-settings'],
    ['Trade Messages', 'toggle-trade-messages-window'],
    ['Manage Listings', 'open-quick-list-manage'],
  ])('%s emits %s', async (name, event) => {
    await renderPage();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name }));
    });
    expect(vi.mocked(emit).mock.calls.map(([e]) => e)).toEqual([event]);
  });

  it('removes all listeners on unmount', async () => {
    const view = await renderPage();
    view.unmount();
    expect(unlistened.sort()).toEqual([
      'chat-unread-count-updated',
      'confirm-disable-overlay',
      'trade-messages-count-updated',
      'trade-offers-count-updated',
    ]);
  });
});
