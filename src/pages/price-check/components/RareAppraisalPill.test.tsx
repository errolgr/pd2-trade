// @vitest-environment happy-dom
import React from 'react';
import { MotionGlobalConfig } from 'framer-motion';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { RareAppraisal } from '@/lib/rare-appraisal-api';
import { RareAppraisalPill, RareAppraisalPillSkeleton } from './RareAppraisalPill';

vi.mock('@/hooks/useOptions', () => ({
  useOptions: () => ({ settings: {}, updateSettings: vi.fn(), isLoading: false }),
}));

// happy-dom's WAAPI rejects cancelled animations as unhandled errors; finish motion instantly instead.
beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
});
afterAll(() => {
  MotionGlobalConfig.skipAnimations = false;
});
afterEach(cleanup);

function appraisal(overrides: Partial<RareAppraisal> = {}): RareAppraisal {
  return {
    id: 'abc',
    name: 'Rune Loop',
    baseName: 'Ring',
    slot: 'ring',
    tab: null,
    position: null,
    verdict: 'keep',
    checkPriority: null,
    rank: 0.92,
    rankError: 0.1,
    stats: [],
    market: { lowHr: 1.5, highHr: 3.24, source: 'last-season', sampleSize: 40, mode: 'softcore' },
    modelMode: 'softcore',
    modelVersion: 'v1',
    ...overrides,
  };
}

function renderPill(props: Partial<React.ComponentProps<typeof RareAppraisalPill>> = {}) {
  return render(
    <TooltipProvider>
      <RareAppraisalPill appraisal={appraisal()}
        history={null}
        title="Rune Loop"
        {...props} />
    </TooltipProvider>,
  );
}

describe('RareAppraisalPillSkeleton', () => {
  it('announces that the rare is being appraised', () => {
    const { container } = render(<RareAppraisalPillSkeleton />);
    expect(container.textContent).toContain('Appraising rare...');
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
  });
});

describe('RareAppraisalPill', () => {
  it('shows the verdict, the rank within the slot and the usual asking band', () => {
    const { container } = renderPill();
    expect(screen.getByText('Keep')).not.toBeNull();
    expect(screen.getByText('top 8%')).not.toBeNull();
    expect(screen.getByText('of rings')).not.toBeNull();
    expect(container.textContent).toContain('1.5–3.2 HR');
    expect(container.textContent).toContain('usually listed');
  });

  it('reads a low rank as "bottom" and omits the band without market data', () => {
    const { container } = renderPill({ appraisal: appraisal({ verdict: 'vendor', rank: 0.12, market: null }) });
    expect(screen.getByText('Vendor')).not.toBeNull();
    expect(screen.getByText('bottom 12%')).not.toBeNull();
    expect(container.textContent).not.toContain('usually listed');
  });

  it('collapses a band whose ends format the same to a single value', () => {
    const { container } = renderPill({
      appraisal: appraisal({ market: { lowHr: 1, highHr: 1.02, source: 'current', sampleSize: 9, mode: 'softcore' } }),
    });
    expect(container.textContent).toContain('1.0 HR');
    expect(container.textContent).not.toContain('–');
  });

  it('adds a hardcore caveat tooltip only in hardcore mode', () => {
    const { container, unmount } = renderPill();
    expect(container.querySelector('[title^="Hardcore"]')).toBeNull();
    unmount();

    const hc = renderPill({ hardcore: true });
    const pill = hc.container.querySelector('[title^="Hardcore"]');
    expect(pill?.getAttribute('title')).toContain('price model and stars from softcore data');
  });

  it('hovering opens the detail popover with the item title and slot', () => {
    renderPill({ title: 'Doom Coil' });
    expect(screen.queryByText('Doom Coil')).toBeNull();
    fireEvent.mouseEnter(screen.getByText('top 8%').closest('.group')!.parentElement!);
    expect(screen.getByText('Doom Coil')).not.toBeNull();
    expect(screen.getByText(/Ring · est\. from S13 listings/)).not.toBeNull();
  });
});

describe('RareAppraisalPill crafted', () => {
  it('shows no crafted chips for rares', () => {
    renderPill();
    expect(screen.queryByText(/craft/i)).toBeNull();
    expect(screen.queryByText('Low confidence')).toBeNull();
  });

  it('shows the recipe chip without a low-confidence badge for a normal-confidence craft', () => {
    renderPill({ appraisal: appraisal({ quality: 'Crafted', recipe: 'caster', confidence: 'normal' }) });
    expect(screen.getByText('Caster craft')).not.toBeNull();
    expect(screen.queryByText('Low confidence')).toBeNull();
  });

  it('flags low confidence and falls back to "Crafted" without a recipe', () => {
    renderPill({ appraisal: appraisal({ quality: 'Crafted', recipe: null, confidence: 'low' }) });
    expect(screen.getByText('Crafted')).not.toBeNull();
    expect(screen.getByText('Low confidence')).not.toBeNull();
  });

  it('announces a crafted appraisal in the skeleton', () => {
    const { container } = render(<RareAppraisalPillSkeleton crafted />);
    expect(container.textContent).toContain('Appraising crafted item...');
  });
});
