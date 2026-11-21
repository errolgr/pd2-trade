// @vitest-environment happy-dom
import React, { useState } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AutoSearchToggle } from './SearchControls';

afterEach(cleanup);

function Toggle({ initial, onChange }: { initial: boolean; onChange?: (on: boolean) => void }) {
  const [on, setOn] = useState(initial);
  return (
    <TooltipProvider delayDuration={0}>
      <AutoSearchToggle
        value={on}
        onChange={(next) => {
          onChange?.(next);
          setOn(next);
        }}
      />
    </TooltipProvider>
  );
}

const bolt = () => screen.getByRole('button', { name: 'Auto search' });
const tooltip = async () => {
  await act(async () => {
    fireEvent.focus(bolt());
  });
  return screen.getByRole('tooltip').textContent;
};

describe('AutoSearchToggle', () => {
  it('is pressed while Auto search is on, a click turns it off and says how to search', async () => {
    const onChange = vi.fn();
    render(<Toggle initial
      onChange={onChange} />);
    expect(bolt().getAttribute('aria-pressed')).toBe('true');
    expect(await tooltip()).toContain('Auto search on: results update as you change filters.');

    fireEvent.click(bolt());
    expect(onChange).toHaveBeenLastCalledWith(false);
    expect(bolt().getAttribute('aria-pressed')).toBe('false');
    cleanup();
    render(<Toggle initial={false} />);
    expect(await tooltip()).toContain('Auto search off: press Search (Ctrl+Enter)');
  });

  it('turns back on from off', () => {
    const onChange = vi.fn();
    render(<Toggle initial={false}
      onChange={onChange} />);
    fireEvent.click(bolt());
    expect(onChange).toHaveBeenLastCalledWith(true);
    expect(bolt().getAttribute('aria-pressed')).toBe('true');
  });
});
