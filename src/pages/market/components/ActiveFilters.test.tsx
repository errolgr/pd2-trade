// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { activeFilters } from '../lib/active-filters';
import { defaultFilters, mergeFilters, SITE_SEARCH_DEFAULTS } from '../lib/defaults';
import { FilterSummary } from './ActiveFilters';
import { Section } from './controls';

afterEach(cleanup);

const f = mergeFilters(defaultFilters({ hardcore: false, ladder: true }), {
  typeCode: 'helm',
  baseCode: 'uap',
  rarity: ['Unique', 'Set'],
  corrupted: 'no',
  socketsMin: 1,
  socketsMax: 1,
  hrMax: 2.5,
  maxAgeDays: 7,
  requirements: { levelMin: 10, levelMax: 30 },
  stats: [
    { id: 's1', kind: 'mod', key: 'maxhp', min: 100, enabled: true },
    { id: 's2', kind: 'mod', key: 'strength', enabled: true, not: true },
  ],
});

const chipTexts = () => screen.getAllByRole('listitem').map((li) => li.querySelector('button')!.textContent);

describe('FilterSummary', () => {
  it('names each applied filter by its value', () => {
    render(
      <FilterSummary filters={f}
        active={activeFilters(f, SITE_SEARCH_DEFAULTS)}
        onChange={vi.fn()}
        onOpen={vi.fn()} />,
    );
    expect(chipTexts()).toEqual([
      'Life ≥ 100',
      'Not Strength',
      'Helm',
      'Shako',
      'Unique, Set',
      'Corrupted: No',
      'Sockets 1',
      'Listed within: 7 days',
      'HR price ≤ 2.5',
      'Level 10–30',
    ]);
  });

  it('removes one filter with its ✕ and opens the section from the chip', () => {
    const onChange = vi.fn();
    const onOpen = vi.fn();
    render(
      <FilterSummary
        filters={f}
        active={activeFilters(f, SITE_SEARCH_DEFAULTS).filter((a) => a.section === 'Properties')}
        onChange={onChange}
        onOpen={onOpen}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Remove filter: Corrupted: No' }));
    expect(onChange).toHaveBeenCalledWith({ ...f, corrupted: 'any' });
    fireEvent.click(screen.getByRole('button', { name: 'Sockets 1' }));
    expect(onOpen).toHaveBeenCalled();
  });
});

describe('Section summary', () => {
  it('shows the summary instead of the count badge while collapsed only', () => {
    const { rerender } = render(
      <Section title="Properties"
        active={2}
        open={false}
        summary={<span>summary</span>}>
        <span>body</span>
      </Section>,
    );
    expect(screen.queryByText('summary')).not.toBeNull();
    expect(screen.queryByText('2')).toBeNull();
    rerender(
      <Section title="Properties"
        active={2}
        open
        summary={<span>summary</span>}>
        <span>body</span>
      </Section>,
    );
    expect(screen.queryByText('summary')).toBeNull();
    expect(screen.queryByText('2')).not.toBeNull();
  });
});
