// @vitest-environment happy-dom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { MotionGlobalConfig } from 'framer-motion';
import { useRemoteSignIn, useSignIn, type SignInState } from '@/hooks/useSignIn';
import SignInPage, { SignInWindowPage } from './SignInPage';

vi.mock('@/hooks/useSignIn', () => ({ useSignIn: vi.fn(), useRemoteSignIn: vi.fn() }));

const dispatch = vi.fn();
const idle: SignInState = { flowActive: false, busy: false, accounts: null, selectedAccount: null };

function renderPanel(state: Partial<SignInState> = {}) {
  vi.mocked(useSignIn).mockReturnValue({ state: { ...idle, ...state }, dispatch } as never);
  return render(<SignInPage />);
}

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
});

afterAll(() => {
  MotionGlobalConfig.skipAnimations = false;
});

beforeEach(() => dispatch.mockReset());

afterEach(cleanup);

describe('SignInPage', () => {
  it('starts the sign-in', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: /Sign in with PD2/ }));
    expect(dispatch.mock.calls).toEqual([[{ type: 'start' }]]);
  });

  it('"Later" and the close button dismiss it', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Later' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(dispatch.mock.calls).toEqual([[{ type: 'later' }], [{ type: 'later' }]]);
  });

  it('while the browser sign-in runs: shows the progress and a Cancel that ends it', () => {
    renderPanel({ flowActive: true, busy: true });
    const busy = screen.getByRole('button', { name: /Opening browser/ }) as HTMLButtonElement;
    expect(busy.disabled).toBe(true);
    expect(busy.getAttribute('aria-busy')).toBe('true');
    expect(screen.queryByRole('button', { name: 'Later' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(dispatch.mock.calls).toEqual([[{ type: 'cancel' }]]);
  });

  it('picks one of several accounts, then locks the list on the pick', () => {
    renderPanel({ accounts: ['Alpha', 'Beta'] });
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['AAlpha', 'BBeta']);
    fireEvent.click(screen.getByRole('option', { name: /Beta/ }));
    expect(dispatch.mock.calls).toEqual([[{ type: 'select', account: 'Beta' }]]);

    cleanup();
    renderPanel({ accounts: ['Alpha', 'Beta'], selectedAccount: 'Beta' });
    expect(screen.getByRole('option', { name: /Beta/ }).getAttribute('aria-selected')).toBe('true');
    expect((screen.getByRole('option', { name: /Alpha/ }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('SignInWindowPage', () => {
  it('shows nothing until Main sends the state, then the prompt without its own close button', () => {
    vi.mocked(useRemoteSignIn).mockReturnValue({ state: null, dispatch });
    const { rerender } = render(<SignInWindowPage />);
    expect(screen.queryByRole('button')).toBeNull();

    vi.mocked(useRemoteSignIn).mockReturnValue({ state: idle, dispatch });
    rerender(<SignInWindowPage />);
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Sign in with PD2/ }));
    expect(dispatch.mock.calls).toEqual([[{ type: 'start' }]]);
  });
});
