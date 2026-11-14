// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { exists, readTextFile, writeTextFile } from '@/lib/browser-fs';
import { defaultFilters } from '@/pages/market/lib/defaults';
import type { SavedSearch } from '@/pages/market/lib/types';
import { MARKET_PREFS_FILENAME, resetMarketPrefs, useMarketStore } from '@/pages/market/store/useMarketStore';
import { SavedSearches } from './SavedSearches';

vi.mock('@/overlay', () => ({ showToast: vi.fn(), undoToast: vi.fn() }));
// happy-dom rejects cancelled WAAPI animations (the Switch thumb): render motion.* as plain elements
vi.mock('framer-motion', () => import('@/pages/quick-list/motion-mock'));
vi.mock('@/lib/browser-fs', () => ({
  BaseDirectory: { AppConfig: 13 },
  exists: vi.fn(async () => false),
  mkdir: vi.fn(async () => {}),
  readTextFile: vi.fn(),
  writeTextFile: vi.fn(async () => {}),
}));

const filters = defaultFilters({ hardcore: false, ladder: true });
const saved = (id: string, name: string): SavedSearch => ({
  id,
  name,
  filters: { ...filters, itemName: name },
  watching: false,
  createdAt: '2026-10-21T00:00:00Z',
  updatedAt: '2026-10-21T00:00:00Z',
});

function Harness() {
  const store = useMarketStore();
  return <SavedSearches store={store}
    current={filters}
    onRun={() => {}} />;
}

const settle = () => act(() => vi.advanceTimersByTimeAsync(0));
const names = () => screen.getAllByRole('button', { name: /^Run / }).map((b) => b.getAttribute('aria-label')?.slice(4));
const lastWritten = () => {
  const calls = vi.mocked(writeTextFile).mock.calls.filter(([path]) => path === MARKET_PREFS_FILENAME);
  return JSON.parse(String(calls.at(-1)?.[1]));
};

beforeEach(() => {
  vi.useFakeTimers();
  resetMarketPrefs();
  vi.mocked(writeTextFile).mockClear();
  vi.mocked(exists).mockResolvedValue(true);
  vi.mocked(readTextFile).mockResolvedValue(
    JSON.stringify({ savedSearches: [saved('s', 'Shako'), saved('e', 'Enigma'), saved('j', 'Jah')] }),
  );
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('SavedSearches reordering', () => {
  it('moves a search up and down with its arrows and saves the order', async () => {
    render(<Harness />);
    await settle();
    expect(names()).toEqual(['Shako', 'Enigma', 'Jah']);
    // No way past the ends (aria-disabled, so an arrow keeps focus once its row gets there)
    expect(screen.getByRole('button', { name: 'Move Shako up' }).getAttribute('aria-disabled')).toBe('true');
    expect(screen.getByRole('button', { name: 'Move Jah down' }).getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Move Shako up' }));
    await settle();
    expect(names()).toEqual(['Shako', 'Enigma', 'Jah']);
    expect(writeTextFile).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Move Jah up' }));
    await settle();
    expect(names()).toEqual(['Shako', 'Jah', 'Enigma']);
    fireEvent.click(screen.getByRole('button', { name: 'Move Shako down' }));
    await settle();
    expect(names()).toEqual(['Jah', 'Shako', 'Enigma']);
    expect(lastWritten().savedSearches.map((s: SavedSearch) => s.id)).toEqual(['j', 's', 'e']);
  });
});
