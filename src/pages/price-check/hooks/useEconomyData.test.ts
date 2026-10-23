// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useOptions, type ISettings } from '@/hooks/useOptions';
import type * as economyService from '../lib/economyService';
import { fetchEconomyData } from '../lib/economyService';
import type { EconomyData } from '../lib/types';
import { useEconomyData } from './useEconomyData';

vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));
vi.mock('../lib/economyService', async (importOriginal) => ({
  ...(await importOriginal<typeof economyService>()),
  fetchEconomyData: vi.fn(),
}));

let settings: Partial<ISettings>;

const berData = (price: number, numListings = 50): EconomyData => ({
  Runes: {
    'Ber Rune': {
      itemName: 'Ber Rune',
      proper: 'Ber Rune',
      dataByIngestionDate: [{ date: '2026-10-01', trueDate: '2026-10-01', numListings, price }],
    },
  },
});

const berPrice = (values: { name: string; price: number }[]) => values.find((r) => r.name === 'Ber Rune')?.price;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-06-01T12:00:00Z')); // during S13
  settings = { ladder: 'ladder', mode: 'softcore', selectedSeasonId: 'current' } as Partial<ISettings>;
  vi.mocked(useOptions).mockImplementation(() => ({
    isOpen: false,
    setIsOpen: vi.fn(),
    isLoading: false,
    settings: settings as ISettings,
    updateSettings: vi.fn(),
  }));
  vi.mocked(fetchEconomyData).mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('useEconomyData', () => {
  it('fetches with the ladder/mode/season of the settings and exposes API prices once loaded', async () => {
    const d = Promise.withResolvers<EconomyData>();
    vi.mocked(fetchEconomyData).mockReturnValue(d.promise);
    const { result } = renderHook(() => useEconomyData());

    expect(result.current.loading).toBe(true);
    expect(vi.mocked(fetchEconomyData).mock.calls[0][0]).toEqual({
      isLadder: true,
      isHardcore: false,
      startDate: '2026-04-23T00:00:00.000Z',
    });

    await act(async () => d.resolve(berData(3.5)));
    expect(result.current.loading).toBe(false);
    expect(berPrice(result.current.calculatedRuneValues)).toBe(3.5);
  });

  it('passes the end date of a past season and non-ladder hardcore flags', async () => {
    settings = { ladder: 'non-ladder', mode: 'hardcore', selectedSeasonId: 's12' } as Partial<ISettings>;
    vi.mocked(fetchEconomyData).mockResolvedValue({ Runes: {} });
    renderHook(() => useEconomyData());
    await act(async () => {});
    expect(vi.mocked(fetchEconomyData).mock.calls[0][0]).toEqual({
      isLadder: false,
      isHardcore: true,
      startDate: '2025-10-25T00:00:00.000Z',
      endDate: '2026-04-22T23:59:59.999Z',
    });
  });

  it('clears loading and keeps fallback rune values when the fetch fails', async () => {
    vi.mocked(fetchEconomyData).mockRejectedValue(new Error('down'));
    const { result } = renderHook(() => useEconomyData());
    await act(async () => {});
    expect(result.current.loading).toBe(false);
    expect(result.current.economyData).toEqual({ Runes: {} });
    // Fixed/fallback prices still provide a value list.
    expect(result.current.calculatedRuneValues.length).toBeGreaterThan(0);
  });

  it('refetches when the ladder setting changes, not on unrelated re-renders', async () => {
    vi.mocked(fetchEconomyData).mockResolvedValue({ Runes: {} });
    const { rerender } = renderHook(() => useEconomyData());
    await act(async () => {});
    rerender();
    await act(async () => {});
    expect(fetchEconomyData).toHaveBeenCalledTimes(1);

    settings = { ...settings, ladder: 'non-ladder' } as Partial<ISettings>;
    rerender();
    await act(async () => {});
    expect(fetchEconomyData).toHaveBeenCalledTimes(2);
    expect(vi.mocked(fetchEconomyData).mock.calls[1][0]?.isLadder).toBe(false);
  });

  it('derives rune combinations for the selected rune and clears them when deselected', async () => {
    vi.mocked(fetchEconomyData).mockResolvedValue({ Runes: {} });
    const { result } = renderHook(() => useEconomyData());
    await act(async () => {});
    expect(result.current.selectedRuneCombinations).toEqual([]);

    act(() => result.current.setSelectedRuneBreakdown('Ist Rune'));
    expect(result.current.selectedRuneBreakdown).toBe('Ist Rune');
    const istPrice = result.current.calculatedRuneValues.find((r) => r.name === 'Ist Rune')!.price;
    const combos = result.current.selectedRuneCombinations;
    expect(combos.length).toBeGreaterThan(0);
    for (const combo of combos) {
      expect(combo.runes.some((r) => r.name === 'Ist Rune')).toBe(false);
      expect(combo.totalValue).toBeLessThanOrEqual(istPrice + 1e-9);
      expect(combo.totalValue).toBeGreaterThanOrEqual(istPrice * 0.95 - 1e-9);
    }

    act(() => result.current.setSelectedRuneBreakdown(null));
    expect(result.current.selectedRuneCombinations).toEqual([]);
  });

  // BUG: useEconomyData has no cancellation; a slow response for the previous ladder setting that
  // resolves after the new one overwrites the newer prices (and clears `loading` early).
  it.fails('ignores a stale response that resolves after the settings changed', async () => {
    const ladder = Promise.withResolvers<EconomyData>();
    const nonLadder = Promise.withResolvers<EconomyData>();
    vi.mocked(fetchEconomyData).mockReturnValueOnce(ladder.promise).mockReturnValueOnce(nonLadder.promise);
    const { result, rerender } = renderHook(() => useEconomyData());

    settings = { ...settings, ladder: 'non-ladder' } as Partial<ISettings>;
    rerender();
    await act(async () => nonLadder.resolve(berData(2)));
    await act(async () => ladder.resolve(berData(5)));

    expect(berPrice(result.current.calculatedRuneValues)).toBe(2);
  });
});
