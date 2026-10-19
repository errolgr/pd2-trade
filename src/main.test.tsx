// @vitest-environment happy-dom
import React from 'react';
import { act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BrowserOptions } from '@sentry/react';

vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  captureConsoleIntegration: vi.fn(),
  browserTracingIntegration: vi.fn(),
  replayIntegration: vi.fn(),
}));
vi.mock('@/lib/debug-logger', () => ({ initDebugLoggingFromSettings: vi.fn() }));
vi.mock('@/lib/themes', () => ({ initTheme: vi.fn() }));
vi.mock('@/lib/faro', () => ({ initFaro: vi.fn() }));
vi.mock('@/hooks/pd2website/usePD2Website', () => ({
  AccountMismatchError: class AccountMismatchError extends Error {},
}));

// Every routed page is a stub that names itself, so routing is observable without booting the app.
vi.mock('./pages/landing/LandingPage', () => ({
  default: () => <p>landing</p>,
  Providers: ({ children }: { children: React.ReactNode }) => <div data-wrapper="providers">{children}</div>,
}));
vi.mock('./hooks/useOptions', () => ({
  OptionsProvider: ({ children }: { children: React.ReactNode }) => <div data-wrapper="options">{children}</div>,
}));
vi.mock('./components/GlobalErrorHandler', () => ({ GlobalErrorHandler: () => <p>error-handler</p> }));
vi.mock('./pages/price-check/ItemPage', () => ({ default: () => <p>item</p> }));
vi.mock('./pages/settings/SettingsPage', () => ({ SettingsPage: () => <p>settings</p> }));
vi.mock('./pages/change-log/ChangeLogPage', () => ({ default: () => <p>change-log</p> }));
vi.mock('./pages/quick-list/QuickListPage', () => ({ QuickListPage: () => <p>quick-list</p> }));
vi.mock('./pages/toast/ToastPage', () => ({ default: () => <p>toast</p> }));
vi.mock('./pages/currency/CurrencyPage', () => ({ CurrencyPage: () => <p>currency</p> }));
vi.mock('./pages/chat/ChatButtonPage', () => ({ default: () => <p>chat-button</p> }));
vi.mock('./pages/trade-messages/TradeMessagesPage', () => ({ default: () => <p>trade-messages</p> }));
vi.mock('./pages/chat/ChatPage', () => ({ default: () => <p>chat</p> }));
vi.mock('./pages/sign-in/SignInPage', () => ({ default: () => <p>sign-in</p> }));
vi.mock('./pages/delist/DelistPage', () => ({ DelistPage: () => <p>delist</p> }));
vi.mock('./pages/net-worth/NetWorthTickerPage', () => ({ default: () => <p>net-worth-ticker</p> }));
vi.mock('./pages/net-worth/NetWorthPanelPage', () => ({ default: () => <p>net-worth-panel</p> }));
vi.mock('./pages/dev/PrimitivesGallery', () => ({ default: () => <p>gallery</p> }));

/** Loads main.tsx fresh at `path` (it renders on import), returning the Sentry options it registers. */
async function boot(path: string) {
  window.history.pushState({}, '', path);
  document.body.innerHTML = '<div id="root"></div>';
  vi.resetModules();
  // main.tsx is an entry script with import-time side effects; a fresh dynamic import per test re-runs them.
  const Sentry = await import('@sentry/react');
  await act(async () => {
    await import('./main');
  });
  return {
    text: document.getElementById('root')!.textContent,
    root: document.getElementById('root')!,
    sentryOptions: () => {
      vi.advanceTimersByTime(1000);
      return vi.mocked(Sentry.init).mock.calls[0]?.[0] as BrowserOptions;
    },
    Sentry,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
});

describe('main routing', () => {
  it.each([
    ['/item', 'item'],
    ['/settings', 'settings'],
    ['/quick-list', 'quick-list'],
    ['/toast', 'toast'],
    ['/currency', 'currency'],
    ['/chat', 'chat'],
    ['/chat-button', 'chat-button'],
    ['/trade-messages', 'trade-messages'],
    ['/sign-in', 'sign-in'],
    ['/delist', 'delist'],
    ['/net-worth-ticker', 'net-worth-ticker'],
    ['/net-worth-panel', 'net-worth-panel'],
  ])('%s renders the %s window', async (path, page) => {
    const { text } = await boot(path);
    expect(text).toBe(page);
  });

  it('the main window mounts the landing page inside the app providers with the error handler', async () => {
    const { root } = await boot('/');
    const providers = root.querySelector('[data-wrapper="providers"]');
    expect(providers?.textContent).toBe('error-handlerlanding');
  });

  it('the changelog window gets its own options provider', async () => {
    const { root } = await boot('/change-log');
    expect(root.querySelector('[data-wrapper="options"]')?.textContent).toBe('change-log');
  });

  it('unknown paths render nothing', async () => {
    const { text } = await boot('/nope');
    expect(text).toBe('');
  });

  it('suppresses the native context menu', async () => {
    await boot('/item');
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    document.body.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });
});

describe('main Sentry setup', () => {
  it('initialises Sentry only after a 1s delay', async () => {
    const { Sentry } = await boot('/item');
    vi.advanceTimersByTime(999);
    expect(Sentry.init).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(Sentry.init).toHaveBeenCalledTimes(1);
  });

  it('drops Tauri IPC breadcrumbs but keeps other HTTP breadcrumbs', async () => {
    const opts = (await boot('/item')).sentryOptions();
    const ipc = { category: 'http', data: { url: 'http://ipc.localhost/plugin' } };
    const api = { category: 'http', data: { url: 'https://pd2trader.com/api' } };
    expect(opts.beforeBreadcrumb!(ipc)).toBeNull();
    expect(opts.beforeBreadcrumb!(api)).toBe(api);
    expect(opts.beforeBreadcrumb!({ category: 'ui.click' })).toEqual({ category: 'ui.click' });
  });

  it('filters expected account/auth errors and keeps everything else', async () => {
    const { sentryOptions } = await boot('/item');
    const opts = sentryOptions();
    const { AccountMismatchError } = await import('@/hooks/pd2website/usePD2Website');
    const send = (event: object, originalException?: unknown) =>
      (opts.beforeSend as (e: object, h: object) => unknown)(event, { originalException });

    expect(send({}, new AccountMismatchError('x'))).toBeNull();
    expect(send({ exception: { values: [{ type: 'AccountMismatchError' }] } })).toBeNull();
    expect(send({ exception: { values: [{ type: 'AuthenticationError' }] } })).toBeNull();
    // console.error capture arrives as a message event with no exception
    expect(send({ message: 'User Bob is not associated with your logged-in account' })).toBeNull();
    expect(send({ exception: { values: [{ type: 'Error', value: 'Foo is not associated with your logged-in account' }] } })).toBeNull();

    const real = { exception: { values: [{ type: 'TypeError', value: 'x is undefined' }] } };
    expect(send(real, new TypeError('x is undefined'))).toBe(real);
    expect(send({ message: 'Something else' })).toEqual({ message: 'Something else' });
  });
});
