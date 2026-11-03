import { createSdk, type JsonValue, type Pd2Sdk, type PluginManifestInput } from '@pd2-trader/plugin-sdk';
import { parseBundle, type SandboxLauncher } from './manager';
import type { HostServices, PluginBundle, PluginPersistence, PluginsSettings } from './types';

/**
 * Test harness: runs plugin "code" in-process. A bundle's worker.js is a key into `programs`; the fake launcher
 * wires a real SDK client to the host over a real MessageChannel, so tests exercise the actual RPC, broker and
 * budgets (jsdom/happy-dom can't run sandboxed iframes).
 */
export const programs = new Map<string, (sdk: Pd2Sdk) => void>();

export function fakeLauncher(): SandboxLauncher & { destroyed: number } {
  const launcher = (async ({ code }) => {
    const program = code === 'noop' ? () => {} : programs.get(code);
    if (!program) throw new Error(`no program ${code}`);
    const channel = new MessageChannel();
    const listeners: Array<(event: MessageEvent) => void> = [];
    const sdk = createSdk({ addEventListener: (_type, listener) => listeners.push(listener) });
    program(sdk);
    for (const listener of listeners) listener({ data: { t: 'pd2:connect' }, ports: [channel.port2] } as unknown as MessageEvent);
    return {
      port: channel.port1,
      destroy: () => {
        channel.port2.close();
        launcher.destroyed++;
      },
    };
  }) as unknown as SandboxLauncher & { destroyed: number };
  launcher.destroyed = 0;
  return launcher;
}

export function memoryPersistence(initial: PluginsSettings = { installed: {} }): PluginPersistence & {
  settings: PluginsSettings;
  kv: Map<string, Record<string, JsonValue>>;
} {
  const bundles = new Map<string, PluginBundle>();
  const store = {
    settings: initial,
    kv: new Map<string, Record<string, JsonValue>>(),
    loadSettings: async () => store.settings,
    saveSettings: async (settings: PluginsSettings) => {
      store.settings = settings;
    },
    readBundle: async (key: string) => bundles.get(key) ?? null,
    writeBundle: async (key: string, bundle: PluginBundle) => void bundles.set(key, bundle),
    deleteBundles: async (id: string) => {
      for (const key of bundles.keys()) if (key.startsWith(`${id}@`)) bundles.delete(key);
      store.kv.delete(id);
    },
    readKv: async (id: string) => store.kv.get(id) ?? {},
    writeKv: async (id: string, data: Record<string, JsonValue>) => void store.kv.set(id, data),
  };
  return store;
}

export function fakeServices(overrides: Partial<HostServices> = {}): HostServices & { toasts: string[] } {
  const toasts: string[] = [];
  return {
    toasts,
    gameMode: () => ({ ladder: true, hardcore: false }),
    runePrices: async () => [{ name: 'Ber Rune', priceHr: 1, listings: 50, fixed: false }],
    itemPrice: async () => null,
    netWorthSummary: () => null,
    accountProfile: () => ({ account: 'tester', characters: [] }),
    notify: (_plugin, n) => void toasts.push(n.title),
    openPanel: () => {},
    httpFetch: async () => new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }),
    themeInfo: () => ({ id: 'test', mode: 'dark', vars: {} }),
    ...overrides,
  };
}

/** A bundle whose worker runs `programs.get(program)` ('noop' = an empty plugin). */
export function makeBundle(manifest: Partial<PluginManifestInput> & { id: string }, program = 'noop'): PluginBundle {
  return parseBundle({
    format: 'pd2-plugin-bundle@1',
    manifest: { name: manifest.id, version: '1.0.0', sdk: '^1.0.0', entry: { worker: 'worker.js' }, ...manifest },
    files: { 'worker.js': program },
  });
}
