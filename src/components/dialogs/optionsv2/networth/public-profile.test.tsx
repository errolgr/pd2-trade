// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useOptions } from '@/hooks/useOptions';
import { getProfileSettings, NetWorthApiError, updateProfileSettings } from '@/lib/networth-api';
import type { ProfileSettings } from '@/lib/networth-api';
import { openUrl } from '@/lib/browser-opener';
import { BACKEND_URL } from '@/lib/pkce';
import { createOptionsStore } from '../test-utils';
import { PublicProfileGroup } from './public-profile';

vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));
vi.mock('@/lib/browser-opener', () => ({ openUrl: vi.fn() }));
vi.mock('@/lib/networth-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/networth-api')>()),
  getProfileSettings: vi.fn(),
  updateProfileSettings: vi.fn(),
}));
// vi.mock factories are hoisted above static imports, so the shim must be loaded inside the factory.
vi.mock('@/components/ui/select', async () => (await import('../test-utils')).selectShim);

const PROFILE: ProfileSettings = {
  optedIn: false,
  displayName: null,
  slug: null,
  showHoldings: false,
  displayNameOptions: ['MainAcc', 'AltAcc'],
};

async function renderGroup(token: string | null = 'tok') {
  const store = createOptionsStore({ pd2Token: token ?? undefined });
  vi.mocked(useOptions).mockImplementation(store.useOptions);
  render(<PublicProfileGroup />);
  await act(async () => {});
}

const publicSwitch = () => screen.getByRole('switch', { name: 'Public profile' }) as HTMLButtonElement;
const click = (el: HTMLElement) => act(async () => fireEvent.click(el));

beforeEach(() => {
  vi.mocked(getProfileSettings).mockResolvedValue(PROFILE);
  vi.mocked(updateProfileSettings).mockImplementation(async (_t, patch) => ({
    ...PROFILE,
    ...patch,
    displayName: patch.displayName ?? null,
    slug: patch.optedIn ? 'main acc' : null,
  }));
});

afterEach(cleanup);

describe('PublicProfileGroup', () => {
  it('asks to sign in and does not call the server without a token', async () => {
    await renderGroup(null);
    expect(screen.queryByText(/Sign in to your PD2 account/)).not.toBeNull();
    expect(publicSwitch().disabled).toBe(true);
    expect(getProfileSettings).not.toHaveBeenCalled();
  });

  it('explains leaderboards are not live yet on 404', async () => {
    vi.mocked(getProfileSettings).mockRejectedValue(new NetWorthApiError('nope', 404));
    await renderGroup();
    expect(screen.queryByText(/Leaderboards launch with Season 14/)).not.toBeNull();
    expect(publicSwitch().disabled).toBe(true);
  });

  it('treats a 401 as signed out', async () => {
    vi.mocked(getProfileSettings).mockRejectedValue(new NetWorthApiError('expired', 401));
    await renderGroup();
    expect(screen.queryByText(/Sign in to your PD2 account/)).not.toBeNull();
  });

  it('shows other load errors with a Retry that recovers', async () => {
    vi.mocked(getProfileSettings).mockRejectedValueOnce(new Error('Server down'));
    await renderGroup();
    expect(screen.queryByText('Server down')).not.toBeNull();
    expect(screen.queryByRole('switch', { name: 'Public profile' })).toBeNull();

    await click(screen.getByRole('button', { name: /Retry/ }));
    expect(publicSwitch().disabled).toBe(false);
    expect(getProfileSettings).toHaveBeenCalledTimes(2);
  });

  it('opting in saves immediately with the first account name and reveals the profile options', async () => {
    await renderGroup();
    expect(screen.queryByRole('switch', { name: 'Show holdings' })).toBeNull();

    await click(publicSwitch());
    expect(updateProfileSettings).toHaveBeenCalledWith('tok', {
      optedIn: true,
      showHoldings: false,
      displayName: 'MainAcc',
    });
    expect(publicSwitch().getAttribute('aria-checked')).toBe('true');
    expect(screen.queryByRole('switch', { name: 'Show holdings' })).not.toBeNull();
    expect((screen.getByLabelText('Shown as') as HTMLSelectElement).value).toBe('MainAcc');
  });

  it('saves a different display name', async () => {
    vi.mocked(getProfileSettings).mockResolvedValue({ ...PROFILE, optedIn: true, displayName: 'MainAcc' });
    await renderGroup();
    await act(async () => fireEvent.change(screen.getByLabelText('Shown as'), { target: { value: 'AltAcc' } }));
    expect(updateProfileSettings).toHaveBeenCalledWith('tok', expect.objectContaining({ displayName: 'AltAcc' }));
  });

  it('hides the account picker when there is only one name', async () => {
    vi.mocked(getProfileSettings).mockResolvedValue({ ...PROFILE, optedIn: true, displayNameOptions: ['Solo'] });
    await renderGroup();
    expect(screen.queryByLabelText('Shown as')).toBeNull();
    expect(screen.queryByRole('switch', { name: 'Show holdings' })).not.toBeNull();
  });

  it('sends no display name when the account has none', async () => {
    vi.mocked(getProfileSettings).mockResolvedValue({ ...PROFILE, displayNameOptions: [] });
    await renderGroup();
    await click(publicSwitch());
    expect(vi.mocked(updateProfileSettings).mock.calls[0][1].displayName).toBeUndefined();
  });

  it('snaps back to the server state and shows the error when a save fails', async () => {
    vi.mocked(updateProfileSettings).mockRejectedValue(new Error('Rate limited'));
    await renderGroup();
    await click(publicSwitch());
    expect(screen.queryByText('Rate limited')).not.toBeNull();
    expect(publicSwitch().getAttribute('aria-checked')).toBe('false');
    expect(publicSwitch().disabled).toBe(false);
  });

  it('disables the controls while a save is in flight', async () => {
    const { promise, resolve: finish } = Promise.withResolvers<ProfileSettings>();
    vi.mocked(updateProfileSettings).mockReturnValue(promise);
    await renderGroup();
    await click(publicSwitch());
    expect(screen.queryByText('Saving')).not.toBeNull();
    expect(publicSwitch().disabled).toBe(true);
    await act(async () => finish({ ...PROFILE, optedIn: true }));
    expect(screen.queryByText('Saving')).toBeNull();
    expect(publicSwitch().disabled).toBe(false);
  });

  it('opens the public profile page with an encoded slug', async () => {
    vi.mocked(getProfileSettings).mockResolvedValue({ ...PROFILE, optedIn: true, slug: 'main acc' });
    await renderGroup();
    expect(screen.getByText(/pd2trader.com\/u\//).textContent).toBe('pd2trader.com/u/main acc');
    fireEvent.click(screen.getByRole('button', { name: /View profile/ }));
    expect(openUrl).toHaveBeenCalledWith(`${BACKEND_URL}/u/main%20acc`);
  });
});
