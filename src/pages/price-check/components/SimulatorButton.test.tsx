// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { MotionGlobalConfig } from 'framer-motion';
import type { GameData, Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { useOptions } from '@/hooks/useOptions';
import { useSimAccess } from '@/hooks/useSimAccess';
import { openUrl } from '@/lib/browser-opener';
import { createSimExport, getMyCharacters, SimExportApiError } from '@/lib/sim-export-api';
import type * as SimExportApi from '@/lib/sim-export-api';
import { trackMeasurement } from '@/lib/telemetry';
import { useOverlay, type OverlayApi } from '@/overlay';
import type { Item } from '../lib/interfaces';
import { SIM_CHARACTER_STORAGE_KEY, SimulatorButton } from './SimulatorButton';

vi.mock('@/hooks/pd2website/usePD2Website', () => {
  class AuthenticationError extends Error {}
  class AccountMismatchError extends Error {}
  return { AuthenticationError, AccountMismatchError, usePd2Website: vi.fn() };
});
vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));
vi.mock('@/hooks/useSimAccess', () => ({ useSimAccess: vi.fn() }));
vi.mock('@/overlay', () => ({ useOverlay: vi.fn() }));
vi.mock('@/lib/browser-opener', () => ({ openUrl: vi.fn() }));
vi.mock('@/lib/telemetry', () => ({ trackMeasurement: vi.fn() }));
vi.mock('@/lib/sim-export-api', async (importOriginal) => ({
  ...(await importOriginal<typeof SimExportApi>()),
  getMyCharacters: vi.fn(),
  createSimExport: vi.fn(),
}));

const URL_OUT = 'https://pd2trader.com/sim/plan?export=0b7f6a1e-8a39-4f43-9a3e-5f4f2b8c0d11';
const openPanel = vi.fn();
const fetchAndCacheStash = vi.fn<() => Promise<GameData>>();
let settings: { pd2Token?: string; account?: string };

const SHAKO = {
  hash: 'h-shako',
  name: 'Harlequin Crest',
  is_simple: false,
  is_ear: false,
  is_ethereal: false,
  is_runeword: false,
  corrupted: false,
  socket_count: 0,
  quality: { id: 7, name: 'Unique' },
  base: { name: 'Shako', stackable: false },
  modifiers: [],
} as unknown as GameStashItem;

const checked = (over: Partial<Item> = {}): Item => ({
  name: 'Harlequin Crest',
  quality: 'Unique',
  type: 'Shako',
  iLevel: 85,
  location: 'Stash',
  stats: [],
  ...over,
});

async function openPopover(item: Item = checked()) {
  render(<SimulatorButton item={item} />);
  fireEvent.click(screen.getByRole('button', { name: /Simulator/ }));
  await screen.findByText('Send to Simulator');
}

const planner = () => screen.getByRole('button', { name: /Open planner/ }) as HTMLButtonElement;

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
});
afterAll(() => {
  MotionGlobalConfig.skipAnimations = false;
});

beforeEach(() => {
  localStorage.clear();
  settings = { pd2Token: 'tok', account: 'Hammerdin' };
  openPanel.mockReset();
  fetchAndCacheStash.mockReset();
  fetchAndCacheStash.mockResolvedValue({ items: [SHAKO] } as GameData);
  vi.mocked(trackMeasurement).mockReset();
  vi.mocked(createSimExport).mockReset();
  vi.mocked(createSimExport).mockResolvedValue({ url: URL_OUT });
  vi.mocked(openUrl).mockReset();
  vi.mocked(openUrl).mockResolvedValue();
  vi.mocked(useSimAccess).mockReturnValue(true);
  vi.mocked(useOptions).mockImplementation(() => ({ settings }) as never);
  vi.mocked(usePd2Website).mockReturnValue({ fetchAndCacheStash } as unknown as ReturnType<typeof usePd2Website>);
  vi.mocked(useOverlay).mockReturnValue({ openPanel } as unknown as OverlayApi);
  vi.mocked(getMyCharacters).mockResolvedValue({
    accounts: [
      { account: 'Alt', characters: ['AltZon'] },
      { account: 'Hammerdin', characters: ['HammerPal', 'Sorc'] },
    ],
  });
});

afterEach(() => {
  cleanup();
});

describe('SimulatorButton', () => {
  it('is hidden unless Horadric Sim is open to the user', () => {
    vi.mocked(useSimAccess).mockReturnValue(undefined);
    const { rerender } = render(<SimulatorButton item={checked()} />);
    expect(screen.queryByRole('button', { name: /Simulator/ })).toBeNull();
    vi.mocked(useSimAccess).mockReturnValue(false);
    rerender(<SimulatorButton item={checked()} />);
    expect(screen.queryByRole('button', { name: /Simulator/ })).toBeNull();
  });

  it('tries the stash item on with the selected account’s character and opens the planner', async () => {
    await openPopover();
    await screen.findByText('Found in your stash');
    await waitFor(() => expect(planner().disabled).toBe(false));
    expect(screen.getByRole('radio', { name: /Try it on/ }).getAttribute('aria-checked')).toBe('true');

    fireEvent.click(planner());
    await screen.findByText('The planner opened in your browser.');
    expect(createSimExport).toHaveBeenCalledWith('tok', 'HammerPal', [SHAKO], { try: 0 });
    expect(openUrl).toHaveBeenCalledWith(URL_OUT);
    expect(trackMeasurement).toHaveBeenCalledWith('sim_export', expect.objectContaining({ stash_items: 1 }), {
      outcome: 'success',
      source: 'price_check',
      mode: 'try',
    });
  });

  it('adds it to the Top Gear pool without trying it on', async () => {
    await openPopover();
    await waitFor(() => expect(planner().disabled).toBe(false));
    fireEvent.click(screen.getByRole('radio', { name: /Add to Top Gear pool/ }));
    fireEvent.click(planner());
    await waitFor(() => expect(createSimExport).toHaveBeenCalledWith('tok', 'HammerPal', [SHAKO], {}));
  });

  it('remembers the last chosen character', async () => {
    localStorage.setItem(SIM_CHARACTER_STORAGE_KEY, 'AltZon');
    await openPopover();
    await waitFor(() => expect(planner().disabled).toBe(false));
    expect(screen.getByRole('combobox', { name: 'Character' }).textContent).toBe('AltZon');
    fireEvent.click(planner());
    await waitFor(() => expect(createSimExport).toHaveBeenCalledWith('tok', 'AltZon', [SHAKO], { try: 0 }));
  });

  it('only sends stash items it can find', async () => {
    await openPopover(checked({ location: 'Equip' }));
    expect(screen.getByText('Only items in your stash can be sent')).not.toBeNull();
    expect(fetchAndCacheStash).not.toHaveBeenCalled();
    expect(planner().disabled).toBe(true);
    cleanup();

    await openPopover(checked({ name: 'Arachnid Mesh', type: 'Spiderweb Sash' }));
    await screen.findByText("Couldn't find this item in your stash — reload the stash in Net Worth");
    expect(planner().disabled).toBe(true);
  });

  it('asks to sign in without a PD2 login', async () => {
    settings = {};
    await openPopover();
    expect(screen.getByText('Sign in to send items to the planner.')).not.toBeNull();
    expect(getMyCharacters).not.toHaveBeenCalledWith(undefined);
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(openPanel).toHaveBeenCalledWith('signIn');
  });

  it('shows why the export failed and offers sign-in on an expired session', async () => {
    vi.mocked(createSimExport).mockRejectedValueOnce(
      new SimExportApiError("stashItems[0] can't be simmed: no base", 400),
    );
    await openPopover();
    await waitFor(() => expect(planner().disabled).toBe(false));
    fireEvent.click(planner());
    await screen.findByText("stashItems[0] can't be simmed: no base");
    expect(openUrl).not.toHaveBeenCalled();

    vi.mocked(createSimExport).mockRejectedValueOnce(new SimExportApiError('Unauthorized', 401));
    fireEvent.click(planner());
    await screen.findByText('Your PD2 session expired. Sign in again.');
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(openPanel).toHaveBeenCalledWith('signIn');
  });
});
