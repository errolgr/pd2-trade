// @vitest-environment happy-dom
import React, { useState } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetch } from '@/lib/browser-http';
import { BACKEND_URL } from '@/lib/pkce';
import { reportApiError } from '@/lib/error-reporting';
import { useOptions } from '@/hooks/useOptions';
import { defaultFilters } from '../lib/defaults';
import type { MarketFilters } from '../lib/types';
import { resetItemNameSuggestions, SUGGEST_DEBOUNCE_MS, SUGGEST_TIMEOUT_MS } from '../hooks/useItemNameSuggestions';
import { ItemNameSearch } from './ItemNameSearch';

vi.mock('@/lib/browser-http', () => ({ fetch: vi.fn() }));
vi.mock('@/lib/error-reporting', () => ({ reportApiError: vi.fn() }));
vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));
vi.mock('@/pages/chat/hooks/useListingMarketPrices', () => ({ useMarketPrices: () => new Map() }));

const HARLEQUIN = {
  baseCode: 'harlequin_crest',
  name: 'Harlequin Crest',
  category: 'uniques',
  typeCode: 'helm',
  quality: 'Unique',
  iconUrl: null,
  aliases: ['harle', 'harley', 'shako', 'uap'],
};
const GRIFFON = {
  baseCode: 'griffon_s_eye',
  name: "Griffon's Eye",
  category: 'uniques',
  typeCode: 'circ',
  quality: 'Unique',
  iconUrl: null,
  aliases: ['griffon', 'griffons', 'griff'],
};
const BANE_ASH = {
  baseCode: 'bane_ash',
  name: 'Bane Ash',
  category: 'uniques',
  typeCode: 'staf',
  quality: 'Unique',
  iconUrl: null,
  aliases: ['short staff', 'sst'],
};

type Hit = { item: typeof HARLEQUIN; score: number; matchedOn: 'code' | 'name' | 'alias' | 'fuzzy' };
const hit = (
  item: typeof HARLEQUIN,
  matchedOn: Hit['matchedOn'],
  score = matchedOn === 'fuzzy' ? 339.2 : 850,
): Hit => ({
  item,
  score,
  matchedOn,
});
const reply = (query: string, hits: Hit[]) =>
  new Response(JSON.stringify({ query, category: null, count: hits.length, hits }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

/** Answers each request when the test says so. */
function deferredFetch() {
  const pending: { url: string; resolve: (r: Response) => void }[] = [];
  vi.mocked(fetch).mockImplementation((url) => {
    const { promise, resolve } = Promise.withResolvers<Response>();
    pending.push({ url: String(url), resolve });
    return promise;
  });
  return pending;
}

const queryOf = (url: string) => new URL(url).searchParams.get('q');

function Harness({ onFilters }: { onFilters: (f: MarketFilters) => void }) {
  const [filters, setFilters] = useState(() => defaultFilters({ hardcore: false, ladder: true }));
  return (
    <ItemNameSearch
      value={filters.itemName}
      // As MarketBrowserPage wires it
      onChange={(itemName) => {
        const next = { ...filters, itemName };
        setFilters(next);
        onFilters(next);
      }}
      ladder={filters.ladder}
      hardcore={filters.hardcore}
    />
  );
}

function mount() {
  const onFilters = vi.fn<(f: MarketFilters) => void>();
  render(<Harness onFilters={onFilters} />);
  return { input: screen.getByRole('combobox'), filters: () => onFilters.mock.calls.at(-1)?.[0] };
}

const type = (input: HTMLElement, value: string) => fireEvent.change(input, { target: { value } });
const advance = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));
const names = () => screen.queryAllByRole('option').map((o) => o.textContent ?? '');

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

describe('ItemNameSearch suggestions', () => {
  it('shows the local matches at once and asks the server only after the debounce', async () => {
    const pending = deferredFetch();
    const { input } = mount();
    type(input, 'harle');
    expect(names()[0]).toMatch(/^Harlequin Crest/);
    // The typed text is highlighted in a substring match
    expect(screen.getAllByRole('option')[0].querySelector('mark')?.textContent).toBe('Harle');
    await advance(SUGGEST_DEBOUNCE_MS - 1);
    expect(fetch).not.toHaveBeenCalled();
    await advance(1);
    expect(pending.map((p) => queryOf(p.url))).toEqual(['harle']);
    expect(pending[0].url.startsWith(`${BACKEND_URL}/api/search?`)).toBe(true);
  });

  it('a typo finds the item once the server answers, with the nickname it matched and no highlight', async () => {
    const pending = deferredFetch();
    const { input } = mount();
    type(input, 'shko');
    expect(names()).toEqual([]);
    await advance(SUGGEST_DEBOUNCE_MS);
    await act(async () =>
      pending[0].resolve(reply('shko', [hit(HARLEQUIN, 'fuzzy', 339.2), hit(BANE_ASH, 'fuzzy', 301.8)])),
    );
    const [first] = screen.getAllByRole('option');
    expect(first.textContent).toContain('shako →');
    expect(first.textContent).toContain('Harlequin Crest');
    expect(first.textContent).toContain('close match');
    expect(first.querySelector('mark')).toBeNull();
    // A much weaker typo match is a look-alike: left out
    expect(names()).toHaveLength(1);
  });

  it('a nickname puts the server match first and keeps the local matches after it', async () => {
    const pending = deferredFetch();
    const { input } = mount();
    type(input, 'shako');
    expect(names()).toHaveLength(1);
    expect(names()[0]).toMatch(/^Shako/);
    await advance(SUGGEST_DEBOUNCE_MS);
    await act(async () => pending[0].resolve(reply('shako', [hit(HARLEQUIN, 'alias'), hit(BANE_ASH, 'fuzzy')])));
    const rows = names();
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatch(/^shako →Harlequin Crest/);
    expect(rows[1]).toMatch(/^Shako/);
  });

  it('ignores an answer for text that has since changed', async () => {
    const pending = deferredFetch();
    const { input } = mount();
    type(input, 'gri');
    await advance(SUGGEST_DEBOUNCE_MS);
    type(input, 'griffons');
    await advance(SUGGEST_DEBOUNCE_MS);
    expect(pending.map((p) => queryOf(p.url))).toEqual(['gri', 'griffons']);
    // The older request was cancelled
    expect(vi.mocked(fetch).mock.calls[0][1]?.signal?.aborted).toBe(true);
    await act(async () => pending[1].resolve(reply('griffons', [hit(GRIFFON, 'alias')])));
    await act(async () => pending[0].resolve(reply('gri', [hit(BANE_ASH, 'name')])));
    expect(names()).toHaveLength(1);
    expect(names()[0]).toMatch(/^griffons →Griffon's Eye/);
  });

  it('keeps the local list when the server fails, and reports only the first failure', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('down', { status: 503 }));
    const { input } = mount();
    type(input, 'harle');
    const local = names();
    await advance(SUGGEST_DEBOUNCE_MS);
    expect(names()).toEqual(local);
    type(input, 'harlequin');
    await advance(SUGGEST_DEBOUNCE_MS);
    expect(names()[0]).toMatch(/^Harlequin Crest/);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(reportApiError).toHaveBeenCalledTimes(1);
    expect(vi.mocked(reportApiError).mock.calls[0].slice(1, 4)).toEqual(['catalog-search', 'api/search', 503]);
  });

  it('gives up on a slow server: the local list stays and a late answer is dropped', async () => {
    const pending = deferredFetch();
    const { input } = mount();
    type(input, 'harle');
    const local = names();
    await advance(SUGGEST_DEBOUNCE_MS + SUGGEST_TIMEOUT_MS);
    expect(reportApiError).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fetch).mock.calls[0][1]?.signal?.aborted).toBe(true);
    await act(async () => pending[0].resolve(reply('harle', [hit(BANE_ASH, 'name')])));
    expect(names()).toEqual(local);
  });

  it('reuses an answer for text typed again instead of asking twice', async () => {
    vi.mocked(fetch).mockImplementation(async () => reply('shko', [hit(HARLEQUIN, 'fuzzy')]));
    const { input } = mount();
    type(input, 'shko');
    await advance(SUGGEST_DEBOUNCE_MS);
    type(input, 'shk');
    type(input, 'shko');
    expect(names()[0]).toContain('Harlequin Crest');
    await advance(SUGGEST_DEBOUNCE_MS);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('picking a server suggestion sets the same filters as picking it from the local list', async () => {
    const local = mount();
    type(local.input, 'harlequin');
    fireEvent.keyDown(local.input, { key: 'Enter' });
    const fromLocal = local.filters();
    cleanup();

    vi.mocked(fetch).mockImplementation(async () => reply('shko', [hit(HARLEQUIN, 'fuzzy')]));
    const server = mount();
    type(server.input, 'shko');
    await advance(SUGGEST_DEBOUNCE_MS);
    fireEvent.keyDown(server.input, { key: 'Enter' });
    expect(fromLocal?.itemName).toBe('Harlequin Crest');
    expect(server.filters()).toEqual(fromLocal);
  });

  it('arrow keys move through the server suggestions', async () => {
    vi.mocked(fetch).mockImplementation(async () =>
      reply('shko', [hit(HARLEQUIN, 'fuzzy', 320), hit(BANE_ASH, 'fuzzy', 301.8)]),
    );
    const { input, filters } = mount();
    type(input, 'shko');
    await advance(SUGGEST_DEBOUNCE_MS);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getAllByRole('option')[1].getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(filters()?.itemName).toBe('Bane Ash');
  });
});
