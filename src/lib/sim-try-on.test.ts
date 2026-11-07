// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameData, Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import { openUrl } from '@/lib/browser-opener';
import { getSimLadderCharacters } from '@/lib/sim-characters';
import type * as SimCharacters from '@/lib/sim-characters';
import { createSimExport, SimExportApiError } from '@/lib/sim-export-api';
import type * as SimExportApi from '@/lib/sim-export-api';
import { findSimItem } from '@/lib/sim-item-sources';
import type { Item as PriceCheckItem } from '@/pages/price-check/lib/interfaces';
import { simListingPlanUrl, simPlannerUrl, tryOnItem, type SimTryOnDeps } from './sim-try-on';

vi.mock('@/hooks/pd2website/usePD2Website', () => {
  class AuthenticationError extends Error {}
  class AccountMismatchError extends Error {}
  return { AuthenticationError, AccountMismatchError };
});
vi.mock('@/lib/browser-opener', () => ({ openUrl: vi.fn() }));
vi.mock('@/lib/pkce', () => ({ BACKEND_URL: 'https://pd2trader.test' }));
vi.mock('@/lib/telemetry', () => ({ trackMeasurement: vi.fn() }));
vi.mock('@/lib/sim-characters', async (importOriginal) => ({
  ...(await importOriginal<typeof SimCharacters>()),
  getSimLadderCharacters: vi.fn(),
}));
vi.mock('@/lib/sim-item-sources', () => ({ findSimItem: vi.fn() }));
vi.mock('@/lib/sim-export-api', async (importOriginal) => ({
  ...(await importOriginal<typeof SimExportApi>()),
  createSimExport: vi.fn(),
}));

const URL_OUT = 'https://pd2trader.test/sim/plan?export=abc';
const SHAKO: PriceCheckItem = { name: 'Harlequin Crest', quality: 'Unique', type: 'Shako', iLevel: 80, stats: [] };
const PD2_SHAKO = { hash: 'h-shako', name: 'Harlequin Crest' } as GameStashItem;

let deps: SimTryOnDeps;

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  deps = {
    token: 'tok',
    account: 'Main',
    simCharacter: 'HammerPal',
    canUse: true,
    stash: vi.fn(async () => ({ items: [] }) as unknown as GameData),
    notify: vi.fn(),
    onSent: vi.fn(),
  };
  vi.mocked(createSimExport).mockResolvedValue({ url: URL_OUT });
  vi.mocked(openUrl).mockResolvedValue();
  vi.mocked(findSimItem).mockResolvedValue(null);
});

describe('tryOnItem (the try-on hotkey)', () => {
  it('tries the copied item on the default character with Quick Sim and opens the planner', async () => {
    await tryOnItem(SHAKO, deps);
    expect(deps.notify).toHaveBeenCalledWith({ title: 'Trying Harlequin Crest on HammerPal…', variant: 'info' });
    expect(findSimItem).toHaveBeenCalledWith(SHAKO, { stash: deps.stash, characters: ['HammerPal'] });
    expect(createSimExport).toHaveBeenCalledWith(
      'tok',
      'HammerPal',
      { clipboardItems: [SHAKO], try: { clipboard: 0 } },
      'quick_sim',
    );
    expect(openUrl).toHaveBeenCalledWith(URL_OUT);
    expect(deps.onSent).toHaveBeenCalledWith(
      expect.objectContaining({ character: 'HammerPal', goal: 'quick_sim', items: 1, url: URL_OUT }),
    );
  });

  it("sends PD2's copy of the item when PD2 has one", async () => {
    vi.mocked(findSimItem).mockResolvedValue({ item: PD2_SHAKO, source: 'stash' });
    await tryOnItem(SHAKO, deps);
    expect(createSimExport).toHaveBeenCalledWith(
      'tok',
      'HammerPal',
      { stashItems: [PD2_SHAKO], try: { stash: 0 } },
      'quick_sim',
    );
  });

  it("sends the item as copied when PD2's stash or character can't be read", async () => {
    vi.mocked(findSimItem).mockRejectedValue(new Error('503'));
    await tryOnItem(SHAKO, deps);
    expect(createSimExport).toHaveBeenCalledWith(
      'tok',
      'HammerPal',
      expect.objectContaining({ clipboardItems: [SHAKO] }),
      'quick_sim',
    );
  });

  it('uses the first ladder character without a saved default', async () => {
    vi.mocked(getSimLadderCharacters).mockResolvedValue([
      { name: 'Sorc', account: 'Main', level: 95 },
      { name: 'Alt', account: 'Main', level: 80 },
    ]);
    await tryOnItem(SHAKO, { ...deps, simCharacter: '' });
    expect(getSimLadderCharacters).toHaveBeenCalledWith('tok', 'Main');
    expect(createSimExport).toHaveBeenCalledWith('tok', 'Sorc', expect.anything(), 'quick_sim');
  });

  it('explains instead of exporting outside the beta, signed out, or without characters', async () => {
    await tryOnItem(SHAKO, { ...deps, canUse: false });
    await tryOnItem(SHAKO, { ...deps, canUse: undefined });
    await tryOnItem(SHAKO, { ...deps, token: null });
    vi.mocked(getSimLadderCharacters).mockResolvedValue([]);
    await tryOnItem(SHAKO, { ...deps, simCharacter: '' });
    expect(createSimExport).not.toHaveBeenCalled();
    expect(vi.mocked(deps.notify).mock.calls.map(([t]) => [t.variant, t.description])).toEqual([
      ['error', 'Horadric Sim is in closed beta. Join the waitlist from the Sim button in the price check.'],
      ['error', 'Horadric Sim is not available right now.'],
      ['error', 'Sign in to try items on your character.'],
      ['error', 'No ladder characters found on your PD2 accounts.'],
    ]);
  });

  it('shows why the export failed and remembers nothing', async () => {
    vi.mocked(createSimExport).mockRejectedValue(new SimExportApiError('busy', 429));
    await tryOnItem(SHAKO, deps);
    expect(deps.onSent).not.toHaveBeenCalled();
    expect(deps.notify).toHaveBeenLastCalledWith({
      title: 'Horadric Sim',
      description: 'Too many exports. Try again in a minute.',
      variant: 'error',
    });
  });
});

describe('planner links', () => {
  it('opens a listing on a character, with the goal unless Quick Sim', () => {
    expect(simListingPlanUrl('abc123', 'HammerPal')).toBe(
      'https://pd2trader.test/sim/plan?listing=abc123&import=HammerPal',
    );
    expect(simListingPlanUrl('abc123', 'HammerPal', 'quick_sim')).toBe(
      'https://pd2trader.test/sim/plan?listing=abc123&import=HammerPal',
    );
    expect(simListingPlanUrl('abc123', 'HammerPal', 'top_gear')).toBe(
      'https://pd2trader.test/sim/plan?listing=abc123&import=HammerPal&goal=top_gear',
    );
    expect(simPlannerUrl('Hammer Pal')).toBe('https://pd2trader.test/sim/plan?import=Hammer+Pal');
  });
});
