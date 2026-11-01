// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultFilters, mergeFilters, SITE_SEARCH_DEFAULTS } from '../lib/defaults';
import type { MarketFilters } from '../lib/types';
import { FilterSidebar } from './FilterSidebar';

afterEach(cleanup);

const stats = {
  builtInPresets: [],
  userPresets: [],
  onApplyPreset: vi.fn(),
  onSavePreset: vi.fn(),
  onRemovePreset: vi.fn(),
};

function renderSidebar(f: MarketFilters, sectionsOpen: Record<string, boolean> = {}) {
  const onChange = vi.fn();
  const onSectionOpen = vi.fn();
  render(
    <FilterSidebar
      filters={f}
      onChange={onChange}
      onReset={vi.fn()}
      searchDefaults={SITE_SEARCH_DEFAULTS}
      stats={stats}
      sectionsOpen={sectionsOpen}
      onSectionOpen={onSectionOpen}
    />,
  );
  return { onChange, onSectionOpen };
}

const base = defaultFilters({ hardcore: false, ladder: true });

describe('FilterSidebar', () => {
  it('lists the applied filters of collapsed sections, removable one at a time', () => {
    const f = mergeFilters(base, { corrupted: 'no', socketsMin: 1, hrMax: 3, typeCode: 'helm' });
    const { onChange, onSectionOpen } = renderSidebar(f);
    // Item is open: its filters show in their controls, not as chips
    expect(screen.queryByRole('button', { name: 'Remove filter: Helm' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Remove filter: HR price ≤ 3' }));
    expect(onChange).toHaveBeenCalledWith({ ...f, hrMin: undefined, hrMax: undefined });
    fireEvent.click(screen.getByRole('button', { name: 'Corrupted: No' }));
    expect(onSectionOpen).toHaveBeenCalledWith('Properties', true);
  });

  it('keeps the realm in the header and switches it there', () => {
    const { onChange } = renderSidebar(base);
    const realm = screen.getByRole('button', { name: 'Realm: Softcore · Ladder' });
    expect(realm.textContent).toBe('SC·L');
    fireEvent.pointerDown(realm, { button: 0, pointerType: 'mouse' });
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Hardcore · Non-ladder' }));
    expect(onChange).toHaveBeenCalledWith({ ...base, hardcore: true, ladder: false });
  });
});
