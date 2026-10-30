// @vitest-environment happy-dom
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useOptions, type ISettings } from '@/hooks/useOptions';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { confirmToast, showToast, useOverlay, type OverlayApi } from '@/overlay';
import { isDiabloFocused } from '@/lib/diablo-focus';
import type { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import StashAutoDelistController, { STASH_POLL_MS } from './StashAutoDelistController';

vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));
vi.mock('@/hooks/pd2website/usePD2Website', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/pd2website/usePD2Website')>()),
  usePd2Website: vi.fn(),
}));
vi.mock('@/overlay', () => ({ confirmToast: vi.fn(), showToast: vi.fn(), useOverlay: vi.fn() }));
vi.mock('@/lib/diablo-focus', () => ({ isDiabloFocused: vi.fn() }));

const shako = (hash: string, storage = 'Shared Stash') =>
  ({
    hash,
    name: 'Harlequin Crest',
    base_code: 'uap',
    base: { name: 'Shako' },
    quality: { id: 7, name: 'Unique' },
    item_level: 85,
    socket_count: 0,
    is_ethereal: false,
    corrupted: false,
    modifiers: [{ name: 'item_allskills', values: [2], label: '', priority: 0 }],
    location: { storage, stash_page: 1 },
  }) as unknown as GameStashItem;

const ring = shako('r1');
ring.base_code = 'rin';

let settings: Partial<ISettings>;
let stash: GameStashItem[];
let listings: MarketListingEntry[];
const fetchStash = vi.fn(async () => ({ items: stash }));
const getMarketListings = vi.fn(async () => ({ data: listings }));
const deleteMarketListing = vi.fn(async () => {});
const openPanel = vi.fn();

const mount = async () => {
  render(<StashAutoDelistController />);
  await act(async () => {});
};
const nextPoll = () => act(async () => void (await vi.advanceTimersByTimeAsync(STASH_POLL_MS)));

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  settings = { account: 'MyAcc', mode: 'softcore', ladder: 'ladder', stashAutoDelist: 'auto' };
  stash = [shako('h1'), ring];
  listings = [{ _id: 'L1', item: { ...shako('h1'), account_id: 'myacc' } } as unknown as MarketListingEntry];
  vi.mocked(useOptions).mockImplementation(() => ({ settings }) as never);
  vi.mocked(usePd2Website).mockImplementation(
    () => ({ authData: { user: { _id: 'u1' } }, fetchStash, getMarketListings, deleteMarketListing }) as never,
  );
  vi.mocked(useOverlay).mockReturnValue({ openPanel } as unknown as OverlayApi);
  vi.mocked(isDiabloFocused).mockResolvedValue(true);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('StashAutoDelistController', () => {
  it('delists right away once the listed item leaves the stash, not when it moves tabs', async () => {
    await mount();
    stash = [shako('h7', 'Stash'), ring];
    await nextPoll();
    expect(deleteMarketListing).not.toHaveBeenCalled();

    stash = [ring];
    await nextPoll();
    expect(deleteMarketListing).toHaveBeenCalledWith('L1');
    expect(showToast).toHaveBeenCalledTimes(1);
  });

  it('asks first, and delists only on confirm', async () => {
    settings.stashAutoDelist = 'ask';
    await mount();
    stash = [ring];
    await nextPoll();
    expect(deleteMarketListing).not.toHaveBeenCalled();
    expect(confirmToast).toHaveBeenCalledTimes(1);

    await act(async () => void (await vi.mocked(confirmToast).mock.calls[0][0].onConfirm()));
    expect(deleteMarketListing).toHaveBeenCalledWith('L1');
  });

  it('lets the user pick when several look-alike listings could be the one that left', async () => {
    stash = [shako('h1'), shako('h2'), ring];
    listings = [
      { _id: 'L1', item: shako('x1') },
      { _id: 'L2', item: shako('x2') },
    ] as unknown as MarketListingEntry[];
    await mount();
    stash = [shako('h9'), ring];
    await nextPoll();
    expect(deleteMarketListing).not.toHaveBeenCalled();

    await act(async () => void (await vi.mocked(confirmToast).mock.calls[0][0].onConfirm()));
    expect(openPanel).toHaveBeenCalledWith('delist', { listings });
  });

  it('does nothing when turned off', async () => {
    settings.stashAutoDelist = 'off';
    await mount();
    stash = [ring];
    await nextPoll();
    expect(fetchStash).not.toHaveBeenCalled();
    expect(deleteMarketListing).not.toHaveBeenCalled();
  });

  it('ignores another game account\u2019s listing and an empty stash read', async () => {
    listings = [{ _id: 'L1', item: { ...shako('h1'), account_id: 'otheracc' } } as unknown as MarketListingEntry];
    await mount();
    expect(fetchStash).not.toHaveBeenCalled();

    listings = [{ _id: 'L1', item: shako('h1') } as unknown as MarketListingEntry];
    await vi.advanceTimersByTimeAsync(5 * 60_000);
    stash = [];
    await nextPoll();
    expect(deleteMarketListing).not.toHaveBeenCalled();

    stash = [ring];
    await nextPoll();
    expect(deleteMarketListing).toHaveBeenCalledWith('L1');
  });

  it('waits while Diablo is not in front', async () => {
    vi.mocked(isDiabloFocused).mockResolvedValue(false);
    await mount();
    await nextPoll();
    expect(fetchStash).not.toHaveBeenCalled();
  });
});
