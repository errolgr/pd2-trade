// @vitest-environment happy-dom
import React, { useState } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SelectField, filterSelectOptions, type SelectOption } from './controls';

afterEach(cleanup);

const OPTIONS: SelectOption[] = [
  { value: 'bows', label: 'Bows', count: 40 },
  { value: 'abow', label: 'Amazon Bow', depth: 1, count: 10 },
  { value: 'bow', label: 'Bow', depth: 1, count: 30 },
  { value: 'helms', label: 'Helms', count: 0 },
  { value: 'circ', label: 'Circlet', depth: 1, count: 0 },
  { value: 'swor', label: 'Sword' },
];

function Harness({
  onChange,
  initial,
  disabled,
}: {
  onChange: (v: string | undefined) => void;
  initial?: string;
  disabled?: boolean;
}) {
  const [value, setValue] = useState(initial);
  return (
    <TooltipProvider delayDuration={0}>
      <SelectField
        label="Type"
        value={value}
        options={OPTIONS}
        disabled={disabled}
        onChange={(v) => {
          setValue(v);
          onChange(v);
        }}
      />
    </TooltipProvider>
  );
}

// The search box inside the open list is a combobox named after the field too
const trigger = () => screen.getAllByRole('combobox', { name: 'Type' }).find((e) => e.tagName === 'BUTTON')!;
const search = () => screen.getByPlaceholderText('Search…');
const names = () => screen.getAllByRole('option').map((o) => o.getAttribute('aria-label') ?? o.textContent);
const highlighted = () => screen.getAllByRole('option').find((o) => o.getAttribute('data-selected') === 'true');

function open(props: Partial<React.ComponentProps<typeof Harness>> = {}) {
  const onChange = vi.fn();
  render(<Harness onChange={onChange}
    {...props} />);
  fireEvent.click(trigger());
  return onChange;
}

describe('filterSelectOptions', () => {
  const labels = (q: string) => filterSelectOptions(OPTIONS, q).map((o) => o.label);

  it('matches labels case-insensitively, keeping a group with any matching member', () => {
    expect(labels('')).toHaveLength(OPTIONS.length);
    expect(labels('AMAZ')).toEqual(['Bows', 'Amazon Bow']);
    expect(labels('circ')).toEqual(['Helms', 'Circlet']);
    expect(labels('sw')).toEqual(['Sword']);
    expect(labels('nothing')).toEqual([]);
  });

  it('keeps all of a matching group’s members', () => {
    expect(labels('helm')).toEqual(['Helms', 'Circlet']);
    expect(labels('bow')).toEqual(['Bows', 'Amazon Bow', 'Bow']);
  });
});

describe('SelectField', () => {
  it('shows the current option on the trigger and lists Any, groups and counts', () => {
    open({ initial: 'abow' });
    expect(trigger().textContent).toBe('Amazon Bow');
    expect(names()).toEqual(['Any', 'Bows · 40', 'Amazon Bow · 10', 'Bow · 30', 'Helms · 0', 'Circlet · 0', 'Sword']);
    // Members are indented, an option that finds nothing is dimmed, the list opens on the current option
    expect(screen.getByRole('option', { name: 'Amazon Bow · 10' }).className).toMatch(/pl-5/);
    expect(screen.getByRole('option', { name: 'Helms · 0' }).className).toMatch(/opacity-30/);
    expect(highlighted()?.getAttribute('aria-label')).toBe('Amazon Bow · 10');
    expect(document.activeElement).toBe(search());
  });

  it('keeps the overlay keyboard while open, so typing reaches the search box instead of the game', () => {
    open();
    expect(trigger().hasAttribute('data-keep-keyboard')).toBe(true);
    expect(search().closest('[data-keep-keyboard]')).not.toBeNull();
  });

  it('filters as you type and picks with the arrow keys and Enter', () => {
    const onChange = open();
    fireEvent.change(search(), { target: { value: 'bow' } });
    expect(names()).toEqual(['Bows · 40', 'Amazon Bow · 10', 'Bow · 30']);
    expect(highlighted()?.getAttribute('aria-label')).toBe('Bows · 40');

    fireEvent.keyDown(search(), { key: 'ArrowDown' });
    fireEvent.keyDown(search(), { key: 'ArrowDown' });
    expect(highlighted()?.getAttribute('aria-label')).toBe('Bow · 30');
    fireEvent.keyDown(search(), { key: 'ArrowUp' });
    expect(highlighted()?.getAttribute('aria-label')).toBe('Amazon Bow · 10');
    fireEvent.keyDown(search(), { key: 'Enter' });
    expect(onChange).toHaveBeenLastCalledWith('abow');
    expect(screen.queryByRole('option')).toBeNull();
    expect(trigger().textContent).toBe('Amazon Bow');

    // Reopening starts from an empty search
    fireEvent.click(trigger());
    expect((search() as HTMLInputElement).value).toBe('');
  });

  it('highlights the first option matching itself, not its group, so Enter picks it', () => {
    const onChange = open();
    fireEvent.change(search(), { target: { value: 'ci' } });
    expect(names()).toEqual(['Helms · 0', 'Circlet · 0']);
    expect(highlighted()?.getAttribute('aria-label')).toBe('Circlet · 0');
    fireEvent.keyDown(search(), { key: 'Enter' });
    expect(onChange).toHaveBeenLastCalledWith('circ');
    expect(trigger().textContent).toBe('Circlet');
  });

  it('says when nothing matches, Escape closes without picking, Any clears the filter', () => {
    const onChange = open({ initial: 'swor' });
    fireEvent.change(search(), { target: { value: 'zzz' } });
    expect(screen.queryByRole('option')).toBeNull();
    expect(screen.getByText('Nothing matches')).toBeTruthy();
    act(() => {
      fireEvent.keyDown(search(), { key: 'Escape' });
    });
    expect(screen.queryByPlaceholderText('Search…')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.click(trigger());
    fireEvent.change(search(), { target: { value: 'any' } });
    fireEvent.keyDown(search(), { key: 'Enter' });
    expect(onChange).toHaveBeenLastCalledWith(undefined);
    expect(trigger().textContent).toBe('Any');
  });

  it('does not open when disabled', () => {
    open({ disabled: true });
    expect((trigger() as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByPlaceholderText('Search…')).toBeNull();
  });

  it('shows each count as text on the right of its row (0 too), before the picked row’s checkmark; none without facets', () => {
    open({ initial: 'abow' });
    const count = (name: string) =>
      screen.getByRole('option', { name }).querySelector('[data-facet-count]')?.textContent ?? null;
    expect(count('Bows · 40')).toBe('40');
    expect(count('Helms · 0')).toBe('0');
    expect(count('Sword')).toBeNull();
    expect(count('Any')).toBeNull();
    const picked = screen.getByRole('option', { name: 'Amazon Bow · 10' });
    expect(picked.textContent).toBe('Amazon Bow10');
    expect(picked.querySelector('[data-facet-count]')?.nextElementSibling?.querySelector('svg')).not.toBeNull();
  });

  it('Escape closes the list without picking', () => {
    const onChange = open({ initial: 'abow' });
    fireEvent.keyDown(search(), { key: 'Escape' });
    expect(screen.queryByPlaceholderText('Search…')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });
});

/** Several picks as a comma list: each pick toggles one entry, Any clears them. */
function MultiHarness({ onToggle }: { onToggle: (v: string) => void }) {
  const [value, setValue] = useState<string | undefined>('swor');
  const picked = value?.split(',') ?? [];
  return (
    <TooltipProvider delayDuration={0}>
      <SelectField
        label="Type"
        value={value}
        options={OPTIONS}
        onChange={setValue}
        onToggle={(v) => {
          onToggle(v);
          const next = picked.includes(v) ? picked.filter((p) => p !== v) : [...picked, v];
          setValue(next.length ? next.join(',') : undefined);
        }}
        selected={(v) => picked.includes(v)}
        valueLabel={
          value &&
          OPTIONS.filter((o) => picked.includes(o.value))
            .map((o) => o.label)
            .join(', ')
        }
      />
    </TooltipProvider>
  );
}

describe('SelectField with onToggle (multi-select)', () => {
  const option = (name: string) => screen.getByRole('option', { name });
  const checked = () =>
    screen
      .getAllByRole('option')
      .filter((o) => o.querySelector('svg'))
      .map((o) => o.getAttribute('aria-label') ?? o.textContent);
  function openMulti() {
    const onToggle = vi.fn();
    render(<MultiHarness onToggle={onToggle} />);
    fireEvent.click(trigger());
    return onToggle;
  }

  it('a click adds or removes an option and keeps the list open', () => {
    const onToggle = openMulti();
    fireEvent.click(option('Bows · 40'));
    expect(onToggle).toHaveBeenLastCalledWith('bows');
    expect(checked()).toEqual(['Bows · 40', 'Sword']);
    fireEvent.click(option('Helms · 0'));
    expect(checked()).toEqual(['Bows · 40', 'Helms · 0', 'Sword']);
    fireEvent.click(option('Sword'));
    expect(checked()).toEqual(['Bows · 40', 'Helms · 0']);
    expect(trigger().textContent).toBe('Bows, Helms');
  });

  it('Enter toggles the highlighted option; Any clears every pick and closes the list', () => {
    const onToggle = openMulti();
    fireEvent.change(search(), { target: { value: 'helms' } });
    fireEvent.keyDown(search(), { key: 'Enter' });
    expect(onToggle).toHaveBeenLastCalledWith('helms');
    expect(trigger().textContent).toBe('Helms, Sword');
    expect(screen.getAllByRole('option').length).toBeGreaterThan(0);

    fireEvent.change(search(), { target: { value: 'any' } });
    fireEvent.keyDown(search(), { key: 'Enter' });
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('option')).toBeNull();
    expect(trigger().textContent).toBe('Any');
  });

  it('shows Any as picked only when nothing is', () => {
    openMulti();
    expect(checked()).toEqual(['Sword']);
    fireEvent.click(option('Sword'));
    expect(checked()).toEqual(['Any']);
  });
});
