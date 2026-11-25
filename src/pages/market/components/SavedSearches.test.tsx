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

const settle = () => act(() => vi.advanceTimersByTimeAsync(50));
const grip = (name: string) => screen.getByRole('button', { name: `Drag to reorder ${name}` });
/** dnd-kit's keyboard sensor: Space picks up, arrows move, Space drops, Escape cancels. */
const key = async (name: string, code: string) => {
  fireEvent.keyDown(grip(name), { code, key: code === 'Space' ? ' ' : code });
  await settle();
};
const names = () => screen.getAllByRole('button', { name: /^Run / }).map((b) => b.getAttribute('aria-label')?.slice(4));
const lastWritten = () => {
  const calls = vi.mocked(writeTextFile).mock.calls.filter(([path]) => path === MARKET_PREFS_FILENAME);
  return JSON.parse(String(calls.at(-1)?.[1]));
};

// happy-dom has no layout: give each row a 40px slot in list order so dnd-kit can measure where it is
const ROW = 40;
function stubLayout() {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const row = this.closest('li');
    const index = row?.parentElement ? Array.from(row.parentElement.children).indexOf(row) : 0;
    const top = row ? index * ROW : 0;
    const height = row ? ROW : ROW * 3;
    return { x: 0, y: top, top, left: 0, width: 300, height, right: 300, bottom: top + height, toJSON: () => ({}) };
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  resetMarketPrefs();
  vi.mocked(writeTextFile).mockClear();
  vi.mocked(exists).mockResolvedValue(true);
  vi.mocked(readTextFile).mockResolvedValue(
    JSON.stringify({ savedSearches: [saved('s', 'Shako'), saved('e', 'Enigma'), saved('j', 'Jah')] }),
  );
  stubLayout();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('SavedSearches reordering', () => {
  it('drags a search by its grip with the keyboard and saves the order', async () => {
    render(<Harness />);
    await settle();
    expect(names()).toEqual(['Shako', 'Enigma', 'Jah']);
    expect(screen.queryByRole('button', { name: /^Move / })).toBeNull();

    await key('Jah', 'Space');
    await key('Jah', 'ArrowUp');
    await key('Jah', 'ArrowUp');
    await key('Jah', 'Space');
    expect(names()).toEqual(['Jah', 'Shako', 'Enigma']);
    expect(lastWritten().savedSearches.map((s: SavedSearch) => s.id)).toEqual(['j', 's', 'e']);
  });

  it('leaves the order alone when a drag is cancelled with Escape', async () => {
    render(<Harness />);
    await settle();
    await key('Shako', 'Space');
    await key('Shako', 'ArrowDown');
    await key('Shako', 'Escape');
    expect(names()).toEqual(['Shako', 'Enigma', 'Jah']);
    expect(writeTextFile).not.toHaveBeenCalled();
  });

  it('shows no grip when there is only one saved search', async () => {
    vi.mocked(readTextFile).mockResolvedValue(JSON.stringify({ savedSearches: [saved('s', 'Shako')] }));
    render(<Harness />);
    await settle();
    expect(names()).toEqual(['Shako']);
    expect(screen.queryByRole('button', { name: /^Drag to reorder/ })).toBeNull();
  });
});
