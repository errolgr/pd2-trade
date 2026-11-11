// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetch } from '@/lib/browser-http';
import { useOptions } from '@/hooks/useOptions';
import { resetItemNameSuggestions } from '@/pages/market/hooks/useItemNameSuggestions';
import { defaultFilters, mergeFilters } from '@/pages/market/lib/defaults';
import type * as MarketStoreModule from '@/pages/market/store/useMarketStore';
import { PALETTE_DEBOUNCE_MS, type PaletteRef, type PaletteRunContext, type PaletteSourceInput } from '../lib/types';
import { buildsItemKey, useItemsSource } from './items';

vi.mock('@/lib/browser-http', () => ({ fetch: vi.fn() }));
vi.mock('@/lib/error-reporting', () => ({ reportApiError: vi.fn() }));
vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));
vi.mock('@/overlay', () => ({ showToast: vi.fn(), usePanel: () => ({ visible: false }) }));
vi.mock('@/pages/chat/hooks/useListingMarketPrices', () => ({ useMarketPrices: () => new Map() }));
vi.mock('@/pages/market/store/useMarketStore', async (importOriginal) => ({
  ...(await importOriginal<typeof MarketStoreModule>()),
  useMarketStore: () => ({ savedSearches: [] }),
}));

const HARLEQUIN = { baseCode: 'harlequin_crest', name: 'Harlequin Crest', quality: 'Unique' };
const reply = (hits: unknown[]) =>
  new Response(JSON.stringify({ hits }), { status: 200, headers: { 'Content-Type': 'application/json' } });

const input = (over: Partial<PaletteSourceInput> = {}): PaletteSourceInput => ({
  query: '',
  scope: null,
  limit: 5,
  refs: [],
  ...over,
});

function mount(initial: PaletteSourceInput) {
  return renderHook((props: PaletteSourceInput) => useItemsSource(props), { initialProps: initial });
}

const advance = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));
const context = () => ({ openPanel: vi.fn(), close: vi.fn(), scope: vi.fn() }) satisfies PaletteRunContext;

beforeEach(() => {
  vi.useFakeTimers();
  resetItemNameSuggestions();
  vi.mocked(useOptions).mockReturnValue({ settings: {} } as never);
});

afterEach(() => {
  cleanup();
  vi.mocked(fetch).mockReset();
  vi.useRealTimers();
});

describe('useItemsSource', () => {
  it('shows the nickname a server match was found by as its badge', async () => {
    vi.mocked(fetch).mockResolvedValue(reply([{ item: HARLEQUIN, score: 850, matchedOn: 'alias' }]));
    const { result } = mount(input({ query: 'shako' }));
    // The local list at once (the Shako base), the server asked after the pause
    expect(result.current.items.map((i) => i.ref.title)).toEqual(['Shako']);
    expect(result.current.loading).toBe(true);
    await advance(PALETTE_DEBOUNCE_MS);
    expect(result.current.loading).toBe(false);
    const [crest, base] = result.current.items;
    expect(crest).toMatchObject({ ref: { title: 'Harlequin Crest' }, badge: 'shako', subtitle: 'Unique · Helm' });
    expect(base).toMatchObject({ ref: { title: 'Shako' }, badge: undefined });
  });

  it('asks the server only from the minimum length on', async () => {
    const { result } = mount(input({ query: 'sh' }));
    await advance(PALETTE_DEBOUNCE_MS);
    expect(fetch).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  it('keeps the local matches and stops loading when the server fails', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('down', { status: 503 }));
    const { result } = mount(input({ query: 'harle' }));
    const local = result.current.items.map((i) => i.ref.id);
    expect(local.length).toBeGreaterThan(0);
    await advance(PALETTE_DEBOUNCE_MS);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(result.current.loading).toBe(false);
    expect(result.current.items.map((i) => i.ref.id)).toEqual(local);
  });

  it('rebuilds a recent from its ref without searching', async () => {
    vi.mocked(fetch).mockResolvedValue(reply([{ item: HARLEQUIN, score: 850, matchedOn: 'alias' }]));
    const { result, rerender } = mount(input({ query: 'shako' }));
    await advance(PALETTE_DEBOUNCE_MS);
    const found = result.current.items[0];
    expect(found.ref.data).toEqual({ name: 'Harlequin Crest', quality: 'Unique', baseCode: 'harlequin_crest' });
    vi.mocked(fetch).mockClear();

    const stale: PaletteRef = { id: 'items:Unique:Gone', group: 'items', title: 'Gone', data: { name: 'Gone' } };
    rerender(input({ refs: [JSON.parse(JSON.stringify(found.ref)) as PaletteRef, stale] }));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]).toMatchObject({ ref: found.ref, subtitle: found.subtitle, badge: undefined });
    await advance(PALETTE_DEBOUNCE_MS);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('Enter opens the market with what picking the suggestion in its item-name box sets', async () => {
    vi.mocked(fetch).mockResolvedValue(reply([{ item: HARLEQUIN, score: 850, matchedOn: 'alias' }]));
    const { result } = mount(input({ query: 'shako' }));
    await advance(PALETTE_DEBOUNCE_MS);
    const ctx = context();
    await result.current.items[0].primary.run(ctx);
    expect(ctx.openPanel).toHaveBeenCalledTimes(1);
    const [panel, payload] = ctx.openPanel.mock.calls[0];
    expect(panel).toBe('market');
    // The market merges the payload over its defaults; its name box sets `{ ...filters, itemName }`
    const base = defaultFilters({ hardcore: false, ladder: true });
    expect(mergeFilters(base, payload.filters)).toEqual({ ...base, itemName: 'Harlequin Crest' });
  });

  it('offers Watch, and Builds using it for uniques, sets and runewords only', async () => {
    const { result } = mount(input({ query: 'enigma' }));
    const enigma = result.current.items.find((i) => i.ref.title === 'Enigma');
    expect(enigma?.actions?.map((a) => a.id)).toEqual(['watch', 'builds', 'copy']);
    const ctx = context();
    await enigma?.actions?.[1].run(ctx);
    expect(ctx.openPanel).toHaveBeenCalledWith('builds', {
      tab: 'meta',
      filters: { mode: 'softcore', items: ['rw:enigma'] },
    });
    expect(buildsItemKey("Griffon's Eye", 'Unique')).toBe('unique:griffon_s_eye');
    expect(buildsItemKey('Shako', 'Base')).toBeNull();
  });
});
