// @vitest-environment happy-dom
import React, { useState } from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StatFilter, StatPreset } from '../lib/types';
import { MAX_OR_BLOCKS } from '../lib/stat-groups';
import { StatFilters } from './StatFilters';

// happy-dom rejects cancelled WAAPI animations: render motion.* as plain elements
vi.mock('framer-motion', () => import('@/pages/quick-list/motion-mock'));

const row = (id: string, over: Partial<StatFilter> = {}): StatFilter => ({
  id,
  kind: 'mod',
  key: 'item_fastercastrate',
  enabled: true,
  ...over,
});

function Harness({ initial, onStats }: { initial: StatFilter[]; onStats: (stats: StatFilter[]) => void }) {
  const [stats, setStats] = useState(initial);
  return (
    <StatFilters
      stats={stats}
      onChange={(next) => {
        setStats(next);
        onStats(next);
      }}
      builtInPresets={[] as StatPreset[]}
      userPresets={[]}
      onApplyPreset={vi.fn()}
      onSavePreset={vi.fn()}
      onRemovePreset={vi.fn()}
    />
  );
}

const mount = (initial: StatFilter[]) => {
  const onStats = vi.fn<(stats: StatFilter[]) => void>();
  render(<Harness initial={initial}
    onStats={onStats} />);
  return { latest: () => onStats.mock.calls.at(-1)?.[0] ?? initial };
};

afterEach(cleanup);

describe('StatFilters', () => {
  it('removes a row with its always-present remove button', () => {
    const { latest } = mount([row('a'), row('b', { key: 'maxhp' })]);
    fireEvent.click(screen.getByRole('button', { name: 'Remove Faster Cast Rate' }));
    expect(latest().map((s) => s.id)).toEqual(['b']);
  });

  const moveTo = (trigger: HTMLElement, option: RegExp) => {
    fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false });
    fireEvent.click(screen.getByRole('menuitemradio', { name: option }));
  };

  it('the group menu moves a row between AND, any-of blocks and NOT', () => {
    const { latest } = mount([row('a'), row('b', { key: 'maxhp' }), row('c', { key: 'strength' })]);
    expect(screen.queryByRole('region', { name: 'Any of' })).toBeNull();
    moveTo(screen.getByRole('button', { name: /Faster Cast Rate: required/ }), /^Any of \(OR\)/);
    expect(latest().find((s) => s.id === 'a')?.or).toBe(1);
    const group = screen.getByRole('region', { name: 'Any of' });
    expect(within(group).getByText('Faster Cast Rate')).toBeTruthy();

    // A second block: both are numbered
    moveTo(screen.getByRole('button', { name: /Life: required/ }), /^New any-of block/);
    expect(latest().find((s) => s.id === 'b')?.or).toBe(2);
    expect(screen.getByRole('region', { name: 'Any of 1' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Any of 2' })).toBeTruthy();

    moveTo(screen.getByRole('button', { name: /Strength: required/ }), /^Exclude/);
    expect(latest().find((s) => s.id === 'c')).toMatchObject({ not: true });
    expect(latest().find((s) => s.id === 'c')).not.toHaveProperty('or');
    expect(within(screen.getByRole('region', { name: 'None of' })).getByText('Strength')).toBeTruthy();

    // Emptying block 1 renumbers block 2 to 1
    moveTo(screen.getByRole('button', { name: /Faster Cast Rate: in any-of block 1/ }), /^Required/);
    expect(latest().find((s) => s.id === 'a')).not.toHaveProperty('or');
    expect(latest().find((s) => s.id === 'b')?.or).toBe(1);
    expect(screen.getByRole('region', { name: 'Any of' })).toBeTruthy();
  });

  it(`offers no new block once ${MAX_OR_BLOCKS} are in use`, () => {
    mount([row('x'), ...[1, 2, 3, 4, 5].map((n) => row(`b${n}`, { key: `stat${n}`, or: n }))]);
    fireEvent.pointerDown(screen.getByRole('button', { name: /Faster Cast Rate: required/ }), { button: 0 });
    expect(screen.getAllByRole('menuitemradio', { name: /^Any of \d/ })).toHaveLength(MAX_OR_BLOCKS);
    expect(screen.queryByRole('menuitemradio', { name: /New any-of block/ })).toBeNull();
  });

  it('drags a row by its grip into another group, or into a new block; Escape cancels', () => {
    const { latest } = mount([row('a'), row('b', { key: 'maxhp', or: 1 })]);
    let target = '';
    vi.spyOn(document, 'elementFromPoint').mockImplementation(() => document.querySelector(target));
    const drag = (id: string, to: string) => {
      const grip = document.querySelector(`[data-stat-grip="${id}"]`) as HTMLElement;
      target = to;
      fireEvent.pointerDown(grip, { button: 0, clientX: 10, clientY: 10, pointerId: 1 });
      fireEvent.pointerMove(grip, { clientX: 10, clientY: 60, pointerId: 1 });
      // Zones for missing groups appear once the drag starts: the next move can land on them
      fireEvent.pointerMove(grip, { clientX: 10, clientY: 62, pointerId: 1 });
      return grip;
    };

    fireEvent.pointerUp(drag('a', '[data-stat-drop="1"]'), { pointerId: 1 });
    expect(latest().map((s) => s.or)).toEqual([1, 1]);

    // The "new block" zone only exists mid-drag
    expect(document.querySelector('[data-stat-drop="new"]')).toBeNull();
    fireEvent.pointerUp(drag('b', '[data-stat-drop="new"]'), { pointerId: 1 });
    expect(latest().map((s) => s.or)).toEqual([1, 2]);

    const calls = latest();
    const grip = drag('a', '[data-stat-drop="not"]');
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.pointerUp(grip, { pointerId: 1 });
    expect(latest()).toBe(calls);
    vi.restoreAllMocks();
  });

  it('adds cube corruptions from the stat search; unrolled ones have no min/max', () => {
    const { latest } = mount([]);
    const search = screen.getByRole('combobox', { name: 'Add a stat filter' });
    fireEvent.focus(search);
    fireEvent.change(search, { target: { value: 'corrupted sockets' } });
    fireEvent.keyDown(search, { key: 'Enter' });
    expect(latest()).toMatchObject([{ kind: 'corruption', key: 'item_numsockets', enabled: true }]);
    expect(screen.getByText('Item has this corruption')).toBeTruthy();
    expect(screen.queryByRole('spinbutton', { name: 'Sockets min' })).toBeNull();

    fireEvent.change(search, { target: { value: 'corrupted faster cast' } });
    fireEvent.keyDown(search, { key: 'Enter' });
    expect(latest()[1]).toMatchObject({ kind: 'corruption', key: 'item_fastercastrate' });
    expect(screen.getByRole('spinbutton', { name: 'Faster Cast Rate min' })).toBeTruthy();
  });

  it('splits suggestions into Mods / Pseudo / Corruptions tabs; the best match picks the tab, Tab cycles', () => {
    const { latest } = mount([]);
    const search = screen.getByRole('combobox', { name: 'Add a stat filter' });
    const selected = () =>
      screen.getAllByRole('tab').find((t) => t.getAttribute('aria-selected') === 'true')?.textContent;
    fireEvent.focus(search);
    fireEvent.change(search, { target: { value: 'life' } });
    expect(selected()).toMatch(/^Pseudo/);
    fireEvent.click(screen.getByRole('tab', { name: /^Mods/ }));
    fireEvent.keyDown(search, { key: 'Enter' });
    expect(latest()[0].kind).toBe('mod');

    fireEvent.change(search, { target: { value: 'corrupted faster cast' } });
    expect(selected()).toMatch(/^Corruptions/);
    fireEvent.change(search, { target: { value: 'faster cast' } });
    const first = selected();
    fireEvent.keyDown(search, { key: 'Tab' });
    expect(selected()).not.toBe(first);
    while (!/^Corruptions/.test(selected() ?? '')) fireEvent.keyDown(search, { key: 'Tab' });
    fireEvent.keyDown(search, { key: 'Enter' });
    expect(latest()[1]).toMatchObject({ kind: 'corruption', key: 'item_fastercastrate' });
  });

  it('keeps the shown tab while typing on, as long as it has matches', () => {
    mount([]);
    const search = screen.getByRole('combobox', { name: 'Add a stat filter' });
    const selected = () =>
      screen.getAllByRole('tab').find((t) => t.getAttribute('aria-selected') === 'true')?.textContent;
    fireEvent.focus(search);
    fireEvent.change(search, { target: { value: 'fir' } });
    expect(selected()).toMatch(/^Pseudo/);
    // "fire" alone ranks a mod first; the Pseudo list still matches, so it stays
    fireEvent.change(search, { target: { value: 'fire' } });
    expect(selected()).toMatch(/^Pseudo/);
    fireEvent.change(search, { target: { value: 'firestorm' } });
    expect(selected()).toMatch(/^Mods/);
  });

  it('clears the search after a pick and keeps the focus, so the next stat can be typed', () => {
    const { latest } = mount([]);
    const search = screen.getByRole('combobox', { name: 'Add a stat filter' }) as HTMLInputElement;
    search.focus();
    fireEvent.change(search, { target: { value: 'paladin combat' } });
    fireEvent.keyDown(search, { key: 'Enter' });
    expect(latest()).toMatchObject([{ kind: 'mod', key: 'item_addskill_tab{24}' }]);
    expect(search.value).toBe('');
    expect(document.activeElement).toBe(search);
    expect(search.getAttribute('aria-expanded')).toBe('false');

    fireEvent.change(search, { target: { value: 'faster cast' } });
    expect(search.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getAllByRole('option').length).toBeGreaterThan(0);
  });

  it('does not reopen the list when the input only regains focus (the overlay taking the keyboard back)', () => {
    const { latest } = mount([]);
    const search = screen.getByRole('combobox', { name: 'Add a stat filter' });
    fireEvent.focus(search);
    fireEvent.change(search, { target: { value: 'paladin combat' } });
    fireEvent.keyDown(search, { key: 'Enter' });
    // The overlay hands the keyboard to the game and back: the input blurs, then is focused again
    fireEvent.blur(search);
    fireEvent.focus(search);
    expect(search.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('option')).toBeNull();
    expect(latest()).toHaveLength(1);

    fireEvent.change(search, { target: { value: 'faster cast' } });
    expect(search.getAttribute('aria-expanded')).toBe('true');
  });

  it('lists corruption rows after stat rows', () => {
    mount([row('c', { kind: 'corruption', key: 'item_numsockets' }), row('a'), row('b', { key: 'maxhp' })]);
    const names = screen.getAllByRole('button', { name: /^Remove / }).map((b) => b.getAttribute('aria-label'));
    expect(names.at(-1)).toMatch(/Remove .*Socket/i);
  });
});
