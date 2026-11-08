// @vitest-environment happy-dom
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useOptions, type ISettings } from '@/hooks/useOptions';
import { useSimAccess } from '@/hooks/useSimAccess';
import { openUrl } from '@/lib/browser-opener';
import type { SimAccess } from '@/lib/sim-export-api';
import type { PaletteRunContext, PaletteSourceInput } from '../lib/types';
import { useSimSource } from './sim';

vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));
vi.mock('@/hooks/useSimAccess', () => ({ useSimAccess: vi.fn() }));
vi.mock('@/lib/browser-opener', () => ({ openUrl: vi.fn() }));
vi.mock('@/lib/pkce', () => ({ BACKEND_URL: 'https://pd2trader.test' }));

const NOW = Date.parse('2026-11-07T12:00:00Z');
const IN: SimAccess = { canUse: true, waitlistUrl: 'https://pd2trader.test/sim/beta', waitlistPosition: null };
const LAST = {
  character: 'HammerPal',
  goal: 'top_gear' as const,
  items: 3,
  url: 'https://pd2trader.test/sim/plan?export=last',
  sentAt: new Date(NOW - 2 * 60 * 60 * 1000).toISOString(),
};

let settings: Partial<ISettings>;
const scoped: PaletteSourceInput = { query: '', scope: { group: 'sim' }, limit: 20, refs: [] };
const ctx = { openPanel: vi.fn(), close: vi.fn(), scope: vi.fn() } as unknown as PaletteRunContext;

function items(input: PaletteSourceInput = scoped) {
  return renderHook(() => useSimSource(input)).result.current.items;
}
const titles = (input?: PaletteSourceInput) => items(input).map((item) => item.ref.title);
const run = (title: string) =>
  items()
    .find((item) => item.ref.title === title)!
    .primary.run(ctx);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  vi.clearAllMocks();
  localStorage.clear();
  settings = { pd2Token: 'tok', simCharacter: 'HammerPal', simLastExport: LAST };
  vi.mocked(useOptions).mockImplementation(() => ({ settings }) as ReturnType<typeof useOptions>);
  vi.mocked(useSimAccess).mockReturnValue(IN);
});
afterEach(() => {
  vi.useRealTimers();
});

describe('useSimSource', () => {
  it('lists the Horadric Sim shortcuts for beta users', () => {
    expect(titles()).toEqual(['Horadric Sim', 'Open planner · HammerPal', 'Last report', 'Send stash to Simulator']);
  });

  it('lists nothing unless beta access is known and granted', () => {
    vi.mocked(useSimAccess).mockReturnValue(undefined);
    expect(titles()).toEqual([]);
    vi.mocked(useSimAccess).mockReturnValue(null);
    expect(titles()).toEqual([]);
    vi.mocked(useSimAccess).mockReturnValue({ ...IN, canUse: false, waitlistPosition: 4 });
    expect(titles()).toEqual([]);
  });

  it('leaves out the last report once its link expired (24 h) and the planner without a default character', () => {
    settings = {
      pd2Token: 'tok',
      simLastExport: { ...LAST, sentAt: new Date(NOW - 25 * 60 * 60 * 1000).toISOString() },
    };
    expect(titles()).toEqual(['Horadric Sim', 'Send stash to Simulator']);
  });

  it('runs the right actions', async () => {
    await run('Horadric Sim');
    expect(ctx.openPanel).toHaveBeenCalledWith('sim');
    await run('Open planner · HammerPal');
    expect(openUrl).toHaveBeenLastCalledWith('https://pd2trader.test/sim/plan?import=HammerPal');
    await run('Last report');
    expect(openUrl).toHaveBeenLastCalledWith(LAST.url);
    await run('Send stash to Simulator');
    expect(ctx.openPanel).toHaveBeenLastCalledWith('currency', { tab: 'simulator' });
  });

  it('matches typed queries and resolves pinned refs on the empty state', () => {
    expect(titles({ query: 'stash', scope: null, limit: 5, refs: [] })).toEqual(['Send stash to Simulator']);
    expect(titles({ query: 'horadric', scope: null, limit: 2, refs: [] })).toHaveLength(2);
    expect(
      titles({ query: '', scope: null, limit: 5, refs: [{ id: 'sim:status', group: 'sim', title: 'Horadric Sim' }] }),
    ).toEqual(['Horadric Sim']);
  });
});
