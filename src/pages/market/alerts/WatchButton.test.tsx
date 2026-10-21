// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { showToast } from '@/overlay';
import { defaultFilters } from '@/pages/market/lib/defaults';
import type { MarketFilters, SavedSearch } from '@/pages/market/lib/types';
import { resetMarketPrefs, syncSavedSearches } from '@/pages/market/store/useMarketStore';
import { createSavedSearch, listSavedSearches, SavedSearchApiError, updateSavedSearch } from './saved-search-api';
import type * as SavedSearchApi from './saved-search-api';
import { WatchButton } from './WatchButton';

vi.mock('@/overlay', () => ({ showToast: vi.fn() }));
// happy-dom rejects cancelled WAAPI animations (the Watch icon swap): render motion.* as plain elements
vi.mock('framer-motion', () => import('@/pages/quick-list/motion-mock'));
vi.mock('@/lib/browser-fs', () => ({
  BaseDirectory: { AppConfig: 13 },
  exists: vi.fn(async () => false),
  mkdir: vi.fn(async () => {}),
  readTextFile: vi.fn(),
  writeTextFile: vi.fn(async () => {}),
}));
vi.mock('./saved-search-api', async (importOriginal) => ({
  ...(await importOriginal<typeof SavedSearchApi>()),
  listSavedSearches: vi.fn(),
  createSavedSearch: vi.fn(),
  updateSavedSearch: vi.fn(),
}));

const LIMITS = { maxSearches: 25, maxAlerting: 10 };
const shako = (): MarketFilters => ({
  ...defaultFilters({ hardcore: false, ladder: true }),
  itemName: 'Harlequin Crest',
});
/** The same search as the server sends it back: normalized (row ids, sort and age window differ). */
const serverCopy = (id: string, alert: boolean): SavedSearch => ({
  id,
  name: 'Harlequin Crest · SC Ladder',
  filters: { ...shako(), maxAgeDays: 30, sort: { by: 'price', dir: 'asc' } },
  alert,
  createdAt: '2026-10-21T00:00:00Z',
});

const settle = () => act(() => vi.advanceTimersByTimeAsync(0));
const button = () => screen.getByRole('button');

async function signIn(items: SavedSearch[]) {
  vi.mocked(listSavedSearches).mockResolvedValue({ items, limits: LIMITS });
  await act(async () => syncSavedSearches('tok'));
  await settle();
}

beforeEach(() => {
  vi.useFakeTimers();
  resetMarketPrefs();
  vi.mocked(showToast).mockClear();
  vi.mocked(createSavedSearch).mockReset();
  vi.mocked(updateSavedSearch).mockReset();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('WatchButton', () => {
  it('watches the current filters, then shows Watching and stops watching on the next click', async () => {
    render(<WatchButton filters={shako()} />);
    await signIn([]);
    expect(button().textContent).toBe('Watch');

    vi.mocked(createSavedSearch).mockResolvedValue(serverCopy('w1', true));
    fireEvent.click(button());
    expect(createSavedSearch).toHaveBeenCalledWith('tok', { name: undefined, filters: shako(), alert: true });
    await settle();
    expect(button().textContent).toBe('Watching');
    expect(button().getAttribute('aria-pressed')).toBe('true');

    vi.mocked(updateSavedSearch).mockResolvedValue(serverCopy('w1', false));
    fireEvent.click(button());
    expect(updateSavedSearch).toHaveBeenCalledWith('tok', 'w1', { alert: false });
    await settle();
    expect(button().textContent).toBe('Watch');
  });

  it('recognises a watch saved elsewhere with the same filters (server-normalized)', async () => {
    render(<WatchButton filters={shako()} />);
    await signIn([serverCopy('w1', true)]);
    expect(button().textContent).toBe('Watching');
  });

  it('turns the alert on for an existing saved search with these filters instead of saving another', async () => {
    render(<WatchButton filters={shako()} />);
    await signIn([serverCopy('s1', false)]);
    vi.mocked(updateSavedSearch).mockResolvedValue(serverCopy('s1', true));
    fireEvent.click(button());
    expect(createSavedSearch).not.toHaveBeenCalled();
    expect(updateSavedSearch).toHaveBeenCalledWith('tok', 's1', { alert: true });
  });

  it('toasts when the server refuses the watch (cap) and goes back to Watch', async () => {
    render(<WatchButton filters={shako()} />);
    await signIn([]);
    vi.mocked(createSavedSearch).mockRejectedValue(new SavedSearchApiError('Alert limit reached (10)', 409));
    fireEvent.click(button());
    await settle();
    expect(button().textContent).toBe('Watch');
    expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Limit reached', variant: 'error' }));
  });

  it('refuses locally at the watch cap', async () => {
    const watched = Array.from({ length: 10 }, (_, i) => ({
      ...serverCopy(`w${i}`, true),
      filters: { ...shako(), itemName: `I${i}` },
    }));
    render(<WatchButton filters={shako()} />);
    await signIn(watched);
    fireEvent.click(button());
    expect(createSavedSearch).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Too many watches' }));
  });

  it('is disabled signed out and for sold-listing searches', async () => {
    const { rerender } = render(<WatchButton filters={shako()} />);
    expect((button() as HTMLButtonElement).disabled).toBe(true);
    await signIn([]);
    rerender(<WatchButton filters={{ ...shako(), source: 'archive' }} />);
    expect((button() as HTMLButtonElement).disabled).toBe(true);
    expect(button().getAttribute('aria-label')).toBe('Sold listings cannot be watched');
  });
});
