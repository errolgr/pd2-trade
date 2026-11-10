// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useOptions } from '@/hooks/useOptions';
import { useSimLadderCharacters } from '@/hooks/useSimLadderCharacters';
import { openUrl } from '@/lib/browser-opener';
import { trackMeasurement } from '@/lib/telemetry';
import { MarketSimButton } from './MarketSimButton';

vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));
vi.mock('@/hooks/useSimLadderCharacters', () => ({ useSimLadderCharacters: vi.fn() }));
vi.mock('@/lib/browser-opener', () => ({ openUrl: vi.fn() }));
vi.mock('@/lib/pkce', () => ({ BACKEND_URL: 'https://pd2trader.com' }));
vi.mock('@/lib/telemetry', () => ({ trackMeasurement: vi.fn() }));

const access = { canUse: true, waitlistUrl: 'https://pd2trader.com/sim/beta', waitlistPosition: null };

beforeEach(() => {
  vi.mocked(useOptions).mockReturnValue({
    settings: { pd2Token: 'private-token', account: 'Acc', simCharacter: 'Sorc', simGoal: 'top_gear' },
    updateSettings: vi.fn(),
  } as never);
  vi.mocked(useSimLadderCharacters).mockReturnValue({
    status: 'ok',
    data: [{ name: 'Sorc', account: 'Acc', className: 'Sorceress', level: 90 }],
  });
  vi.mocked(openUrl).mockReset();
  vi.mocked(openUrl).mockResolvedValue();
});

afterEach(cleanup);

describe('MarketSimButton', () => {
  it('opens a fresh planner with the listing, preferred character and goal but no token', async () => {
    render(<MarketSimButton access={access}
      listingId="listing 1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Try in the sim planner' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Open planner' }));

    await waitFor(() => expect(openUrl).toHaveBeenCalledOnce());
    const url = new URL(vi.mocked(openUrl).mock.calls[0][0]);
    expect(Object.fromEntries(url.searchParams)).toEqual({ listing: 'listing 1', import: 'Sorc', goal: 'top_gear' });
    expect(url.href).not.toContain('private-token');
    expect(trackMeasurement).toHaveBeenCalledWith('sim_handoff', expect.anything(), {
      outcome: 'success',
      source: 'market',
      goal: 'top_gear',
    });
  });

  it('keeps the handoff open with a retryable error when the browser cannot open', async () => {
    vi.mocked(openUrl).mockRejectedValueOnce(new Error('blocked'));
    render(<MarketSimButton access={access}
      listingId="listing-1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Try in the sim planner' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Open planner' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Could not open the browser. Try again.');
    expect(screen.getByRole('button', { name: 'Open planner' })).toBeTruthy();
  });
});
