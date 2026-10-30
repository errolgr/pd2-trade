// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { useOptions } from '@/hooks/useOptions';
import { publishListingDeleted } from '@/hooks/pd2website/listing-events';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import type { MarketListingQuery } from '@/common/types/pd2-website/GetMarketListingsCommand';
import { TRADE_LISTINGS_LIMIT } from '@/pages/delist/trade-match';
import { DEFAULT_SORT_DIR } from './my-listings';
import MyListingsTab from './MyListingsTab';

vi.mock('@/overlay', () => ({ showToast: vi.fn() }));
vi.mock('framer-motion', () => import('@/pages/quick-list/motion-mock'));
vi.mock('@/hooks/pd2website/usePD2Website', () => ({ usePd2Website: vi.fn() }));
vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));
vi.mock('@/lib/browser-opener', () => ({ openUrl: vi.fn() }));
vi.mock('@/lib/telemetry', () => ({ trackEvent: vi.fn(), trackMeasurement: vi.fn() }));
vi.mock('@/components/ui/select', async () => (await import('@/components/dialogs/optionsv2/test-utils')).selectShim);
const NO_DEALS = new Map();
vi.mock('@/pages/market/enrich/useDealIndicators', () => ({ useDealIndicators: () => NO_DEALS }));
vi.mock('@/pages/market/enrich/useNow', () => ({ useNow: () => Date.parse('2026-03-01T12:00:00Z') }));
vi.mock('@/hooks/useItems', () => ({ useItems: () => ({ itemsMapByKey: {} }) }));

const NOW = new Date('2026-03-01T12:00:00Z');
const H = 3600_000;
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * H).toISOString();

function makeListing(id: string, name: string, bumpedHoursAgo: number, over: Partial<MarketListingEntry> = {}) {
  return {
    _id: id,
    price: '',
    hr_price: 1,
    bumped_at: hoursAgo(bumpedHoursAgo),
    created_at: hoursAgo(48),
    item: { hash: `h${id}`, name, base: { name: `${name} base` }, quality: { name: 'Unique' }, modifiers: [] },
    ...over,
  } as unknown as MarketListingEntry;
}

interface Api {
  getMarketListings: Mock<(q: MarketListingQuery) => Promise<{ data: MarketListingEntry[]; total: number }>>;
  updateMarketListing: Mock<(id: string, fields: Record<string, unknown>) => Promise<void>>;
  updateItemByHash: Mock<(hash: string, fields: Record<string, unknown>) => Promise<void>>;
  deleteMarketListing: Mock<(id: string) => Promise<void>>;
  bumpAllMarketListings: Mock<(userId: string) => Promise<void>>;
  authData: { user: { _id: string } } | null;
  incomingOffers: never[];
}

let api: Api;
let updateSettings: Mock<(patch: Record<string, unknown>) => void>;

/** The card holding `name`. */
const card = (name: string) => screen.getByText(name).closest<HTMLElement>('[class*="rounded-lg"][class*="border"]')!;
const isFresh = (name: string) => within(card(name)).queryByText('12h') !== null;
const hasBump = (name: string) => within(card(name)).queryByRole('button', { name: 'Bump listing to top' }) !== null;

async function click(el: Element) {
  await act(async () => {
    fireEvent.click(el);
  });
}

async function renderTab() {
  const view = render(
    <TooltipProvider>
      <MyListingsTab />
    </TooltipProvider>,
  );
  await act(async () => {});
  return view;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const server = [
    makeListing('L1', 'Shako', 20),
    makeListing('L2', 'Arachnid Mesh', 3),
    makeListing('L3', 'Stone of Jordan', 30),
  ];
  api = {
    getMarketListings: vi.fn(async () => ({ data: server, total: server.length })),
    updateMarketListing: vi.fn(async () => {}),
    updateItemByHash: vi.fn(async () => {}),
    deleteMarketListing: vi.fn(async (id) => publishListingDeleted(id)),
    bumpAllMarketListings: vi.fn(async () => {}),
    authData: { user: { _id: 'u1' } },
    incomingOffers: [],
  };
  vi.mocked(usePd2Website).mockImplementation(() => api as never);
  updateSettings = vi.fn();
  const options = { settings: { mode: 'softcore', ladder: 'ladder' }, updateSettings };
  vi.mocked(useOptions).mockImplementation(() => options as never);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('MyListingsTab', () => {
  it('loads every listing of the user in the current realm', async () => {
    await renderTab();
    expect(api.getMarketListings).toHaveBeenCalledTimes(1);
    const q = api.getMarketListings.mock.calls[0][0];
    expect(q).toMatchObject({
      $limit: TRADE_LISTINGS_LIMIT,
      $skip: 0,
      user_id: 'u1',
      is_hardcore: false,
      is_ladder: true,
    });
    for (const name of ['Shako', 'Arachnid Mesh', 'Stone of Jordan']) expect(screen.queryByText(name)).not.toBeNull();
  });

  it('search narrows the list', async () => {
    await renderTab();
    fireEvent.change(screen.getByRole('textbox', { name: 'Search listings' }), { target: { value: 'shako' } });
    expect(screen.queryByText('Shako')).not.toBeNull();
    expect(screen.queryByText('Arachnid Mesh')).toBeNull();
    expect(screen.queryByText('Stone of Jordan')).toBeNull();
  });

  it('bumps only the off-cooldown listings with Bump N ready', async () => {
    await renderTab();
    const bumpAll = screen.getByRole('button', { name: 'Bump 2 ready' });
    expect(hasBump('Shako') && hasBump('Stone of Jordan')).toBe(true);
    expect(within(card('Arachnid Mesh')).queryByText('9h')).not.toBeNull();

    await click(bumpAll);

    expect(api.bumpAllMarketListings).toHaveBeenCalledWith('u1');
    expect(isFresh('Shako')).toBe(true);
    expect(isFresh('Stone of Jordan')).toBe(true);
    expect(isFresh('Arachnid Mesh')).toBe(false);
    expect(within(card('Arachnid Mesh')).queryByText('9h')).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Nothing to bump' })).not.toBeNull();
  });

  it('bumps a single listing', async () => {
    await renderTab();
    await click(within(card('Shako')).getByRole('button', { name: 'Bump listing to top' }));
    expect(api.updateMarketListing).toHaveBeenCalledWith('L1', { bumped_at: NOW.toISOString() });
    expect(isFresh('Shako')).toBe(true);
    expect(hasBump('Stone of Jordan')).toBe(true);
  });

  it('deletes a listing and drops its row', async () => {
    await renderTab();
    await click(within(card('Shako')).getByRole('button', { name: 'Remove listing' }));
    expect(api.deleteMarketListing).toHaveBeenCalledWith('L1');
    expect(screen.queryByText('Shako')).toBeNull();
    expect(screen.queryByText('Stone of Jordan')).not.toBeNull();
  });

  it('saves an edited price', async () => {
    await renderTab();
    await click(within(card('Shako')).getByRole('button', { name: 'Edit price' }));
    const c = card('Shako');
    fireEvent.change(within(c).getByRole('spinbutton'), { target: { value: '2.5' } });
    fireEvent.change(within(c).getByRole('textbox'), { target: { value: '  obo ' } });
    await act(async () => {
      fireEvent.submit(c.querySelector('form')!);
    });
    expect(api.updateMarketListing).toHaveBeenCalledWith('L1', { hr_price: 2.5, price: 'obo' });
    expect(api.updateItemByHash).toHaveBeenCalledWith('hL1', { hr_price: 2.5, price: 'obo' });
    expect(within(card('Shako')).queryByText('2.5 HR')).not.toBeNull();
  });

  it('stores the picked sort with its default direction', async () => {
    await renderTab();
    fireEvent.change(screen.getByRole('combobox', { name: 'Sort listings' }), { target: { value: 'price' } });
    expect(updateSettings).toHaveBeenCalledWith({ myListingsSort: { key: 'price', dir: DEFAULT_SORT_DIR.price } });
  });

  it('stores the view toggle', async () => {
    await renderTab();
    await click(screen.getByRole('button', { name: 'Compact rows' }));
    expect(updateSettings).toHaveBeenCalledWith({ myListingsView: 'rows' });
  });

  it('asks to sign in when signed out', async () => {
    api.authData = null;
    await renderTab();
    expect(screen.queryByText('Not signed in')).not.toBeNull();
    expect(api.getMarketListings).not.toHaveBeenCalled();
  });
});
