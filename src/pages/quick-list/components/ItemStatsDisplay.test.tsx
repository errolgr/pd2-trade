// @vitest-environment happy-dom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import ItemStatsDisplay from './ItemStatsDisplay';

vi.mock('framer-motion', () => import('@/pages/quick-list/motion-mock'));

const item = (corruptions: unknown) =>
  ({
    hash: 'h1',
    name: 'Shako',
    corruptions,
    modifiers: [
      { name: 'item_maxhp_percent', label: '+10% Maximum Life' },
      { name: 'item_fastercastrate', label: '+20% Faster Cast Rate' },
    ],
  }) as unknown as GameStashItem;

const renderStats = (stashItem: GameStashItem) =>
  render(<ItemStatsDisplay stashItem={stashItem}
    isExpanded={false}
    onToggleExpanded={() => {}} />);

afterEach(cleanup);

describe('ItemStatsDisplay', () => {
  it('lists the corrupted mods first, in the corrupted colour', () => {
    const { container } = renderStats(item(['item_fastercastrate']));
    const lines = [...container.querySelectorAll('.leading-5')];
    expect(lines.map((l) => l.textContent)).toEqual(['+20% Faster Cast Rate', '+10% Maximum Life']);
    expect(lines[0].classList.contains('text-q-corrupted')).toBe(true);
  });

  it.each([[{ 0: 'item_fastercastrate' }], [7], [null]])('renders when PD2 sends corruptions as %j', (corruptions) => {
    renderStats(item(corruptions));
    expect(screen.getByText('+10% Maximum Life')).not.toBeNull();
    expect(screen.getByText('+20% Faster Cast Rate').classList.contains('text-q-corrupted')).toBe(false);
  });
});
