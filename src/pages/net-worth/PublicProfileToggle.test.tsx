// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getProfileSettings, NetWorthApiError, updateProfileSettings } from '@/lib/networth-api';
import type { ProfileSettings } from '@/lib/networth-api';
import { PublicProfileToggle } from './PublicProfileToggle';

vi.mock('@/lib/browser-opener', () => ({ openUrl: vi.fn() }));
vi.mock('@/lib/networth-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/networth-api')>()),
  getProfileSettings: vi.fn(),
  updateProfileSettings: vi.fn(),
}));

const PROFILE: ProfileSettings = {
  optedIn: false,
  displayName: 'AltAcc',
  slug: null,
  showHoldings: true,
  displayNameOptions: ['MainAcc', 'AltAcc'],
};

const renderToggle = async () => {
  render(<PublicProfileToggle token="tok" />);
  await act(async () => {});
};
const publicSwitch = () => screen.getByRole('switch', { name: 'Public profile' });

beforeEach(() => {
  vi.mocked(getProfileSettings).mockResolvedValue(PROFILE);
  vi.mocked(updateProfileSettings).mockImplementation(async (_t, u) => ({ ...PROFILE, ...u, slug: u.optedIn ? 'altacc' : null }));
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('PublicProfileToggle', () => {
  it('stays hidden while leaderboards are off on the server', async () => {
    vi.mocked(getProfileSettings).mockRejectedValue(new NetWorthApiError('nope', 404));
    await renderToggle();
    expect(screen.queryByRole('switch')).toBeNull();
  });

  it('going public keeps the chosen display name and holdings setting', async () => {
    await renderToggle();
    await act(async () => fireEvent.click(publicSwitch()));
    expect(updateProfileSettings).toHaveBeenCalledWith('tok', { optedIn: true, showHoldings: true, displayName: 'AltAcc' });
    expect(publicSwitch().getAttribute('aria-checked')).toBe('true');
    expect(screen.queryByRole('button', { name: /View profile/ })).not.toBeNull();
  });

  it('snaps back and says so when the save fails', async () => {
    vi.mocked(updateProfileSettings).mockRejectedValue(new Error('Server down'));
    await renderToggle();
    await act(async () => fireEvent.click(publicSwitch()));
    expect(publicSwitch().getAttribute('aria-checked')).toBe('false');
    expect(screen.getByRole('alert').textContent).toMatch(/Couldn.t save/);
  });
});
