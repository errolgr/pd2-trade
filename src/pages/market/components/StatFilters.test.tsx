// @vitest-environment happy-dom
import React, { useState } from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StatFilter, StatPreset } from '../lib/types';
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

  it('AND/OR toggle moves a row into the "Any of" group and back', () => {
    const { latest } = mount([row('a'), row('b', { key: 'maxhp' })]);
    expect(screen.queryByRole('region', { name: 'Any of' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Faster Cast Rate: required/ }));
    expect(latest().find((s) => s.id === 'a')?.or).toBe(true);
    const group = screen.getByRole('region', { name: 'Any of' });
    expect(within(group).getByText('Faster Cast Rate')).toBeTruthy();
    expect(within(group).getByText('add another OR row')).toBeTruthy();

    fireEvent.click(within(group).getByRole('button', { name: /Faster Cast Rate: one of the any-of group/ }));
    expect(latest().find((s) => s.id === 'a')?.or).toBeUndefined();
    expect(screen.queryByRole('region', { name: 'Any of' })).toBeNull();
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

  it('keeps the search after a pick; clicking the input brings the list back', () => {
    const { latest } = mount([]);
    const search = screen.getByRole('combobox', { name: 'Add a stat filter' }) as HTMLInputElement;
    fireEvent.focus(search);
    fireEvent.change(search, { target: { value: 'paladin combat' } });
    fireEvent.keyDown(search, { key: 'Enter' });
    expect(latest()).toMatchObject([{ kind: 'mod', key: 'item_addskill_tab{24}' }]);
    expect(search.value).toBe('paladin combat');
    expect([search.selectionStart, search.selectionEnd]).toEqual([0, 'paladin combat'.length]);
    expect(search.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(search);
    expect(search.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('option', { name: /\+# to Combat Skills \(Paladin Only\)/ })).toBeTruthy();
  });

  it('lists corruption rows after stat rows', () => {
    mount([row('c', { kind: 'corruption', key: 'item_numsockets' }), row('a'), row('b', { key: 'maxhp' })]);
    const names = screen.getAllByRole('button', { name: /^Remove / }).map((b) => b.getAttribute('aria-label'));
    expect(names.at(-1)).toMatch(/Remove .*Socket/i);
  });
});
