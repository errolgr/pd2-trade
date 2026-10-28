// @vitest-environment happy-dom
import { cleanup, render, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { confirmToast, showToast, type ConfirmToastOptions } from '@/overlay';
import { NoAccountSelectedError, usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { useOptions } from '@/hooks/useOptions';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import DelistHandler, { useDelist } from './DelistHandler';
import type { WhisperedItem } from './trade-match';

const overlay = vi.hoisted(() => ({ openPanel: vi.fn() }));
vi.mock('@/overlay', () => ({ confirmToast: vi.fn(), showToast: vi.fn(), useOverlay: () => overlay }));
vi.mock('@/hooks/pd2website/usePD2Website', () => ({
  usePd2Website: vi.fn(),
  NoAccountSelectedError: class NoAccountSelectedError extends Error {},
}));
vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));
// Query building has its own tests; any stash match yields a query here.
vi.mock('@/pages/price-check/lib/tradeUrlBuilder', () => ({
  buildGetMarketListingByStashItemQuery: () => ({ 'item.hash': { $in: ['h1'] } }),
  buildGetAllUserMarketListingsQuery: (userId: string, hc: boolean, ladder: boolean, limit: number) => ({
    user_id: userId,
    hc,
    ladder,
    limit,
  }),
}));

const listing = (n: number) => ({ _id: `L${n}`, item: { name: `Item ${n}` } }) as unknown as MarketListingEntry;
const RAW = JSON.stringify({ name: 'Shako', type: 'Shako' });

let listings: MarketListingEntry[];
let deleteMarketListing: Mock<(id: string) => Promise<void>>;
let getMarketListings: Mock<(query: unknown) => Promise<{ data: MarketListingEntry[]; total: number }>>;

/** What AppController does: grab the stable API (it is not a child of DelistHandler). */
function delistItem(raw: string) {
  return renderHook(() => useDelist()).result.current.delistItem(raw);
}

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  listings = [];
  deleteMarketListing = vi.fn(async () => {});
  getMarketListings = vi.fn(async () => ({ data: listings, total: listings.length }));
  vi.mocked(usePd2Website).mockImplementation(
    () =>
      ({
        authData: { user: { _id: 'u1' } },
        findMatchingItems: vi.fn(async () => [{ hash: 'h1' }]),
        getMarketListings,
        deleteMarketListing,
      }) as never,
  );
  vi.mocked(useOptions).mockReturnValue({ settings: { mode: 'hardcore', ladder: 'ladder' } } as never);
});
afterEach(cleanup);

describe('DelistHandler / useDelist', () => {
  it('opens the delist picker with every match when several listings match', async () => {
    listings = [listing(1), listing(2)];
    render(<DelistHandler />);
    await delistItem(RAW);
    expect(overlay.openPanel).toHaveBeenCalledWith('delist', { listings });
    expect(deleteMarketListing).not.toHaveBeenCalled();
  });

  it('removes a single match directly and toasts', async () => {
    listings = [listing(1)];
    render(<DelistHandler />);
    await delistItem(RAW);
    expect(deleteMarketListing).toHaveBeenCalledWith('L1');
    expect(showToast).toHaveBeenCalledWith({ title: 'Delist', description: 'Removed Item 1 listing.' });
    expect(overlay.openPanel).not.toHaveBeenCalled();
  });

  it('asks for an in-game account instead of reporting a failure when none is chosen', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(usePd2Website).mockReturnValue({
      authData: { user: { _id: 'u1' } },
      findMatchingItems: vi.fn(async () => {
        throw new NoAccountSelectedError('Choose your in-game account');
      }),
    } as never);
    render(<DelistHandler />);
    await delistItem(RAW);
    expect(showToast).toHaveBeenCalledWith({
      title: 'Delist',
      description: 'Choose your in-game account',
      variant: 'error',
    });
    expect(error).not.toHaveBeenCalled();
  });

  it('does nothing once DelistHandler is unmounted', async () => {
    listings = [listing(1), listing(2)];
    const view = render(<DelistHandler />);
    view.unmount();
    await delistItem(RAW);
    expect(overlay.openPanel).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalled();
  });
});

describe('useDelist().delistTrade (chat whisper trades)', () => {
  const gc = (id: string, price: string) =>
    ({
      _id: id,
      price,
      hr_price: 0,
      item: { name: 'Grand Charm', quality: { name: 'Magic' }, base: { name: 'Grand Charm' } },
    }) as unknown as MarketListingEntry;
  const shako = {
    _id: 'S1',
    price: '',
    hr_price: 2,
    item: { name: 'Harlequin Crest', quality: { name: 'Unique' }, base: { name: 'Shako' } },
  } as unknown as MarketListingEntry;
  const trade = (itemName: string, price?: string) => ({
    message: `Hi, I'm interested in your ${itemName}${price ? ` listed for ${price}` : ''}`,
    itemName,
    price,
  });
  const delistTrade = (t: WhisperedItem) => renderHook(() => useDelist()).result.current.delistTrade(t);
  const confirmed = () => vi.mocked(confirmToast).mock.calls[0][0] as ConfirmToastOptions;

  it("searches the user's listings in the current realm and asks before deleting a single match", async () => {
    listings = [shako, gc('G1', '9 wss')];
    render(<DelistHandler />);
    await delistTrade(trade('Harlequin Crest', '2 HR'));
    expect(getMarketListings).toHaveBeenCalledWith({ user_id: 'u1', hc: true, ladder: true, limit: 1000 });
    expect(confirmed()).toMatchObject({
      title: 'Delete Listing?',
      description: 'Are you sure you want to delete the listing for Harlequin Crest (2 HR)?',
      confirmLabel: 'Delete',
    });
    expect(deleteMarketListing).not.toHaveBeenCalled();
    await confirmed().onConfirm();
    expect(deleteMarketListing).toHaveBeenCalledWith('S1');
    expect(showToast).toHaveBeenCalledWith({ title: 'Delist', description: 'Removed Harlequin Crest listing.' });
  });

  it('reports a failed delete after confirming', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    listings = [shako];
    deleteMarketListing.mockRejectedValueOnce(new Error('500'));
    render(<DelistHandler />);
    await delistTrade(trade('Harlequin Crest', '2 HR'));
    await confirmed().onConfirm();
    expect(showToast).toHaveBeenCalledWith({
      title: 'Delist',
      description: 'Failed to remove listing.',
      variant: 'error',
    });
  });

  it('opens the delist picker with the candidates when several listings match', async () => {
    listings = [shako, gc('G1', '9 wss'), gc('G2', '9 wss')];
    render(<DelistHandler />);
    await delistTrade(trade('Grand Charm', '9 wss'));
    expect(overlay.openPanel).toHaveBeenCalledWith('delist', { listings: [listings[1], listings[2]] });
    expect(confirmToast).not.toHaveBeenCalled();
    expect(deleteMarketListing).not.toHaveBeenCalled();
  });

  it('says so when no listing matches', async () => {
    listings = [shako];
    render(<DelistHandler />);
    await delistTrade(trade("Griffon's Eye", '3 HR'));
    expect(showToast).toHaveBeenCalledWith({
      title: 'Delist',
      description: "No active listing of yours matches Griffon's Eye.",
      variant: 'info',
    });
    expect(confirmToast).not.toHaveBeenCalled();
    expect(overlay.openPanel).not.toHaveBeenCalled();
  });

  it('reports a failed lookup', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    getMarketListings.mockRejectedValueOnce(new Error('500'));
    render(<DelistHandler />);
    await delistTrade(trade('Harlequin Crest', '2 HR'));
    expect(showToast).toHaveBeenCalledWith({
      title: 'Delist',
      description: 'Failed to look up your listings.',
      variant: 'error',
    });
  });
});
