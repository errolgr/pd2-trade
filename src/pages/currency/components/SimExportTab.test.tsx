// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { MotionGlobalConfig } from 'framer-motion';
import type { GameData, Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import { AccountMismatchError, usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { openUrl } from '@/lib/browser-opener';
import { createSimExport, getMyCharacters, MAX_SIM_EXPORT_ITEMS, SimExportApiError } from '@/lib/sim-export-api';
import type * as SimExportApi from '@/lib/sim-export-api';
import { trackMeasurement } from '@/lib/telemetry';
import { useOverlay, type OverlayApi } from '@/overlay';
import { SimExportTab } from './SimExportTab';

vi.mock('@/hooks/pd2website/usePD2Website', () => {
  class AuthenticationError extends Error {}
  class AccountMismatchError extends Error {}
  return { AuthenticationError, AccountMismatchError, usePd2Website: vi.fn() };
});
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

const item = (hash: string, name: string, over: Partial<GameStashItem> = {}): GameStashItem =>
  ({
    hash,
    name,
    is_simple: false,
    is_ear: false,
    is_ethereal: false,
    corrupted: false,
    quality: { id: 7, name: 'Unique' },
    base: { name: 'Shako', stackable: false },
    location: { storage: 'Shared Stash' },
    ...over,
  }) as GameStashItem;

const SHAKO = item('h-shako', 'Harlequin Crest');
const ARACH = item('h-arach', 'Arachnid Mesh', {
  base: { name: 'Spiderweb Sash', stackable: false } as GameStashItem['base'],
});
const BER = item('h-ber', 'Ber Rune', { is_simple: true });

const stashOf = (items: GameStashItem[]) => ({ items }) as GameData;

function mount() {
  render(<SimExportTab token="tok"
    account="Hammerdin" />);
}

/** Mounts and waits for the character picker and the stash list. */
async function renderTab() {
  mount();
  await screen.findByRole('combobox', { name: 'Character' });
  await screen.findByText('Harlequin Crest');
}

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
});
afterAll(() => {
  MotionGlobalConfig.skipAnimations = false;
});

beforeEach(() => {
  openPanel.mockReset();
  fetchAndCacheStash.mockReset();
  fetchAndCacheStash.mockResolvedValue(stashOf([SHAKO, ARACH, BER]));
  vi.mocked(usePd2Website).mockReturnValue({ fetchAndCacheStash } as unknown as ReturnType<typeof usePd2Website>);
  vi.mocked(useOverlay).mockReturnValue({ openPanel } as unknown as OverlayApi);
  vi.mocked(getMyCharacters).mockResolvedValue({
    accounts: [
      { account: 'Alt', characters: ['AltZon'] },
      { account: 'Hammerdin', characters: ['HammerPal', 'Sorc'] },
    ],
  });
  vi.mocked(createSimExport).mockResolvedValue({ url: URL_OUT });
  vi.mocked(openUrl).mockResolvedValue();
});

afterEach(() => {
  cleanup();
});

describe('SimExportTab', () => {
  it('sends the selected account’s character with the checked gear and opens the planner', async () => {
    await renderTab();
    // Runes and other simple items are not offered.
    expect(screen.queryByText('Ber Rune')).toBeNull();

    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Send to Simulator (1 item)' }));

    await screen.findByText('Sent. The planner opened in your browser.');
    expect(createSimExport).toHaveBeenCalledWith('tok', 'HammerPal', [SHAKO]);
    expect(openUrl).toHaveBeenCalledWith(URL_OUT);
    expect(trackMeasurement).toHaveBeenCalledWith('sim_export', expect.objectContaining({ stash_items: 1 }), {
      outcome: 'success',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Open planner' }));
    expect(openUrl).toHaveBeenCalledTimes(2);
  });

  it('filters the stash list by name or base', async () => {
    await renderTab();
    fireEvent.change(screen.getByRole('textbox', { name: 'Filter stash items' }), { target: { value: 'spider' } });
    expect(screen.queryByText('Harlequin Crest')).toBeNull();
    expect(screen.getByText('Arachnid Mesh')).not.toBeNull();
  });

  it('offers sign-in when the session expired', async () => {
    vi.mocked(createSimExport).mockRejectedValueOnce(new SimExportApiError('Unauthorized', 401));
    await renderTab();
    fireEvent.click(screen.getByRole('button', { name: 'Send to Simulator' }));

    await screen.findByText('Your PD2 session expired. Sign in again.');
    expect(openUrl).not.toHaveBeenCalled();
    expect(trackMeasurement).toHaveBeenCalledWith('sim_export', expect.anything(), { outcome: 'error', status: 401 });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(openPanel).toHaveBeenCalledWith('signIn');
  });

  it('shows the server’s reason when the export fails', async () => {
    vi.mocked(createSimExport).mockRejectedValueOnce(
      new SimExportApiError('Character "HammerPal" not found, or PD2 can\'t read its save', 404),
    );
    await renderTab();
    fireEvent.click(screen.getByRole('button', { name: 'Send to Simulator' }));
    await screen.findByText('Character "HammerPal" not found, or PD2 can\'t read its save');
    // Sending is possible again.
    expect((screen.getByRole('button', { name: 'Send to Simulator' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('still sends the character alone when the stash cannot be read', async () => {
    fetchAndCacheStash.mockRejectedValueOnce(
      new AccountMismatchError('Account "Hammerdin" is not linked to your login'),
    );
    mount();
    await screen.findByText(/Account "Hammerdin" is not linked to your login/);
    await waitFor(() =>
      expect((screen.getByRole('button', { name: 'Send to Simulator' }) as HTMLButtonElement).disabled).toBe(false),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Send to Simulator' }));
    await waitFor(() => expect(createSimExport).toHaveBeenCalledWith('tok', 'HammerPal', []));
  });

  it('retries loading characters after a failure', async () => {
    vi.mocked(getMyCharacters).mockRejectedValueOnce(
      new SimExportApiError('pd2trader.com answered 503. Try again shortly.', 503),
    );
    mount();
    await screen.findByText('pd2trader.com answered 503. Try again shortly.');
    expect((screen.getByRole('button', { name: 'Send to Simulator' }) as HTMLButtonElement).disabled).toBe(true);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    });
    await screen.findByRole('combobox', { name: 'Character' });
  });

  it(`caps the export at ${MAX_SIM_EXPORT_ITEMS} items`, async () => {
    const many = Array.from({ length: MAX_SIM_EXPORT_ITEMS + 1 }, (_, i) => item(`h${i}`, `Item ${i}`));
    fetchAndCacheStash.mockResolvedValue(stashOf(many));
    mount();
    await screen.findByText('Item 0');
    const boxes = screen.getAllByRole('checkbox');
    for (const box of boxes.slice(0, MAX_SIM_EXPORT_ITEMS)) fireEvent.click(box);
    expect((boxes[MAX_SIM_EXPORT_ITEMS] as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(`At most ${MAX_SIM_EXPORT_ITEMS} items per export.`)).not.toBeNull();
  });
});
