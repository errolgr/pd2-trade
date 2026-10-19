// @vitest-environment happy-dom
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { listen } from '@/lib/browser-events';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { encodeItem } from '@/lib/item-utils';
import { QuickListPage } from './QuickListPage';

vi.mock('./components/ListItemShortcut', () => ({
  default: ({ item }: { item: unknown }) => <output data-testid="item">{JSON.stringify(item)}</output>,
}));
vi.mock('@/lib/browser-events', () => ({ listen: vi.fn() }));
vi.mock('@tauri-apps/api/webviewWindow', () => ({ getCurrentWebviewWindow: vi.fn() }));
vi.mock('@/hooks/useOptions', () => ({ OptionsProvider: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('@/hooks/useItems', () => ({ ItemsProvider: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('@/hooks/pd2website/usePD2Website', () => ({
  ChildPd2WebsiteProvider: ({ children }: { children: React.ReactNode }) => children,
}));

type Handler = (e: { payload: string | null }) => void;
let globalHandlers: Record<string, Handler>;
let windowHandlers: Record<string, Handler>;
let unlistens: Mock<() => void>[];

const shownItem = () => JSON.parse(screen.getByTestId('item').textContent!);

function renderPage(query = '') {
  return render(
    <MemoryRouter initialEntries={[`/quick-list${query}`]}>
      <QuickListPage />
    </MemoryRouter>,
  );
}

async function fire(handlers: Record<string, Handler>, event: string, payload: string | null) {
  await act(async () => handlers[event]({ payload }));
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  globalHandlers = {};
  windowHandlers = {};
  unlistens = [];
  const register = (target: Record<string, Handler>) => async (event: string, cb: Handler) => {
    target[event] = cb;
    const off = vi.fn();
    unlistens.push(off);
    return off;
  };
  vi.mocked(listen).mockImplementation(register(globalHandlers) as never);
  vi.mocked(getCurrentWebviewWindow).mockReturnValue({ listen: register(windowHandlers) } as never);
});
afterEach(cleanup);

describe('QuickListPage', () => {
  const item = { name: 'Ætherial Shako', type: 'Shako', location: 'Stash' };

  it('decodes the item from the URL, including non-ASCII names', async () => {
    renderPage(`?item=${encodeItem(JSON.stringify(item))}`);
    await act(async () => {});
    expect(shownItem()).toEqual(item);
  });

  it('shows no item for the not_shared_stash error or a malformed payload', async () => {
    renderPage(`?item=${encodeItem(JSON.stringify(item))}&error=not_shared_stash`);
    await act(async () => {});
    expect(shownItem()).toBeNull();
    cleanup();

    renderPage('?item=@@@');
    await act(async () => {});
    expect(shownItem()).toBeNull();
  });

  it.each([
    ['global', () => globalHandlers],
    ['window', () => windowHandlers],
  ])('replaces and clears the item from %s events', async (_label, handlers) => {
    renderPage();
    await act(async () => {});
    await fire(handlers(), 'quick-list-new-item', encodeItem(JSON.stringify(item)));
    expect(shownItem()).toEqual(item);
    await fire(handlers(), 'quick-list-new-item', null);
    expect(shownItem()).toBeNull();

    await fire(handlers(), 'quick-list-new-item', encodeItem(JSON.stringify(item)));
    await fire(handlers(), 'quick-list-error', 'something_else');
    expect(shownItem()).toEqual(item);
    await fire(handlers(), 'quick-list-error', 'not_shared_stash');
    expect(shownItem()).toBeNull();
  });

  it('clears the item when an event payload cannot be decoded', async () => {
    renderPage(`?item=${encodeItem(JSON.stringify(item))}`);
    await act(async () => {});
    await fire(globalHandlers, 'quick-list-new-item', 'not-base64!');
    expect(shownItem()).toBeNull();
  });

  it('still works when window-scoped listeners are unavailable', async () => {
    vi.mocked(getCurrentWebviewWindow).mockImplementation(() => {
      throw new Error('not in tauri');
    });
    renderPage();
    await act(async () => {});
    await fire(globalHandlers, 'quick-list-new-item', encodeItem(JSON.stringify(item)));
    expect(shownItem()).toEqual(item);
  });

  it('removes every listener on unmount', async () => {
    const view = renderPage();
    await act(async () => {});
    view.unmount();
    await act(async () => {});
    expect(unlistens).toHaveLength(4);
    for (const off of unlistens) expect(off).toHaveBeenCalledTimes(1);
  });
});
