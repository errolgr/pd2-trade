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
const wrap = (name: string) =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <div data-wrapper={name}>{children}</div>;
  };
vi.mock('@/hooks/pd2website/usePD2Website', () => ({
  AccountMismatchError: class AccountMismatchError extends Error {},
  Pd2WebsiteProvider: wrap('pd2website'),
}));

// Providers and root components are stubs that name themselves, so the tree is observable without booting the app.
vi.mock('./hooks/useOptions', () => ({ OptionsProvider: wrap('options') }));
vi.mock('./hooks/useDialog', () => ({ DialogProvider: wrap('dialog') }));
vi.mock('./hooks/useTray', () => ({ TrayProvider: wrap('tray') }));
vi.mock('./hooks/useItems', () => ({ ItemsProvider: wrap('items') }));
vi.mock('./hooks/useNetWorth', () => ({ NetWorthProvider: wrap('networth') }));
vi.mock('./hooks/useWhisperHistory', () => ({ WhisperHistoryProvider: wrap('whispers') }));
vi.mock('./overlay', () => ({ OverlayProvider: wrap('overlay'), OverlayRoot: () => <p>overlay-root</p> }));
vi.mock('./overlay/registry', () => ({ PANEL_DEFS: {} }));
vi.mock('./components/GlobalErrorHandler', () => ({ GlobalErrorHandler: () => <p>error-handler</p> }));
vi.mock('./pages/landing/AppController', () => ({ default: () => <p>app-controller</p> }));
vi.mock('./pages/delist/DelistHandler', () => ({ default: () => <p>delist-handler</p> }));
vi.mock('./pages/net-worth/NetWorthOverlayController', () => ({ default: () => <p>net-worth-controller</p> }));
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
  it('mounts every provider once around the app controller, handlers and overlay root', async () => {
    const { root } = await boot('/');
    // Overlay sits above the domain providers: Tray, Pd2Website and NetWorth open panels through it.
    const chain = ['dialog', 'options', 'overlay', 'tray', 'items', 'pd2website', 'whispers', 'networth'];
    let node: Element | null = root;
    for (const name of chain) {
      node = node!.querySelector(`:scope > [data-wrapper="${name}"]`);
      expect(node, name).not.toBeNull();
    }
    expect(node!.textContent).toBe('error-handlerapp-controllerdelist-handlernet-worth-controlleroverlay-root');
  });

  it.each(['/item', '/settings', '/toast', '/chat', '/nope'])(
    '%s is not a route anymore (pages are panels)',
    async (path) => {
      const { text } = await boot(path);
      expect(text).toBe('');
    },
  );

  it('serves the dev gallery outside production', async () => {
    const { root } = await boot('/dev/gallery');
    expect(root.querySelector('[data-wrapper="options"]')?.textContent).toBe('gallery');
  });

  it('suppresses the native context menu', async () => {
    await boot('/');
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    document.body.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });
});

describe('main Sentry setup', () => {
  it('initialises Sentry only after a 1s delay', async () => {
    const { Sentry } = await boot('/');
    vi.advanceTimersByTime(999);
    expect(Sentry.init).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(Sentry.init).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['production', true],
    ['development', false],
    ['test', false],
  ])('with NODE_ENV=%s sets enabled=%s, so only release builds report', async (env, enabled) => {
    vi.stubEnv('NODE_ENV', env);
    try {
      const opts = (await boot('/')).sentryOptions();
      expect(opts.environment).toBe(env);
      expect(opts.enabled).toBe(enabled);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('drops Tauri IPC breadcrumbs but keeps other HTTP breadcrumbs', async () => {
    const opts = (await boot('/')).sentryOptions();
    const ipc = { category: 'http', data: { url: 'http://ipc.localhost/plugin' } };
    const api = { category: 'http', data: { url: 'https://pd2trader.com/api' } };
    expect(opts.beforeBreadcrumb!(ipc)).toBeNull();
    expect(opts.beforeBreadcrumb!(api)).toBe(api);
    expect(opts.beforeBreadcrumb!({ category: 'ui.click' })).toEqual({ category: 'ui.click' });
  });

  it('filters expected account/auth errors and keeps everything else', async () => {
    const { sentryOptions } = await boot('/');
    const opts = sentryOptions();
    const { AccountMismatchError } = await import('@/hooks/pd2website/usePD2Website');
    const send = (event: object, originalException?: unknown) =>
      (opts.beforeSend as (e: object, h: object) => unknown)(event, { originalException });

    expect(send({}, new AccountMismatchError('x'))).toBeNull();
    expect(send({ exception: { values: [{ type: 'AccountMismatchError' }] } })).toBeNull();
    expect(send({ exception: { values: [{ type: 'AuthenticationError' }] } })).toBeNull();
    // console.error capture arrives as a message event with no exception
    expect(send({ message: 'User Bob is not associated with your logged-in account' })).toBeNull();
    expect(
      send({ exception: { values: [{ type: 'Error', value: 'Foo is not associated with your logged-in account' }] } }),
    ).toBeNull();

    const real = { exception: { values: [{ type: 'TypeError', value: 'x is undefined' }] } };
    expect(send(real, new TypeError('x is undefined'))).toBe(real);
    expect(send({ message: 'Something else' })).toEqual({ message: 'Something else' });
  });
});
