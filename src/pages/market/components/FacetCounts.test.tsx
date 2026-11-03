// @vitest-environment happy-dom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { TooltipProvider } from '@pd2-trader/ui';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TriField } from './controls';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const withTooltips = (ui: React.ReactElement) => <TooltipProvider delayDuration={0}>{ui}</TooltipProvider>;

describe('TriField facets', () => {
  const tri = (counts?: { yes?: number; no?: number }) =>
    render(withTooltips(<TriField label="Corrupted"
      value="any"
      counts={counts}
      onChange={() => {}} />));
  const option = (name: RegExp) => screen.getByRole('radio', { name });

  it('hairlines Yes and No as their share of both, dims one that finds nothing', () => {
    tri({ yes: 30, no: 10 });
    const yes = option(/^Yes/);
    expect(yes.getAttribute('aria-label')).toBe('Yes · 30');
    expect(yes.querySelector<HTMLElement>('[data-facet-hairline]')?.style.width).toBe('calc((100% - 12px) * 0.75)');
    cleanup();

    tri({ yes: 0, no: 12 });
    expect(option(/^Yes/).className).toMatch(/opacity-30/);
    expect(option(/^No/).className).not.toMatch(/opacity-30/);
  });

  it('without counts: no hairlines, nothing dimmed', () => {
    tri({ yes: undefined, no: undefined });
    expect(document.querySelector('[data-facet-hairline]')).toBeNull();
    expect(option(/^Yes/).className).not.toMatch(/opacity-30/);
  });
});
