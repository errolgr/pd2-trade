// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { exists, readTextFile, writeTextFile } from '@/lib/browser-fs';
import { showToast } from '@/overlay';
import { defaultFilters } from '@/pages/market/lib/defaults';
import type { MarketFilters, SavedSearch } from '@/pages/market/lib/types';
import {
  getMarketPrefs,
  loadMarketPrefs,
  MARKET_PREFS_FILENAME,
  resetMarketPrefs,
} from '@/pages/market/store/useMarketStore';
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

const shako = (): MarketFilters => ({
  ...defaultFilters({ hardcore: false, ladder: true }),
  itemName: 'Harlequin Crest',
});
/** The same search saved another way (row ids, sort and age window differ). */
const savedCopy = (id: string, watching: boolean): SavedSearch => ({
  id,
  name: 'Harlequin Crest · SC L',
  filters: { ...shako(), maxAgeDays: 30, sort: { by: 'price', dir: 'asc' } },
  watching,
  createdAt: '2026-10-21T00:00:00Z',
  updatedAt: '2026-10-21T00:00:00Z',
});

const settle = () => act(() => vi.advanceTimersByTimeAsync(0));
const button = () => screen.getByRole('button');
const lastWritten = () => {
  const calls = vi.mocked(writeTextFile).mock.calls.filter(([path]) => path === MARKET_PREFS_FILENAME);
  return JSON.parse(String(calls.at(-1)?.[1]));
};

/** Starts from a market-prefs.json holding `savedSearches`. */
async function mountWith(savedSearches: SavedSearch[], filters: MarketFilters = shako()) {
  vi.mocked(exists).mockResolvedValue(true);
  vi.mocked(readTextFile).mockResolvedValue(JSON.stringify({ savedSearches }));
  const view = render(<WatchButton filters={filters} />);
  await settle();
  return view;
}

beforeEach(() => {
  vi.useFakeTimers();
  resetMarketPrefs();
  vi.mocked(showToast).mockClear();
  vi.mocked(writeTextFile).mockClear();
  vi.mocked(exists).mockResolvedValue(false);
  vi.mocked(readTextFile).mockReset();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('WatchButton', () => {
  it('watches the current filters without signing in, then stops watching on the next click', async () => {
    await mountWith([]);
    expect(button().textContent).toBe('Watch');
    expect((button() as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(button());
    await settle();
    expect(button().textContent).toBe('Watching');
    expect(button().getAttribute('aria-pressed')).toBe('true');
    const [saved] = getMarketPrefs().savedSearches;
    expect(saved).toMatchObject({ name: 'Harlequin Crest · SC L', filters: shako(), watching: true });
    expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Watching', variant: 'success' }));

    fireEvent.click(button());
    await settle();
    expect(button().textContent).toBe('Watch');
    // The saved search stays, without Watch
    expect(getMarketPrefs().savedSearches).toMatchObject([{ id: saved.id, watching: false }]);
    expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Stopped watching', variant: 'info' }));
  });

  it('keeps the watch across a restart (market-prefs.json)', async () => {
    await mountWith([]);
    fireEvent.click(button());
    await settle();
    const file = lastWritten();
    expect(file.savedSearches).toMatchObject([{ watching: true, filters: { itemName: 'Harlequin Crest' } }]);

    cleanup();
    resetMarketPrefs();
    vi.mocked(readTextFile).mockResolvedValue(JSON.stringify(file));
    render(<WatchButton filters={shako()} />);
    await settle();
    expect(button().textContent).toBe('Watching');
  });

  it('recognises a watch with the same filters saved another way', async () => {
    await mountWith([savedCopy('w1', true)]);
    expect(button().textContent).toBe('Watching');
  });

  it('watches an existing saved search with these filters instead of saving another', async () => {
    await mountWith([savedCopy('s1', false)]);
    fireEvent.click(button());
    await settle();
    expect(getMarketPrefs().savedSearches).toMatchObject([{ id: 's1', watching: true }]);
  });

  it('turns the alerts switch back on when watching starts', async () => {
    vi.mocked(exists).mockResolvedValue(true);
    vi.mocked(readTextFile).mockResolvedValue(JSON.stringify({ alertsEnabled: false }));
    await loadMarketPrefs();
    render(<WatchButton filters={shako()} />);
    await settle();
    fireEvent.click(button());
    expect(getMarketPrefs().alertsEnabled).toBe(true);
  });

  it('refuses at the watch cap, saying why', async () => {
    const watched = Array.from({ length: 10 }, (_, i) => ({
      ...savedCopy(`w${i}`, true),
      filters: { ...shako(), itemName: `I${i}` },
    }));
    await mountWith(watched);
    fireEvent.click(button());
    await settle();
    expect(button().textContent).toBe('Watch');
    expect(getMarketPrefs().savedSearches).toHaveLength(10);
    expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Too many watches' }));

    // Also when it would turn on an existing saved search
    cleanup();
    resetMarketPrefs();
    await mountWith([...watched, savedCopy('s1', false)]);
    fireEvent.click(button());
    await settle();
    expect(getMarketPrefs().savedSearches.find((s) => s.id === 's1')?.watching).toBe(false);
    expect(showToast).toHaveBeenLastCalledWith(expect.objectContaining({ title: 'Too many watches' }));
  });

  it('is disabled for sold-listing searches and without filters', async () => {
    const { rerender } = await mountWith([], { ...shako(), source: 'archive' });
    expect((button() as HTMLButtonElement).disabled).toBe(true);
    expect(button().getAttribute('aria-label')).toBe('Sold listings cannot be watched');
    rerender(<WatchButton filters={null} />);
    expect((button() as HTMLButtonElement).disabled).toBe(true);
  });
});
