// @vitest-environment happy-dom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { showToast } from '@/overlay';
import { Pd2WebsiteContext } from '@/hooks/pd2website/usePD2Website';
import { useOptions } from '@/hooks/useOptions';
import { ToastActionType } from '@/common/types/Events';
import type { ValuationLine } from '@/lib/networth-api';
import type { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import type { MarketListingQuery } from '@/common/types/pd2-website/GetMarketListingsCommand';
import { ListAtNetWorthMenu } from './ListAtNetWorth';

const openPanel = vi.hoisted(() => vi.fn());
vi.mock('@/overlay', () => ({ showToast: vi.fn(), useOverlay: () => ({ openPanel }) }));
vi.mock('framer-motion', () => import('@/pages/quick-list/motion-mock'));
vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));

afterEach(cleanup);

const stashItem = (hash: string, name = 'Harlequin Crest'): GameStashItem =>
  ({ hash, name, quality: { name: 'Unique' }, modifiers: [], socket_count: 0 }) as never;

const listingOf = (item: GameStashItem, id = `L-${item.hash}`) => ({ _id: id, item }) as unknown as MarketListingEntry;

function line(overrides: Partial<ValuationLine> = {}): ValuationLine {
  return {
    key: 'unique:shako',
    name: 'Harlequin Crest',
    category: 'uniques',
    qty: 1,
    unitPrice: 2.456,
    value: 2.456,
    confidence: 'ok',
    sampleCount: 20,
    priceChange7dPercent: null,
    tab: 'Shared 1',
    iconPath: null,
    itemHashes: ['h1'],
    ...overrides,
  };
}

let stash: GameStashItem[];
/** Listings PD2 reports for the line's items. */
let itemListings: MarketListingEntry[];
let listingTotal: number;
let api: {
  authData: { user: { _id: string } } | null;
  fetchStash: Mock<() => Promise<{ items: GameStashItem[] }>>;
  getMarketListings: Mock<(q: MarketListingQuery) => Promise<{ data: MarketListingEntry[]; total: number }>>;
  listSpecificItem: Mock<(item: GameStashItem, hr: number, note: string, type: string) => Promise<{ _id: string }>>;
};

beforeEach(() => {
  vi.mocked(showToast).mockClear();
  openPanel.mockClear();
  vi.mocked(useOptions).mockReturnValue({ settings: { mode: 'softcore', ladder: 'ladder' } } as never);
  stash = [stashItem('h1')];
  itemListings = [];
  listingTotal = 3;
  api = {
    authData: { user: { _id: 'user-1' } },
    fetchStash: vi.fn(async () => ({ items: stash })),
    // The per-item query filters on item.hash; the listing-count query doesn't
    getMarketListings: vi.fn(async (q) =>
      q['item.hash'] ? { data: itemListings, total: itemListings.length } : { data: [], total: listingTotal },
    ),
    listSpecificItem: vi.fn(async (item) => ({ _id: `new-${item.hash}` })),
  };
});

function renderRow(l: ValuationLine) {
  return render(
    <Pd2WebsiteContext.Provider value={api as never}>
      <ListAtNetWorthMenu line={l}>
        <div data-testid={`row-${l.key}`}>{l.name}</div>
      </ListAtNetWorthMenu>
    </Pd2WebsiteContext.Provider>,
  );
}

const menuItem = (name: string) => screen.queryByRole('menuitem', { name });
const submit = () => screen.getByRole('button', { name: 'List' }) as HTMLButtonElement;
const priceInput = () => screen.getByLabelText('Price (HR)') as HTMLInputElement;

async function openForm(l: ValuationLine = line()) {
  renderRow(l);
  fireEvent.contextMenu(screen.getByTestId(`row-${l.key}`));
  fireEvent.click(menuItem('List on market…')!);
  // The form opens once the menu has closed
  await screen.findByRole('dialog');
  await waitFor(() => expect(screen.queryByText('Finding the item in your stash…')).toBeNull());
}

describe('ListAtNetWorthMenu', () => {
  it('adds no menu to rows without stash items, without a price, or while signed out of PD2', () => {
    const unlistable = [
      line({ key: 'currency', category: 'currency', itemHashes: undefined }),
      line({ key: 'empty', itemHashes: [] }),
      line({ key: 'unpriced', unitPrice: null }),
      line({ key: 'zero', unitPrice: 0 }),
    ];
    for (const l of unlistable) {
      renderRow(l);
      fireEvent.contextMenu(screen.getByTestId(`row-${l.key}`));
    }
    api.authData = null;
    renderRow(line({ key: 'signed-out' }));
    fireEvent.contextMenu(screen.getByTestId('row-signed-out'));

    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('lists the stash item behind the line at its Net Worth price, rounded to 2 decimals', async () => {
    await openForm();
    expect(priceInput().value).toBe('2.46');
    fireEvent.click(submit());

    await waitFor(() => expect(api.listSpecificItem).toHaveBeenCalledTimes(1));
    expect(api.listSpecificItem).toHaveBeenCalledWith(stash[0], 2.46, '', 'exact');
    expect(vi.mocked(showToast)).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Item listed!',
        action: expect.objectContaining({ type: ToastActionType.OPEN_MARKET_LISTING, data: { listingId: 'new-h1' } }),
      }),
    );
    expect(await screen.findByText('Already listed on the market.')).not.toBeNull();
    fireEvent.contextMenu(screen.getByTestId('row-unique:shako'));
    expect(menuItem('List on market…')).toBeNull();
    expect(menuItem('Already listed')!.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(menuItem('Manage listings')!);
    expect(openPanel).toHaveBeenCalledWith('quickList', undefined, { placement: 'gameCenter' });
  });

  it('lists at an edited price with a note', async () => {
    await openForm();
    fireEvent.change(priceInput(), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('Note (optional)'), { target: { value: 'or offer' } });
    fireEvent.click(submit());

    await waitFor(() => expect(api.listSpecificItem).toHaveBeenCalledWith(stash[0], 3, 'or offer', 'exact'));
  });

  it('defaults to the first unlisted item, shows listed ones as listed and never re-posts them', async () => {
    stash = [stashItem('h1'), stashItem('h2'), stashItem('other')];
    itemListings = [listingOf(stash[0])];
    await openForm(line({ qty: 2, itemHashes: ['h1', 'h2'] }));

    const [first, second] = screen.getAllByRole('radio');
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    expect(first.getAttribute('aria-disabled')).toBe('true');
    expect(first.textContent).toContain('Listed');
    expect(second.getAttribute('aria-checked')).toBe('true');

    fireEvent.click(first);
    expect(second.getAttribute('aria-checked')).toBe('true');
    fireEvent.click(submit());
    await waitFor(() => expect(api.listSpecificItem).toHaveBeenCalledTimes(1));
    expect(api.listSpecificItem.mock.calls[0][0]).toBe(stash[1]);
  });

  it('says so when every item is already listed, with a way to manage listings', async () => {
    itemListings = [listingOf(stash[0])];
    await openForm();

    expect(screen.getByText('Already listed on the market.')).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'List' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Manage listings' }));
    expect(openPanel).toHaveBeenCalledWith('quickList', undefined, { placement: 'gameCenter' });
    expect(api.listSpecificItem).not.toHaveBeenCalled();
  });

  it('does not post when the 50-listing cap is reached', async () => {
    listingTotal = 50;
    await openForm();
    fireEvent.click(submit());

    await waitFor(() =>
      expect(vi.mocked(showToast)).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Maximum listings reached', variant: 'error' }),
      ),
    );
    expect(api.listSpecificItem).not.toHaveBeenCalled();
  });

  it('tells the user the item moved when its hash is no longer in the stash', async () => {
    stash = [stashItem('someone-else')];
    await openForm();

    expect(screen.getByRole('alert').textContent).toBe('Item moved or gone — refresh Net Worth');
    expect(screen.queryByRole('button', { name: 'List' })).toBeNull();
  });

  it('shows why listing failed', async () => {
    api.listSpecificItem.mockRejectedValueOnce(new Error('Item is already listed'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await openForm();
    fireEvent.click(submit());

    expect((await screen.findByRole('alert')).textContent).toBe('Item is already listed');
  });

  it('asks to sign in again when PD2 answers 401 to the listing, without marking it listed', async () => {
    api.listSpecificItem.mockResolvedValueOnce(null as never);
    await openForm();
    fireEvent.click(submit());

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Your PD2 session expired. Sign in again to list this item.',
    );
    expect(vi.mocked(showToast)).not.toHaveBeenCalled();
    expect(screen.getByRole('radio').textContent).not.toContain('Listed');
    fireEvent.contextMenu(screen.getByTestId('row-unique:shako'));
    expect(menuItem('List on market…')).not.toBeNull();
  });
});
