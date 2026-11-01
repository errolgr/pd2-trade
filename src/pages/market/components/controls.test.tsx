// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { Segmented } from './controls';

afterEach(cleanup);

type Tri = 'any' | 'yes' | 'no';
const OPTIONS: { value: Tri; label: string }[] = [
  { value: 'any', label: 'Any' },
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

function TriControl() {
  const [value, setValue] = useState<Tri>('yes');
  return <Segmented label="Corrupted"
    value={value}
    onChange={(v) => setValue(v)}
    options={OPTIONS} />;
}

describe('Segmented', () => {
  it('is one tab stop: the checked option', () => {
    render(<TriControl />);
    expect(screen.getAllByRole('radio').map((r) => r.tabIndex)).toEqual([-1, 0, -1]);
  });

  it('moves the choice and the focus with the arrow keys, Home and End (wrapping)', () => {
    render(<TriControl />);
    const radio = (name: string) => screen.getByRole('radio', { name });
    fireEvent.keyDown(radio('Yes'), { key: 'ArrowRight' });
    expect(radio('No').getAttribute('aria-checked')).toBe('true');
    expect(document.activeElement).toBe(radio('No'));
    fireEvent.keyDown(radio('No'), { key: 'ArrowDown' });
    expect(radio('Any').getAttribute('aria-checked')).toBe('true');
    fireEvent.keyDown(radio('Any'), { key: 'ArrowLeft' });
    expect(radio('No').getAttribute('aria-checked')).toBe('true');
    fireEvent.keyDown(radio('No'), { key: 'Home' });
    expect(radio('Any').getAttribute('aria-checked')).toBe('true');
    fireEvent.keyDown(radio('Any'), { key: 'End' });
    expect(radio('No').getAttribute('aria-checked')).toBe('true');
    expect(screen.getAllByRole('radio').map((r) => r.tabIndex)).toEqual([-1, -1, 0]);
  });
});
