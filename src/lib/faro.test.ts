import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BrowserConfig, TransportItem, APIEvent } from '@grafana/faro-web-sdk';

const sdk = vi.hoisted(() => {
  class ErrorsInstrumentation {
    name = 'errors';
  }
  class OtherInstrumentation {
    name = 'web-vitals';
  }
  class TracingInstrumentation {
    constructor(public options: { instrumentationOptions: { propagateTraceHeaderCorsUrls: RegExp[] } }) {}
  }
  return {
    ErrorsInstrumentation,
    OtherInstrumentation,
    TracingInstrumentation,
    initializeFaro: vi.fn(),
    getWebInstrumentations: vi.fn(),
    tauri: { value: false },
  };
});

vi.mock('@grafana/faro-web-sdk', () => ({
  ErrorsInstrumentation: sdk.ErrorsInstrumentation,
  getWebInstrumentations: sdk.getWebInstrumentations,
  initializeFaro: sdk.initializeFaro,
  TransportItemType: { EVENT: 'event', MEASUREMENT: 'measurement' },
}));
vi.mock('@grafana/faro-web-tracing', () => ({ TracingInstrumentation: sdk.TracingInstrumentation }));
vi.mock('@tauri-apps/api/core', () => ({ isTauri: () => sdk.tauri.value }));
vi.mock('@/pages/currency/lib/price-api', () => ({ API_BASE_URL: 'https://prices.pd2trader.com' }));

/** Loads faro.ts fresh: BACKEND_URL (pkce.ts) is read from the env at module load. */
async function init(env: { faroUrl?: string; backendUrl?: string } = {}): Promise<BrowserConfig> {
  vi.stubEnv('VITE_FARO_URL', env.faroUrl ?? 'https://collector.example/faro');
  vi.stubEnv('VITE_BACKEND_URL', env.backendUrl ?? '');
  vi.resetModules();
  const { initFaro } = await import('./faro');
  initFaro();
  return sdk.initializeFaro.mock.calls.at(-1)?.[0];
}

function tracingPatterns(config: BrowserConfig): RegExp[] {
  const tracing = config.instrumentations!.find((i) => i instanceof sdk.TracingInstrumentation);
  if (!(tracing instanceof sdk.TracingInstrumentation)) throw new Error('no tracing instrumentation');
  return tracing.options.instrumentationOptions.propagateTraceHeaderCorsUrls;
}

beforeEach(() => {
  sdk.tauri.value = false;
  sdk.getWebInstrumentations.mockReturnValue([new sdk.ErrorsInstrumentation(), new sdk.OtherInstrumentation()]);
  vi.stubGlobal('__APP_VERSION__', '9.9.9');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('initFaro', () => {
  it('does nothing without a collector URL', async () => {
    vi.stubEnv('VITE_FARO_URL', '');
    vi.resetModules();
    const { initFaro } = await import('./faro');

    initFaro();

    expect(sdk.initializeFaro).not.toHaveBeenCalled();
  });

  it('identifies the app and leaves exception capture to Sentry', async () => {
    const config = await init();

    expect(config.url).toBe('https://collector.example/faro');
    expect(config.app).toMatchObject({ name: 'pd2-trader-overlay', version: '9.9.9' });
    expect(sdk.getWebInstrumentations).toHaveBeenCalledWith({ captureConsole: false });
    expect(config.instrumentations!.some((i) => i instanceof sdk.ErrorsInstrumentation)).toBe(false);
    expect(config.instrumentations!.some((i) => i instanceof sdk.OtherInstrumentation)).toBe(true);
  });

  it.each([
    ['browser', false, 'browser'],
    ['Tauri overlay', true, 'Main'],
  ])('labels the session and view for %s', async (_case, isTauri, label) => {
    sdk.tauri.value = isTauri;

    const config = await init();

    expect(config.view).toEqual({ name: label });
    expect(config.sessionTracking?.session?.attributes).toEqual({ window_label: label });
  });

  it('uses the path (no query) as the page id', async () => {
    const config = await init();

    expect(config.pageTracking!.generatePageId!({ pathname: '/quick-list', search: '?item=abc' } as Location)).toBe(
      '/quick-list',
    );
  });

  it('ignores Tauri IPC and Sentry traffic but not our API', async () => {
    const config = await init();
    const ignored = (url: string) =>
      config.ignoreUrls!.some((p) => (p instanceof RegExp ? p.test(url) : url.includes(p)));

    expect(ignored('http://ipc.localhost/plugin%3Ahttp%7Cfetch')).toBe(true);
    expect(ignored('ipc://localhost/invoke')).toBe(true);
    expect(ignored('https://o123.ingest.sentry.io/api/1/envelope/')).toBe(true);
    expect(ignored('https://pd2trader.com/item-prices')).toBe(false);
  });
});

describe('trace header propagation', () => {
  it('targets our backend origins only, with exact host matching', async () => {
    const patterns = tracingPatterns(await init());
    const propagates = (url: string) => patterns.some((p) => p.test(url));

    expect(propagates('https://pd2trader.com/item-prices/average?x=1')).toBe(true);
    expect(propagates('https://pd2trader.com')).toBe(true);
    expect(propagates('https://prices.pd2trader.com/x')).toBe(true);
    expect(propagates('https://pd2trader.com.evil.example/x')).toBe(false);
    expect(propagates('https://pd2traderXcom/x')).toBe(false);
    expect(propagates('https://api.projectdiablo2.com/market/listing')).toBe(false);
  });

  it('uses a configured backend URL and skips an invalid one', async () => {
    const custom = tracingPatterns(await init({ backendUrl: 'http://localhost:3000/api' }));
    expect(custom.some((p) => p.test('http://localhost:3000/health'))).toBe(true);
    expect(custom.some((p) => p.test('https://pd2trader.com/x'))).toBe(false);

    const invalid = tracingPatterns(await init({ backendUrl: 'not a url' }));
    expect(invalid).toHaveLength(1);
    expect(invalid[0].test('https://prices.pd2trader.com/x')).toBe(true);
  });
});

describe('beforeSend URL scrubbing', () => {
  function item(overrides: Partial<TransportItem<APIEvent>>): TransportItem<APIEvent> {
    return {
      type: 'event',
      payload: { name: 'click', attributes: {} },
      meta: { page: { url: 'http://tauri.localhost/quick-list?item=SECRET#top' } },
      ...overrides,
    } as TransportItem<APIEvent>;
  }

  it('strips query and hash from the page URL without mutating the input', async () => {
    const { beforeSend } = await init();
    const input = item({});

    const out = beforeSend!(input) as TransportItem<APIEvent>;

    expect(out.meta.page?.url).toBe('http://tauri.localhost/quick-list');
    expect(input.meta.page?.url).toContain('SECRET');
  });

  // BUG: faro.ts:64 — withoutQuery builds `${url.origin}${url.pathname}`, but custom schemes have an
  // opaque origin, so macOS/Linux overlay pages (tauri://localhost/...) are reported as "null/quick-list".
  it.fails('keeps the scheme and host of tauri:// page URLs (macOS/Linux webviews)', async () => {
    const { beforeSend } = await init();

    const out = beforeSend!(
      item({ meta: { page: { url: 'tauri://localhost/quick-list?item=SECRET' } } }),
    ) as TransportItem<APIEvent>;

    expect(out.meta.page?.url).toBe('tauri://localhost/quick-list');
  });

  it('strips queries from performance timing event URLs', async () => {
    const { beforeSend } = await init();

    const out = beforeSend!(
      item({
        payload: {
          name: 'faro.performance.resource',
          attributes: { name: 'https://api.projectdiablo2.com/market/listing?q=Jah', duration: '12' },
        },
      } as Partial<TransportItem<APIEvent>>),
    ) as TransportItem<APIEvent>;

    expect(out.payload).toMatchObject({
      attributes: { name: 'https://api.projectdiablo2.com/market/listing', duration: '12' },
    });
  });

  it('leaves non-performance events, non-URL values and page-less items alone', async () => {
    const { beforeSend } = await init();
    const custom = item({
      payload: { name: 'list_item_auto_selected', attributes: { name: 'https://x.example/?q=1' } },
      meta: { page: { url: 'not-a-url?x=1' } },
    } as Partial<TransportItem<APIEvent>>);
    const pageless = item({ meta: {} });

    expect(beforeSend!(custom)).toEqual(custom);
    expect(beforeSend!(pageless)).toEqual(pageless);
  });
});
