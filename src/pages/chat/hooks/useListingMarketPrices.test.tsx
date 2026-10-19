// @vitest-environment happy-dom
import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useOptions } from '@/hooks/useOptions';
import { fetchMultipleItemPrices, type AveragePriceResponse } from '@/pages/currency/lib/price-api';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { useListingMarketPrices } from './useListingMarketPrices';

vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));
vi.mock('@/pages/currency/lib/price-api', () => ({ fetchMultipleItemPrices: vi.fn() }));

const listing = (id: string, item: Record<string, unknown>, hardcore = false) =>
  ({
    _id: id,
    is_ladder: true,
    is_hardcore: hardcore,
    hr_price: 1,
    item: { is_identified: true, ...item },
  }) as unknown as MarketListingEntry;
const rune = (id: string, code: string, hardcore = false) =>
  listing(id, { name: 'Rune', base_code: code, base: { id: code }, quality: { name: 'Normal' } }, hardcore);
const unique = (id: string, name: string, hardcore = false) =>
  listing(id, { name, quality: { name: 'Unique' }, base: { name: 'Base' } }, hardcore);

const price = (baseCode: string, medianPrice: number, movingAverage7Days = medianPrice) =>
  ({ baseCode, medianPrice, movingAverage7Days }) as AveragePriceResponse;

function Pill({ entry }: { entry: MarketListingEntry }) {
  const market = useListingMarketPrices([entry]).get(entry._id);
  return <span data-testid={entry._id}>{market ? `${market.hr} ${market.window}` : 'none'}</span>;
}

const thread = (entries: MarketListingEntry[]) => (
  <>
    {entries.map((entry) => (
      <Pill key={entry._id}
        entry={entry} />
    ))}
  </>
);

beforeEach(() => {
  vi.mocked(useOptions).mockReturnValue({ settings: { priceWindowHours: 168 } } as never);
  vi.mocked(fetchMultipleItemPrices).mockReset();
  vi.mocked(fetchMultipleItemPrices).mockImplementation(async (items) => {
    const prices: Record<string, AveragePriceResponse> = {
      r20: price('r20', 0.2, 0.25),
      r21: price('r21', 0.3, 0.35),
      gheed_s_fortune: price('gheed_s_fortune', 1.5),
    };
    return new Map(items.filter((i) => prices[i.baseCode]).map((i) => [i.baseCode, prices[i.baseCode]]));
  });
});
afterEach(cleanup);

describe('useListingMarketPrices', () => {
  it("batches a thread's pills into one request per realm, deduped, in the listing's own mode", async () => {
    render(thread([rune('a', 'r20'), rune('b', 'r20s'), unique('c', "Gheed's Fortune"), rune('d', 'r20', true)]));

    await waitFor(() => expect(screen.getByTestId('d').textContent).toBe('0.25 7d'));
    expect(fetchMultipleItemPrices).toHaveBeenCalledTimes(2);
    const calls = vi.mocked(fetchMultipleItemPrices).mock.calls;
    const softcore = calls.find(([, config]) => !config!.isHardcore)!;
    const hardcore = calls.find(([, config]) => config!.isHardcore)!;
    expect(softcore[0].map((i) => i.baseCode).sort()).toEqual(['gheed_s_fortune', 'r20']);
    expect(softcore[1]).toMatchObject({ isLadder: true, isHardcore: false, hours: 168 });
    expect(hardcore[0]).toEqual([{ baseCode: 'r20' }]);
  });

  it('quotes runes by their 7-day moving average and other items by the median', async () => {
    render(thread([rune('e', 'r21'), unique('f', "Gheed's Fortune")]));
    await waitFor(() => expect(screen.getByTestId('e').textContent).toBe('0.35 7d'));
    expect(screen.getByTestId('f').textContent).toBe('1.5 7d');
  });

  it('leaves items without a crawler price or code unpriced', async () => {
    render(
      thread([unique('g', 'Nothing Sold'), rune('h', 'r21'), listing('i', { name: 'Enigma', is_runeword: true })]),
    );
    await waitFor(() => expect(screen.getByTestId('h').textContent).toBe('0.35 7d'));
    expect(screen.getByTestId('g').textContent).toBe('none');
    expect(screen.getByTestId('i').textContent).toBe('none');
  });

  it('serves re-renders and reopened threads from the cache', async () => {
    const entries = [rune('j', 'r20'), unique('k', "Gheed's Fortune")];
    const { rerender, unmount } = render(thread(entries));
    await waitFor(() => expect(screen.getByTestId('j').textContent).not.toBe('none'));
    const calls = vi.mocked(fetchMultipleItemPrices).mock.calls.length;

    rerender(thread([...entries]));
    unmount();
    render(thread(entries));
    expect(screen.getByTestId('j').textContent).toBe('0.25 7d');
    await Promise.resolve();
    expect(fetchMultipleItemPrices).toHaveBeenCalledTimes(calls);
  });
});
