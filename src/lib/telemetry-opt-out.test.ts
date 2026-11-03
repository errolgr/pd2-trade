import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => ({
  client: undefined as { getOptions: () => { enabled?: boolean } } | undefined,
  replay: { stop: vi.fn(), startBuffering: vi.fn() },
  faro: { api: {} } as Record<string, unknown>,
  settings: undefined as string | undefined,
}));

vi.mock('@sentry/react', () => ({
  getClient: () => sdk.client,
  getReplay: () => (sdk.client ? sdk.replay : undefined),
}));
vi.mock('@grafana/faro-web-sdk', () => ({ faro: sdk.faro }));
vi.mock('@/lib/faro', () => ({ initFaro: vi.fn() }));
vi.mock('@/lib/sentry', () => ({ initSentry: vi.fn(), isSentryEnabledForBuild: () => true }));
vi.mock('@/lib/browser-fs', () => ({
  BaseDirectory: { AppConfig: 13 },
  readTextFile: async () => sdk.settings ?? Promise.reject(new Error('not found')),
}));

// Fresh module state (enabled flag, pending init timer) per test
async function load() {
  vi.resetModules();
  const mod = await import('./telemetry-opt-out');
  const { initSentry } = await import('@/lib/sentry');
  const { initFaro } = await import('@/lib/faro');
  return { ...mod, initSentry: vi.mocked(initSentry), initFaro: vi.mocked(initFaro) };
}

beforeEach(() => {
  vi.useFakeTimers();
  sdk.client = undefined;
  sdk.settings = undefined;
  for (const key of Object.keys(sdk.faro)) if (key !== 'api') delete sdk.faro[key];
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('telemetry opt-out', () => {
  it('starts Faro now and Sentry after 1s when settings.json has no opt-out', async () => {
    const { initTelemetryFromSettings, initSentry, initFaro } = await load();
    await initTelemetryFromSettings();
    expect(initFaro).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(999);
    expect(initSentry).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(initSentry).toHaveBeenCalledTimes(1);
  });

  it('opting out within the startup delay cancels the pending Sentry init', async () => {
    const { applyTelemetryOptOut, initSentry } = await load();
    applyTelemetryOptOut(false);
    applyTelemetryOptOut(true);
    vi.advanceTimersByTime(5000);
    expect(initSentry).not.toHaveBeenCalled();
  });

  it('opting out of running telemetry disables the client, stops replay and pauses Faro; opting back in resumes', async () => {
    const { applyTelemetryOptOut, initSentry, initFaro } = await load();
    const options: { enabled?: boolean } = {};
    // The real SDKs register themselves on init: simulate that, then let startup run
    initFaro.mockImplementation(() => Object.assign(sdk.faro, { pause: vi.fn(), unpause: vi.fn() }));
    initSentry.mockImplementation(() => {
      options.enabled = true;
      sdk.client = { getOptions: () => options };
    });
    applyTelemetryOptOut(false);
    vi.advanceTimersByTime(1000);
    expect(initSentry).toHaveBeenCalledTimes(1);

    applyTelemetryOptOut(true);
    expect(options.enabled).toBe(false);
    expect(sdk.replay.stop).toHaveBeenCalledTimes(1);
    expect(sdk.faro.pause).toHaveBeenCalledTimes(1);

    applyTelemetryOptOut(true); // repeated settings effects are no-ops
    expect(sdk.replay.stop).toHaveBeenCalledTimes(1);

    applyTelemetryOptOut(false);
    expect(options.enabled).toBe(true);
    expect(sdk.replay.startBuffering).toHaveBeenCalledTimes(1);
    expect(sdk.faro.unpause).toHaveBeenCalledTimes(1);
    expect(initSentry).toHaveBeenCalledTimes(1);
    expect(initFaro).toHaveBeenCalledTimes(1);
  });
});
