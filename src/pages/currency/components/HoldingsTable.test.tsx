// @vitest-environment happy-dom
import React from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { ValuationLine } from '@/lib/networth-api';
import { HoldingsTable } from './HoldingsTable';

afterEach(cleanup);

function line(overrides: Partial<ValuationLine> & Pick<ValuationLine, 'key' | 'name'>): ValuationLine {
  return {
    category: 'runes',
    qty: 1,
    unitPrice: 1,
    value: 1,
    confidence: 'ok',
    sampleCount: 20,
    priceChange7dPercent: null,
    tab: null,
    iconPath: null,
    ...overrides,
  };
}

const LINES: ValuationLine[] = [
  line({ key: 'ist', name: 'Ist Rune', qty: 4, unitPrice: 0.5, value: 2, priceChange7dPercent: 12.4, tab: 'Shared 1' }),
  line({ key: 'ber', name: 'Ber Rune', qty: 1, unitPrice: 6, value: 6, priceChange7dPercent: -3.6, tab: 'Shared 2' }),
  line({ key: 'mal', name: 'Mal Rune', qty: 2, unitPrice: null, value: 0.5, confidence: 'fixed', tab: 'Shared 1' }),
  line({ key: 'el', name: 'El Rune', qty: 30, unitPrice: null, value: 0, confidence: 'none', sampleCount: 0 }),
];

function renderTable(props: Partial<React.ComponentProps<typeof HoldingsTable>> = {}) {
  return render(
    <TooltipProvider>
      <HoldingsTable lines={LINES}
        totalHr={8.5}
        {...props} />
    </TooltipProvider>,
  );
}

/** Item names of the body rows, top to bottom. */
function rowNames(): string[] {
  const body = document.querySelector('tbody')!;
  return [...body.querySelectorAll('tr')].map((tr) => tr.querySelector('td p')?.textContent ?? tr.textContent ?? '');
}

function rowCells(name: string): string[] {
  const row = [...document.querySelectorAll('tbody tr')].find((tr) => tr.querySelector('td p')?.textContent === name)!;
  return [...row.querySelectorAll('td')].map((td) => td.textContent ?? '');
}

function search(text: string) {
  fireEvent.change(screen.getByLabelText('Search holdings'), { target: { value: text } });
}

describe('HoldingsTable', () => {
  it('lists holdings by value, highest first, with zero-value rows hidden by default', () => {
    renderTable();
    expect(rowNames()).toEqual(['Ber Rune', 'Ist Rune', 'Mal Rune']);
    expect(screen.getByText(/1 zero-value row hidden/)).not.toBeNull();
    expect(screen.getByRole('columnheader', { name: /Value/ }).getAttribute('aria-sort')).toBe('descending');
  });

  it('formats unit price, share of total and 7d change per row', () => {
    renderTable();
    // Item, Qty, Unit, Value, %, 7d, Price
    expect(rowCells('Ber Rune').slice(1, 6)).toEqual(['1', '6.00', '6.00 HR', '70.6%', '▼4%']);
    expect(rowCells('Ist Rune').slice(1, 6)).toEqual(['4', '0.50', '2.00 HR', '23.5%', '▲12%']);
    expect(rowCells('Mal Rune').slice(1, 6)).toEqual(['2', '—', '0.50 HR', '5.9%', '—']);
    expect(rowCells('Mal Rune')[6]).toBe('fixed');
  });

  it('shows a 0% share instead of dividing by a zero total', () => {
    renderTable({ totalHr: 0 });
    expect(rowCells('Ber Rune')[4]).toBe('0.0%');
  });

  it('footer totals only the visible holdings', () => {
    renderTable();
    expect(screen.getByText(/3 holdings/).textContent).toBe('3 holdings · 8.50 HR');
    search('ber');
    expect(screen.getByText(/1 holding\b/).textContent).toBe('1 holding · 6.00 HR');
  });

  it('cycles a column through ascending, descending and back to unsorted', () => {
    renderTable();
    fireEvent.click(screen.getByRole('button', { name: 'Item: sort ascending' }));
    expect(rowNames()).toEqual(['Ber Rune', 'Ist Rune', 'Mal Rune']);
    expect(screen.getByRole('columnheader', { name: /Item/ }).getAttribute('aria-sort')).toBe('ascending');
    expect(screen.getByRole('columnheader', { name: /Value/ }).getAttribute('aria-sort')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Item: sort descending' }));
    expect(rowNames()).toEqual(['Mal Rune', 'Ist Rune', 'Ber Rune']);

    fireEvent.click(screen.getByRole('button', { name: 'Item: clear sorting' }));
    expect(rowNames()).toEqual(['Ist Rune', 'Ber Rune', 'Mal Rune']);
    expect(screen.getByRole('columnheader', { name: /Item/ }).getAttribute('aria-sort')).toBeNull();
  });

  it('sorts numeric columns by number, not by text', () => {
    renderTable();
    fireEvent.click(screen.getByRole('button', { name: 'Qty: sort ascending' }));
    expect(rowNames()).toEqual(['Ber Rune', 'Mal Rune', 'Ist Rune']);
    fireEvent.click(screen.getByRole('button', { name: 'Qty: sort descending' }));
    expect(rowNames()).toEqual(['Ist Rune', 'Mal Rune', 'Ber Rune']);
  });

  it('keeps unpriced rows last when sorting by unit price in either direction', () => {
    renderTable();
    fireEvent.click(screen.getByRole('button', { name: 'Unit: sort ascending' }));
    expect(rowNames()).toEqual(['Ist Rune', 'Ber Rune', 'Mal Rune']);
    fireEvent.click(screen.getByRole('button', { name: 'Unit: sort descending' }));
    expect(rowNames()).toEqual(['Ber Rune', 'Ist Rune', 'Mal Rune']);
  });

  it('keeps rows without 7d change last when sorting by change', () => {
    renderTable();
    fireEvent.click(screen.getByRole('button', { name: '7d: sort ascending' }));
    expect(rowNames()).toEqual(['Ber Rune', 'Ist Rune', 'Mal Rune']);
    fireEvent.click(screen.getByRole('button', { name: '7d: sort descending' }));
    expect(rowNames()).toEqual(['Ist Rune', 'Ber Rune', 'Mal Rune']);
  });

  it('does not offer sorting on the price confidence column', () => {
    renderTable();
    const header = screen.getByRole('columnheader', { name: 'Price' });
    expect(within(header).queryByRole('button')).toBeNull();
  });

  it('filters by item name or stash tab, case-insensitively and ignoring surrounding spaces', () => {
    renderTable();
    search('  RUNE ');
    expect(rowNames()).toEqual(['Ber Rune', 'Ist Rune', 'Mal Rune']);
    search('shared 1');
    expect(rowNames()).toEqual(['Ist Rune', 'Mal Rune']);
    search('ist');
    expect(rowNames()).toEqual(['Ist Rune']);
  });

  it('clears the search with the clear button and with Escape', () => {
    renderTable();
    expect(screen.queryByRole('button', { name: 'Clear search' })).toBeNull();
    search('ber');
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect((screen.getByLabelText('Search holdings') as HTMLInputElement).value).toBe('');
    expect(rowNames()).toHaveLength(3);

    search('ber');
    fireEvent.keyDown(screen.getByLabelText('Search holdings'), { key: 'Escape' });
    expect((screen.getByLabelText('Search holdings') as HTMLInputElement).value).toBe('');
  });

  it('lets Escape bubble (e.g. to close the window) when the search is already empty', () => {
    renderTable();
    let bubbled = 0;
    const onKeyDown = () => bubbled++;
    document.addEventListener('keydown', onKeyDown);
    try {
      search('ber');
      fireEvent.keyDown(screen.getByLabelText('Search holdings'), { key: 'Escape' });
      expect(bubbled).toBe(0);
      fireEvent.keyDown(screen.getByLabelText('Search holdings'), { key: 'Escape' });
      expect(bubbled).toBe(1);
    } finally {
      document.removeEventListener('keydown', onKeyDown);
    }
  });

  it('shows zero-value rows after turning off "Hide zero value"', () => {
    renderTable();
    fireEvent.click(screen.getByRole('switch'));
    expect(rowNames()).toEqual(['Ber Rune', 'Ist Rune', 'Mal Rune', 'El Rune']);
    expect(screen.queryByText(/zero-value/)).toBeNull();
    expect(rowCells('El Rune')[6]).toBe('unpriced');
  });

  it('pluralizes the hidden zero-value note', () => {
    renderTable({ lines: [...LINES, line({ key: 'eld', name: 'Eld Rune', value: 0 })] });
    expect(screen.getByText(/2 zero-value rows hidden/)).not.toBeNull();
  });

  it('says the stash has none when there are no lines at all', () => {
    renderTable({ lines: [] });
    expect(screen.getByText('None in your stash.')).not.toBeNull();
    expect(screen.queryByText(/holdings? ·/)).toBeNull();
  });

  it('says nothing matches when every line is filtered out', () => {
    renderTable();
    search('zod');
    expect(screen.getByText('Nothing matches.')).not.toBeNull();
    expect(screen.queryByText(/holdings? ·/)).toBeNull();
  });

  it('says nothing matches when every line is a hidden zero-value row', () => {
    renderTable({ lines: [line({ key: 'el', name: 'El Rune', value: 0 })] });
    expect(screen.getByText('Nothing matches.')).not.toBeNull();
    expect(screen.getByText(/1 zero-value row hidden/)).not.toBeNull();
  });

  it('shows the stash tab under the name only when asked to', () => {
    renderTable({ showTab: true });
    expect(rowCells('Ber Rune')[0]).toBe('Ber RuneShared 2');
    cleanup();
    renderTable();
    expect(rowCells('Ber Rune')[0]).toBe('Ber Rune');
  });

  it('falls back to the category dot when the item icon fails to load', () => {
    renderTable({ lines: [line({ key: 'ber', name: 'Ber Rune', iconPath: '/ber.png' })] });
    const img = document.querySelector('tbody img')!;
    expect(img.getAttribute('src')).toBe('/ber.png');
    fireEvent.error(img);
    expect(document.querySelector('tbody img')).toBeNull();
  });

  it('renders the toolbar slot next to the filters', () => {
    renderTable({ toolbar: <button type="button">Rune exchange</button> });
    expect(screen.getByRole('button', { name: 'Rune exchange' })).not.toBeNull();
  });
});
