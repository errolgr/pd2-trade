import type { PluginManifest } from './manifest';
import type { BrokerMethod, FetchParams, FetchResult, HostToWorker, NotifyParams, WorkerToHost } from './protocol';
import type {
  AccountProfile,
  CallableSlotId,
  EventMap,
  EventName,
  NetWorthSummary,
  RunePrice,
  SlotInput,
  SlotOutput,
} from './slots';
import type { CorePrice, GameMode } from './slots';
import type { JsonValue } from './ui';
import { SDK_VERSION } from './version';

/**
 * The plugin runtime client, used inside the plugin's worker:
 *
 *   import { sdk, ui } from '@pd2-trader/plugin-sdk';
 *   sdk.slots.register('priceCheck.section', ({ item, price }) => ui.section('Craft value', [...]));
 *
 * Every capability goes through the host broker; calls without the needed permission reject.
 */

type Awaitable<T> = T | Promise<T>;

export interface PluginResponse {
  ok: boolean;
  status: number;
  headers: Record<string, string>;
  text(): Promise<string>;
  json<T = unknown>(): Promise<T>;
}

export interface PluginFetchInit {
  method?: FetchParams['method'];
  headers?: Record<string, string>;
  body?: string;
}

export interface Pd2Sdk {
  readonly version: string;
  /** The manifest the host loaded (after init; null before). */
  manifest(): PluginManifest | null;
  slots: {
    register<S extends CallableSlotId>(slot: S, handler: (input: SlotInput<S>) => Awaitable<SlotOutput<S>>): void;
  };
  events: {
    on<E extends EventName>(name: E, handler: (payload: EventMap[E]) => void): () => void;
  };
  commands: {
    register(id: string, handler: (args?: JsonValue) => Awaitable<void>): void;
  };
  /** storage:local — namespaced KV, 5 MB quota. Values are JSON. */
  storage: {
    get<T extends JsonValue = JsonValue>(key: string): Promise<T | undefined>;
    set(key: string, value: JsonValue): Promise<void>;
    remove(key: string): Promise<void>;
    keys(): Promise<string[]>;
  };
  /** Proxied fetch to a host listed in manifest.network (https only, no cookies, no redirects). */
  fetch(url: string, init?: PluginFetchInit): Promise<PluginResponse>;
  /** prices:read — pd2-trader price data for the user's ladder/mode. */
  prices: {
    runes(): Promise<RunePrice[]>;
    item(name: string): Promise<(CorePrice & { name: string }) | null>;
    mode(): Promise<GameMode>;
  };
  settings: {
    get<T extends Record<string, unknown> = Record<string, string | number | boolean>>(): Promise<T>;
    onChange(handler: (values: Record<string, string | number | boolean>) => void): () => void;
  };
  /** notifications — host toast, rate-limited. */
  notify(notification: NotifyParams): Promise<void>;
  /** account:profile */
  account: { profile(): Promise<AccountProfile | null> };
  /** stash:read */
  stash: { summary(): Promise<NetWorthSummary | null> };
  panels: {
    open(panel: string, payload?: JsonValue): Promise<void>;
    post(panel: string, data: JsonValue): Promise<void>;
    onMessage(handler: (panel: string, data: unknown) => void): () => void;
  };
  log(...args: unknown[]): void;
}

interface ScopeLike {
  addEventListener(type: 'message', listener: (event: MessageEvent) => void): void;
}

export function createSdk(scope: ScopeLike): Pd2Sdk {
  let port: MessagePort | null = null;
  const outbox: WorkerToHost[] = [];
  let seq = 0;
  const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  const slotHandlers = new Map<string, (input: unknown) => unknown>();
  const commandHandlers = new Map<string, (args?: JsonValue) => unknown>();
  const eventHandlers = new Map<string, Set<(payload: unknown) => void>>();
  const settingsHandlers = new Set<(values: Record<string, string | number | boolean>) => void>();
  const panelHandlers = new Set<(panel: string, data: unknown) => void>();
  let manifest: PluginManifest | null = null;

  const send = (message: WorkerToHost) => {
    if (port) port.postMessage(message);
    else outbox.push(message);
  };

  const call = <T>(method: BrokerMethod, params?: unknown): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      const id = ++seq;
      pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
      send({ t: 'call', id, method, params });
    });

  const reply = (id: number, run: () => unknown) => {
    Promise.resolve()
      .then(run)
      .then(
        (value) => send({ t: 'return', id, ok: true, value }),
        (error: unknown) =>
          send({ t: 'return', id, ok: false, error: error instanceof Error ? error.message : String(error) }),
      );
  };

  const handle = (message: HostToWorker) => {
    switch (message.t) {
      case 'init':
        manifest = message.manifest;
        settingsHandlers.forEach((fn) => fn(message.settings as Record<string, string | number | boolean>));
        break;
      case 'invoke':
        if (message.kind === 'slot') {
          const handler = slotHandlers.get(message.slot);
          reply(message.id, () => {
            if (!handler) throw new Error(`No handler registered for ${message.slot}`);
            return handler(message.input);
          });
        } else {
          const handler = commandHandlers.get(message.command);
          reply(message.id, () => {
            if (!handler) throw new Error(`No handler registered for command ${message.command}`);
            return handler(message.args as JsonValue | undefined);
          });
        }
        break;
      case 'event':
        eventHandlers.get(message.name)?.forEach((fn) => {
          try {
            fn(message.payload);
          } catch (error) {
            console.error(error);
          }
        });
        break;
      case 'settings':
        settingsHandlers.forEach((fn) => fn(message.values as Record<string, string | number | boolean>));
        break;
      case 'panelMessage':
        panelHandlers.forEach((fn) => fn(message.panel, message.data));
        break;
      case 'result': {
        const entry = pending.get(message.id);
        if (!entry) break;
        pending.delete(message.id);
        if (message.ok) entry.resolve(message.value);
        else entry.reject(new Error(message.error ?? 'Host error'));
        break;
      }
      case 'ping':
        send({ t: 'pong', id: message.id });
        break;
    }
  };

  scope.addEventListener('message', (event: MessageEvent) => {
    const data = event.data as { t?: string } | null;
    if (port || data?.t !== 'pd2:connect' || !event.ports?.[0]) return;
    port = event.ports[0];
    port.onmessage = (e: MessageEvent) => handle(e.data as HostToWorker);
    port.postMessage({ t: 'ready', sdkVersion: SDK_VERSION } satisfies WorkerToHost);
    for (const message of outbox.splice(0)) port.postMessage(message);
  });

  const subscribe = <T>(set: Set<T>, fn: T) => {
    set.add(fn);
    return () => void set.delete(fn);
  };

  return {
    version: SDK_VERSION,
    manifest: () => manifest,
    slots: {
      register(slot, handler) {
        slotHandlers.set(slot, handler as (input: unknown) => unknown);
      },
    },
    events: {
      on(name, handler) {
        let set = eventHandlers.get(name);
        if (!set) eventHandlers.set(name, (set = new Set()));
        return subscribe(set, handler as (payload: unknown) => void);
      },
    },
    commands: {
      register(id, handler) {
        commandHandlers.set(id, handler);
      },
    },
    storage: {
      get: (key) => call('storage.get', { key }),
      set: (key, value) => call('storage.set', { key, value }),
      remove: (key) => call('storage.remove', { key }),
      keys: () => call('storage.keys'),
    },
    async fetch(url, init = {}) {
      const result = await call<FetchResult>('fetch', { url, ...init } satisfies FetchParams);
      return {
        ok: result.status >= 200 && result.status < 300,
        status: result.status,
        headers: result.headers,
        text: async () => result.body,
        json: async <T>() => JSON.parse(result.body) as T,
      };
    },
    prices: {
      runes: () => call('prices.runes'),
      item: (name) => call('prices.item', { name }),
      mode: () => call('prices.mode'),
    },
    settings: {
      get: () => call('settings.get'),
      onChange: (handler) => subscribe(settingsHandlers, handler),
    },
    notify: (notification) => call('notify', notification),
    account: { profile: () => call('account.profile') },
    stash: { summary: () => call('stash.summary') },
    panels: {
      open: (panel, payload) => call('panels.open', { panel, payload }),
      post: (panel, data) => call('panels.post', { panel, data }),
      onMessage: (handler) => subscribe(panelHandlers, handler),
    },
    log: (...args) => void call('log', { args: args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))) }),
  };
}

const inWorker =
  typeof (globalThis as { WorkerGlobalScope?: unknown }).WorkerGlobalScope === 'function' &&
  globalThis instanceof (globalThis as unknown as { WorkerGlobalScope: new () => object }).WorkerGlobalScope;

/** The worker's SDK instance. Outside a worker (the host, tests) it never connects. */
export const sdk: Pd2Sdk = createSdk(inWorker ? (globalThis as unknown as ScopeLike) : { addEventListener: () => {} });
