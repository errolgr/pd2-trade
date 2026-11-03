import {
  BROKER_METHODS,
  STORAGE_QUOTA_BYTES,
  type BrokerMethod,
  type FetchParams,
  type JsonValue,
  type NotifyParams,
  type Permission,
  type PluginManifest,
} from '@pd2-trader/plugin-sdk';
import { NOTIFY_LIMIT, NOTIFY_WINDOW_MS, RateLimiter } from './budget';
import { proxiedFetch } from './fetch-proxy';
import type { HostServices, InstalledPlugin, PluginPersistence } from './types';

/**
 * The plugin broker (PRD §6.2, §6.5): the only path from a sandbox to host capabilities. Every call is checked
 * against the permissions the manifest declares AND the user granted. There is no method for the JWT, game
 * input, the filesystem, clipboard write or Tauri commands, so those can't be granted.
 */

export class PermissionDeniedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PermissionDeniedError';
  }
}

const METHOD_PERMISSIONS: Record<BrokerMethod, Permission | 'network' | null> = {
  'storage.get': 'storage:local',
  'storage.set': 'storage:local',
  'storage.remove': 'storage:local',
  'storage.keys': 'storage:local',
  fetch: 'network',
  'prices.runes': 'prices:read',
  'prices.item': 'prices:read',
  'prices.mode': 'prices:read',
  notify: 'notifications',
  'settings.get': null,
  'account.profile': 'account:profile',
  'stash.summary': 'stash:read',
  'panels.open': null,
  'panels.post': null,
  log: null,
};

export function grantedPermissions(manifest: PluginManifest, granted: InstalledPlugin['granted']): Set<Permission> {
  return new Set(manifest.permissions.filter((p) => granted.permissions.includes(p)));
}

export function grantedNetwork(manifest: PluginManifest, granted: InstalledPlugin['granted']): string[] {
  return manifest.network.filter((host) => granted.network.includes(host));
}

/** Per-plugin namespaced KV with a byte quota over the UTF-8 JSON of all entries. */
export class PluginKv {
  private data: Record<string, JsonValue> | null = null;
  private loading: Promise<Record<string, JsonValue>> | null = null;

  constructor(
    private readonly pluginId: string,
    private readonly persistence: Pick<PluginPersistence, 'readKv' | 'writeKv'>,
    private readonly quotaBytes = STORAGE_QUOTA_BYTES,
  ) {}

  private async load(): Promise<Record<string, JsonValue>> {
    if (this.data) return this.data;
    this.loading ??= this.persistence.readKv(this.pluginId).then((d) => (this.data = { ...d }));
    return this.loading;
  }

  async get(key: string): Promise<JsonValue | undefined> {
    return (await this.load())[checkKey(key)];
  }

  async set(key: string, value: unknown): Promise<void> {
    const data = await this.load();
    let json: string | undefined;
    try {
      json = JSON.stringify(value);
    } catch {
      json = undefined;
    }
    if (json === undefined) throw new Error('storage values must be JSON');
    const next = { ...data, [checkKey(key)]: JSON.parse(json) as JsonValue };
    if (new TextEncoder().encode(JSON.stringify(next)).length > this.quotaBytes)
      throw new Error(`Storage quota of ${Math.round(this.quotaBytes / 1024 / 1024)} MB exceeded`);
    this.data = next;
    await this.persistence.writeKv(this.pluginId, next);
  }

  async remove(key: string): Promise<void> {
    const data = await this.load();
    if (!(checkKey(key) in data)) return;
    const next = { ...data };
    delete next[key];
    this.data = next;
    await this.persistence.writeKv(this.pluginId, next);
  }

  async keys(): Promise<string[]> {
    return Object.keys(await this.load());
  }
}

function checkKey(key: unknown): string {
  if (typeof key !== 'string' || !key.length || key.length > 128) throw new Error('storage keys are 1-128 chars');
  return key;
}

export interface BrokerContext {
  manifest: PluginManifest;
  granted: InstalledPlugin['granted'];
  services: HostServices;
  kv: PluginKv;
  settings(): Record<string, string | number | boolean>;
  /** Panel id (manifest.entry.panels key) → overlay panel id `plugin:<id>:<panel>`. */
  openPanel(panel: string, payload?: JsonValue): void;
  postToPanel(panel: string, data: unknown): void;
  /** Injectable for tests. */
  now?: () => number;
}

const asObject = (params: unknown): Record<string, unknown> =>
  params && typeof params === 'object' && !Array.isArray(params) ? (params as Record<string, unknown>) : {};

export class PluginBroker {
  private readonly permissions: Set<Permission>;
  private readonly network: string[];
  private readonly notifyLimiter = new RateLimiter(NOTIFY_LIMIT, NOTIFY_WINDOW_MS);
  private inFlightFetches = 0;

  constructor(private readonly ctx: BrokerContext) {
    this.permissions = grantedPermissions(ctx.manifest, ctx.granted);
    this.network = grantedNetwork(ctx.manifest, ctx.granted);
  }

  has(permission: Permission): boolean {
    return this.permissions.has(permission);
  }

  private require(method: BrokerMethod): void {
    const needed = METHOD_PERMISSIONS[method];
    if (needed === null) return;
    if (needed === 'network') {
      if (!this.network.length) throw new PermissionDeniedError('fetch needs a host in manifest.network');
      return;
    }
    if (!this.permissions.has(needed)) throw new PermissionDeniedError(`${method} needs the ${needed} permission`);
  }

  async handle(method: string, params: unknown): Promise<unknown> {
    if (!(BROKER_METHODS as readonly string[]).includes(method))
      throw new PermissionDeniedError(`Unknown method ${String(method).slice(0, 40)}`);
    const m = method as BrokerMethod;
    this.require(m);
    const p = asObject(params);
    const { services, kv, manifest } = this.ctx;
    switch (m) {
      case 'storage.get':
        return kv.get(p.key as string);
      case 'storage.set':
        return kv.set(p.key as string, p.value);
      case 'storage.remove':
        return kv.remove(p.key as string);
      case 'storage.keys':
        return kv.keys();
      case 'fetch': {
        if (this.inFlightFetches >= 4) throw new Error('Too many concurrent requests');
        this.inFlightFetches++;
        try {
          return await proxiedFetch(p as unknown as FetchParams, this.network, services.httpFetch);
        } finally {
          this.inFlightFetches--;
        }
      }
      case 'prices.runes':
        return services.runePrices();
      case 'prices.item':
        if (typeof p.name !== 'string' || !p.name || p.name.length > 100) throw new Error('name required');
        return services.itemPrice(p.name);
      case 'prices.mode':
        return services.gameMode();
      case 'notify': {
        const title = typeof p.title === 'string' ? p.title.slice(0, 80) : '';
        if (!title) throw new Error('title required');
        if (!this.notifyLimiter.tryTake((this.ctx.now ?? Date.now)()))
          throw new Error(`Rate limited: at most ${NOTIFY_LIMIT} notifications per minute`);
        const tone = ['default', 'success', 'warning', 'danger'].includes(p.tone as string)
          ? (p.tone as NotifyParams['tone'])
          : 'default';
        services.notify(
          { id: manifest.id, name: manifest.name },
          { title, body: typeof p.body === 'string' ? p.body.slice(0, 300) : undefined, tone },
        );
        return undefined;
      }
      case 'settings.get':
        return this.ctx.settings();
      case 'account.profile':
        return services.accountProfile();
      case 'stash.summary':
        return services.netWorthSummary();
      case 'panels.open':
      case 'panels.post': {
        const panel = p.panel;
        if (typeof panel !== 'string' || !manifest.entry.panels?.[panel])
          throw new Error(`Unknown panel ${String(panel).slice(0, 40)}`);
        if (m === 'panels.open') this.ctx.openPanel(panel, p.payload as JsonValue | undefined);
        else this.ctx.postToPanel(panel, p.data);
        return undefined;
      }
      case 'log': {
        const args = Array.isArray(p.args) ? p.args.slice(0, 10).map((a) => String(a).slice(0, 500)) : [];
        console.info(`[plugin ${manifest.id}]`, ...args);
        return undefined;
      }
    }
  }
}
