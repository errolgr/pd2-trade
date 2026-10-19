// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { encodeItemForQuickList } from '@/lib/item-utils';
import type { PanelPayloads } from '@/overlay';
import { QuickListPage } from './QuickListPage';

const h = vi.hoisted(() => ({
  panel: { payload: undefined as unknown, payloadVersion: 0 },
}));

vi.mock('@/overlay', () => ({ usePanel: () => h.panel }));
vi.mock('./components/ListItemShortcut', () => ({
  default: ({ item }: { item: unknown }) => <output data-testid="item">{JSON.stringify(item)}</output>,
}));

const shownItem = () => JSON.parse(screen.getByTestId('item').textContent!);

/** Simulates openPanel('quickList', payload): new payload, bumped payloadVersion. */
function open(payload: PanelPayloads['quickList']) {
  h.panel = { payload, payloadVersion: h.panel.payloadVersion + 1 };
}

beforeEach(() => {
  h.panel = { payload: undefined, payloadVersion: 0 };
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(cleanup);

describe('QuickListPage', () => {
  const item = { name: 'Ætherial Shako', type: 'Shako', location: 'Stash' };
  const encoded = encodeItemForQuickList(JSON.stringify(item));

  it('decodes the item from the payload, including non-ASCII names', () => {
    open({ item: encoded });
    render(<QuickListPage />);
    expect(shownItem()).toEqual(item);
  });

  it('shows no item in manage mode, for the not_shared_stash error, or for a malformed item', () => {
    open(undefined);
    render(<QuickListPage />);
    expect(shownItem()).toBeNull();
    cleanup();

    open({ item: encoded, error: 'not_shared_stash' });
    render(<QuickListPage />);
    expect(shownItem()).toBeNull();
    cleanup();

    open({ item: '@@@' });
    render(<QuickListPage />);
    expect(shownItem()).toBeNull();
  });

  it('replaces and clears the item when reopened while open', () => {
    open(undefined);
    const view = render(<QuickListPage />);
    open({ item: encoded });
    view.rerender(<QuickListPage />);
    expect(shownItem()).toEqual(item);

    open({ error: 'not_shared_stash' });
    view.rerender(<QuickListPage />);
    expect(shownItem()).toBeNull();

    open({ item: encoded });
    view.rerender(<QuickListPage />);
    expect(shownItem()).toEqual(item);
    open(undefined);
    view.rerender(<QuickListPage />);
    expect(shownItem()).toBeNull();
  });
});
