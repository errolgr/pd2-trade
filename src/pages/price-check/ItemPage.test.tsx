// @vitest-environment happy-dom
import React from 'react';
import { MotionGlobalConfig } from 'framer-motion';
import { MemoryRouter } from 'react-router-dom';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { listen } from '@/lib/browser-events';
import { getCurrentWebviewWindow, type BrowserWebviewWindow } from '@/lib/browser-webview';
import ItemWindow from './ItemPage';

vi.mock('@/lib/browser-events', () => ({ listen: vi.fn() }));
vi.mock('@/lib/browser-webview', () => ({ getCurrentWebviewWindow: vi.fn() }));
// Providers and the widget are tested on their own; here they only need to pass the item through.
vi.mock('@/hooks/useOptions', () => ({ OptionsProvider: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('@/hooks/useItems', () => ({ ItemsProvider: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('@/hooks/pd2website/usePD2Website', () => ({
  ChildPd2WebsiteProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('@/pages/price-check/components/ItemOverlayWidget', () => ({
  default: ({ item, onClose }: { item: { name: string }; onClose: () => void }) => (
    <div data-testid="widget">
      {item.name}
      <button onClick={onClose}>widget close</button>
    </div>
  ),
}));

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
});
afterAll(() => {
  MotionGlobalConfig.skipAnimations = false;
});

type NewSearchHandler = (event: { payload: string }) => void;
let newSearch: NewSearchHandler | undefined;
const unlisten = vi.fn();
const hide = vi.fn();

/** Same encoding the main window uses for the ?text param and the new-search payload. */
const encode = (item: object) => encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(item)))));

beforeEach(() => {
  newSearch = undefined;
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.mocked(listen).mockImplementation(async (_event, handler) => {
    newSearch = handler as unknown as NewSearchHandler;
    return unlisten;
  });
  // Only hide() is used by the price-check window.
  vi.mocked(getCurrentWebviewWindow).mockReturnValue({ hide } as unknown as BrowserWebviewWindow);
});
afterEach(cleanup);

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <ItemWindow />
    </MemoryRouter>,
  );
}

describe('ItemPage (price-check window)', () => {
  it('shows the empty state when opened without item data', () => {
    renderAt('/item');
    expect(screen.getByText('No item data provided or failed to parse.')).not.toBeNull();
    expect(screen.queryByTestId('widget')).toBeNull();
  });

  it('renders the item from the ?text param, including non-ASCII names', () => {
    renderAt(`/item?text=${encodeURIComponent(encode({ name: 'Ánnihilus Ü' }))}`);
    expect(screen.getByTestId('widget').textContent).toContain('Ánnihilus Ü');
  });

  it('falls back to the empty state and logs when the param is garbage', () => {
    renderAt('/item?text=%%%not-base64');
    expect(screen.getByText('No item data provided or failed to parse.')).not.toBeNull();
    expect(console.error).toHaveBeenCalled();
  });

  it('switches to the item sent with a new-search event', async () => {
    renderAt(`/item?text=${encodeURIComponent(encode({ name: 'Shako' }))}`);
    await act(async () => {});
    expect(listen).toHaveBeenCalledWith('new-search', expect.any(Function));

    act(() => newSearch!({ payload: encode({ name: 'Tyrael\u2019s Might' }) }));
    expect(screen.getByTestId('widget').textContent).toContain('Tyrael\u2019s Might');
  });

  it('keeps the current item when a new-search payload cannot be parsed', async () => {
    renderAt(`/item?text=${encodeURIComponent(encode({ name: 'Shako' }))}`);
    await act(async () => {});
    act(() => newSearch!({ payload: 'garbage' }));
    expect(screen.getByTestId('widget').textContent).toContain('Shako');
  });

  it('closing hides the window instead of destroying it (empty state and widget)', () => {
    const empty = renderAt('/item');
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(hide).toHaveBeenCalledTimes(1);
    empty.unmount();

    renderAt(`/item?text=${encodeURIComponent(encode({ name: 'Shako' }))}`);
    fireEvent.click(screen.getByText('widget close'));
    expect(hide).toHaveBeenCalledTimes(2);
  });

  it('stops listening for new-search events on unmount', async () => {
    const { unmount } = renderAt('/item');
    await act(async () => {});
    unmount();
    await act(async () => {});
    expect(unlisten).toHaveBeenCalledTimes(1);
  });
});
