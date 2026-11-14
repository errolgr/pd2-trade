// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ItemTooltipCard } from './parts';

const KEY = {
  slot: 'Right Hand',
  name: 'Blackhand Key',
  quality: 'Unique',
  base: 'Grave Wand',
  runeword: false,
  ethereal: false,
  corrupted: true,
  sockets: 2,
  mods: ['+1 to All Skills', 'Corrupted'],
  socketed: [],
};

afterEach(cleanup);

describe('ItemTooltipCard', () => {
  it('says when the price is for the item’s corruption', () => {
    render(<ItemTooltipCard item={{ ...KEY, priceHr: 1.14, priceBasis: 'corruption' }} />);
    expect(screen.getByText('Priced for its corruption')).toBeTruthy();
    expect(screen.getByText('1.14 HR')).toBeTruthy();
  });

  it('shows the plain market value otherwise', () => {
    render(<ItemTooltipCard item={{ ...KEY, priceHr: 0.08, priceBasis: 'item' }} />);
    expect(screen.queryByText('Priced for its corruption')).toBeNull();
    render(<ItemTooltipCard item={{ ...KEY, priceHr: 0.08 }} />);
    expect(screen.queryByText('Priced for its corruption')).toBeNull();
  });
});
