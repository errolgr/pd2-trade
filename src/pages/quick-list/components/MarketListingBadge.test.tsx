// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { showToast } from '@/overlay';
import { TooltipProvider } from '@/components/ui/tooltip';
import { openUrl } from '@/lib/browser-opener';
import type { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import MarketListingBadge from './MarketListingBadge';

const panel = vi.hoisted(() => ({ close: (() => {}) as () => void }));
vi.mock('@/overlay', () => ({ showToast: vi.fn(), usePanel: () => panel }));
vi.mock('framer-motion', () => import('@/pages/quick-list/motion-mock'));
vi.mock('@/lib/browser-opener', () => ({ openUrl: vi.fn() }));

const NOW = new Date('2026-03-01T12:00:00Z');
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3600_000).toISOString();

const item = { hash: 'h1', name: 'Shako' } as GameStashItem;
const listing = (bumped_at: string | null) =>
  ({ _id: 'L1', item: { hash: 'h1' }, bumped_at }) as unknown as MarketListingEntry;

let onBump: Mock<(id: string, hash: string) => Promise<void>>;
let onRefresh: Mock<() => Promise<void>>;
let deleteMarketListing: Mock<(id: string) => Promise<void>>;
let close: Mock<() => void>;

function renderBadge(currentListings: MarketListingEntry[]) {
  return render(
    <TooltipProvider>
      <MarketListingBadge
        stashItem={item}
        currentListings={currentListings}
        onBump={onBump}
        onRefresh={onRefresh}
        deleteMarketListing={deleteMarketListing}
      />
    </TooltipProvider>,
  );
}

const toasts = () => vi.mocked(showToast).mock.calls.map(([p]) => p);
const hover = () => fireEvent.mouseEnter(screen.getByText('Listed').closest('span.relative')!);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  onBump = vi.fn(async () => {});
  onRefresh = vi.fn(async () => {});
  deleteMarketListing = vi.fn(async () => {});
  close = vi.fn();
  panel.close = close;
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('MarketListingBadge', () => {
  it('renders nothing for an item that is not listed', () => {
    const { container } = renderBadge([{ ...listing(null), item: { hash: 'other' } } as MarketListingEntry]);
    expect(container.textContent).toBe('');
  });

  it('tolerates a non-array listings prop', () => {
    const { container } = renderBadge(undefined as unknown as MarketListingEntry[]);
    expect(container.textContent).toBe('');
  });

  it.each([
    ['never bumped', null],
    ['bumped exactly 12h ago', hoursAgo(12)],
  ])('offers Bump on hover when %s', (_label, bumpedAt) => {
    renderBadge([listing(bumpedAt)]);
    expect(screen.queryByRole('button', { name: /Bump/ })).toBeNull();
    hover();
    expect(screen.queryByRole('button', { name: /Bump/ })).not.toBeNull();
  });

  it('keeps the Listed pill (cooldown) on hover when bumped under 12h ago', () => {
    renderBadge([listing(hoursAgo(11.9))]);
    hover();
    expect(screen.queryByRole('button', { name: /Bump/ })).toBeNull();
    expect(screen.getByText('Listed').className).toContain('cursor-not-allowed');
  });

  it('bumps the listing for this item, refreshes, then shows the success state until mouse leave', async () => {
    renderBadge([{ ...listing(null), _id: 'other', item: { hash: 'x' } } as MarketListingEntry, listing(null)]);
    hover();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Bump/ }));
    });
    expect(onBump.mock.calls).toEqual([['L1', 'h1']]);
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(toasts()).toEqual(['Item bumped successfully!']);
    expect(screen.queryByRole('button', { name: /Bump/ })).toBeNull();
    expect(screen.queryByText('Listed')).toBeNull();

    fireEvent.mouseLeave(document.querySelector('span.relative')!);
    expect(screen.queryByText('Listed')).not.toBeNull();
  });

  it('reports a failed bump, skips refresh, and leaves Bump available to retry', async () => {
    onBump.mockRejectedValueOnce(new Error('429'));
    renderBadge([listing(null)]);
    hover();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Bump/ }));
    });
    expect(onRefresh).not.toHaveBeenCalled();
    expect(toasts()).toEqual(['Failed to bump item']);
    const bump = screen.getByRole('button', { name: /Bump/ }) as HTMLButtonElement;
    expect(bump.disabled).toBe(false);
  });

  it('removes the listing, refreshes, toasts the item name and closes the panel', async () => {
    const order: string[] = [];
    deleteMarketListing.mockImplementation(async (id) => void order.push(`delete ${id}`));
    onRefresh.mockImplementation(async () => void order.push('refresh'));
    close.mockImplementation(() => void order.push('close'));
    renderBadge([listing(null)]);
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Remove listing'));
    });
    expect(order).toEqual(['delete L1', 'refresh', 'close']);
    expect(toasts()).toEqual(['Removed Shako market listing.']);
  });

  it('reports a failed removal, keeps the panel open and re-enables the button', async () => {
    deleteMarketListing.mockRejectedValueOnce(new Error('401'));
    renderBadge([listing(null)]);
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Remove listing'));
    });
    expect(toasts()).toEqual(['Failed to remove listing.']);
    expect(onRefresh).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
    expect((screen.getByLabelText('Remove listing') as HTMLButtonElement).disabled).toBe(false);
  });

  it('opens the listing on the trade website', () => {
    renderBadge([listing(null)]);
    fireEvent.click(screen.getByLabelText('Go to trade website'));
    expect(vi.mocked(openUrl).mock.calls).toEqual([['https://projectdiablo2.com/market/listing/L1']]);
  });
});
