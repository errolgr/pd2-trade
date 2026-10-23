// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { MotionGlobalConfig } from 'framer-motion';
import { isTauri } from '@tauri-apps/api/core';
import { useOptions } from '@/hooks/useOptions';
import type { ISettings } from '@/hooks/useOptions';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { cancelOAuthFlow, useOAuthFlowActive } from '@/hooks/useOAuth';
import { createOptionsStore, type OptionsStore } from '../test-utils';
import { AccountForm } from './account-form';

vi.mock('@tauri-apps/api/core', () => ({ isTauri: vi.fn() }));
vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));
vi.mock('@/hooks/pd2website/usePD2Website', () => ({ usePd2Website: vi.fn() }));
vi.mock('@/hooks/useOAuth', () => ({ cancelOAuthFlow: vi.fn(), useOAuthFlowActive: vi.fn() }));
// vi.mock factories are hoisted above static imports, so the shim must be loaded inside the factory.
vi.mock('@/components/ui/select', async () => (await import('../test-utils')).selectShim);

let store: OptionsStore;
const logout = vi.fn();
const startOAuthFlow = vi.fn();

function renderForm(authData: unknown, settings: Partial<ISettings> = { account: '', pd2Token: '' }) {
  store = createOptionsStore(settings);
  vi.mocked(useOptions).mockImplementation(store.useOptions);
  // The context type is module-private; the form only reads these three members.
  vi.mocked(usePd2Website).mockReturnValue({ authData, logout, startOAuthFlow } as never);
  return render(<AccountForm />);
}

const signedIn = (accounts: string[], username: string | null = 'Doreet') => ({
  user: { username: username ?? undefined, game: { accounts } },
});
const accountSelect = () => screen.getByLabelText('Account') as HTMLSelectElement;

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
});

afterAll(() => {
  MotionGlobalConfig.skipAnimations = false;
});

beforeEach(() => {
  vi.mocked(isTauri).mockReturnValue(true);
  vi.mocked(useOAuthFlowActive).mockReturnValue(false);
  vi.mocked(cancelOAuthFlow).mockReset();
  logout.mockReset();
  startOAuthFlow.mockReset();
});

afterEach(cleanup);

describe('AccountForm', () => {
  it('signed out: warns about missing accounts and disables the picker', () => {
    renderForm(null);
    expect(screen.queryByText('No accounts available')).not.toBeNull();
    expect(screen.queryByText('Signed out')).not.toBeNull();
    expect(accountSelect().disabled).toBe(true);
    expect(screen.queryByRole('button', { name: /Log out/ })).toBeNull();
  });

  it('signed in: lists the linked accounts and saves the chosen one', async () => {
    renderForm(signedIn(['Alpha', 'Beta']), { account: 'Alpha', pd2Token: 't' });
    expect(screen.queryByText('Signed in as Doreet')).not.toBeNull();
    expect(screen.queryByText(/2 linked game accounts/)).not.toBeNull();
    await waitFor(() => expect(screen.queryByText('No accounts available')).toBeNull());
    expect(accountSelect().value).toBe('Alpha');

    fireEvent.change(accountSelect(), { target: { value: 'Beta' } });
    expect(store.updateSettings).toHaveBeenCalledWith({ account: 'Beta' });
  });

  it('uses singular wording for one account and handles a missing username', () => {
    renderForm(signedIn(['Solo'], null));
    expect(screen.queryByText(/1 linked game account\./)).not.toBeNull();
    expect(screen.queryByText('Signed in')).not.toBeNull();
  });

  it('starts the browser sign-in from Log in, and survives the flow failing', async () => {
    startOAuthFlow.mockRejectedValue(new Error('closed'));
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderForm(null);
    expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull();

    await act(async () => fireEvent.click(screen.getByRole('button', { name: /Log in/ })));
    expect(startOAuthFlow).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith('Failed to start OAuth flow:', expect.any(Error));
    expect((screen.getByRole('button', { name: /Log in/ }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('while a sign-in runs (from here or the sign-in panel): shows the progress and a Cancel that ends it', () => {
    vi.mocked(useOAuthFlowActive).mockReturnValue(true);
    renderForm(null);
    expect((screen.getByRole('button', { name: /Logging in/ }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(cancelOAuthFlow).toHaveBeenCalledTimes(1);
    expect(startOAuthFlow).not.toHaveBeenCalled();
  });

  it('shows the logout progress until logout settles', async () => {
    const { promise, resolve } = Promise.withResolvers<void>();
    logout.mockReturnValue(promise);
    renderForm(signedIn(['Alpha']));

    await act(async () => fireEvent.click(screen.getByRole('button', { name: /Log out/ })));
    expect((screen.getByRole('button', { name: /Logging out/ }) as HTMLButtonElement).disabled).toBe(true);
    await act(async () => resolve());
    expect(screen.queryByRole('button', { name: /Logging out/ })).toBeNull();
  });

  it('hides the manual token field inside the desktop app', () => {
    renderForm(null);
    expect(screen.queryByPlaceholderText('Enter your PD2 token')).toBeNull();
  });

  it('browser mode: saves a pasted token together with the current account', () => {
    vi.mocked(isTauri).mockReturnValue(false);
    renderForm(null, { account: 'Alpha', pd2Token: '' });
    fireEvent.change(screen.getByPlaceholderText('Enter your PD2 token'), { target: { value: 'abc' } });
    expect(store.updateSettings).toHaveBeenLastCalledWith({ account: 'Alpha', pd2Token: 'abc' });
  });

  it('does not save when settings change externally', () => {
    renderForm(signedIn(['Alpha', 'Beta']), { account: 'Alpha', pd2Token: 't' });
    act(() => store.replace({ account: 'Beta', pd2Token: 't2' }));
    expect(accountSelect().value).toBe('Beta');
    expect(store.updateSettings).not.toHaveBeenCalled();
  });
});
