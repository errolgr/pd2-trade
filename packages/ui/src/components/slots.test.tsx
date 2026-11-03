// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SLOT_TONES, SlotRow, isSlotTone, slotToneClass } from './slots';

afterEach(cleanup);

describe('slot tones', () => {
  it('validates tones', () => {
    for (const tone of SLOT_TONES) expect(isSlotTone(tone)).toBe(true);
    expect(isSlotTone('q-normal')).toBe(false);
    expect(isSlotTone('text-red-500')).toBe(false);
    expect(isSlotTone(undefined)).toBe(false);
  });

  it('falls back to the default tone for untrusted input', () => {
    expect(slotToneClass('bg-[url(evil)]')).toBe('text-foreground');
    expect(slotToneClass('danger')).toBe('text-destructive');
  });

  it('colours a row value by tone', () => {
    render(<SlotRow label="Value"
      value="3 HR"
      tone="success" />);
    expect(screen.getByText('3 HR').className).toContain('text-success');
  });
});
