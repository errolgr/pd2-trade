import { createHash, generateKeyPairSync, sign, type KeyObject } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { JsonValue, Permission } from '@pd2-trader/plugin-sdk';
import { PluginManager } from '../host/manager';
import { EMPTY_PLUGINS_SETTINGS, type HostServices, type PluginBundle, type PluginPersistence, type PluginsSettings } from '../host/types';
import { canonicalJson } from '../trust/verify';
import type { BlocklistEntry, ListingDetail, MarketplaceApi, Release, SignedBlocklist } from './api';
import { BundleVerificationError, MarketplaceClient } from './install';

const ID = 'com.example.ticker';

interface TestKeys {
  privateKey: KeyObject;
  /** base64 raw 32-byte public key, as PLUGIN_PUBLIC_KEY. */
  publicKey: string;
}

function keyPair(): TestKeys {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const raw = publicKey.export({ format: 'der', type: 'spki' }).subarray(-32);
  return { privateKey, publicKey: Buffer.from(raw).toString('base64') };
}

const signWith = (key: KeyObject, message: string) => sign(null, Buffer.from(message, 'utf8'), key).toString('base64');

/** Panel-only plugin: no worker, so the real manager installs it without a sandbox. */
function bundle(version: string, permissions: Permission[] = ['prices:read'], id = ID): PluginBundle {
  return {
    format: 'pd2-plugin-bundle@1',
    manifest: {
      id,
      name: 'Ticker',
      version,
      sdk: '^1.0.0',
      entry: { panels: { main: 'panels/main.html' } },
      slots: [],
      commands: [],
      permissions,
      network: [],
    } as PluginBundle['manifest'],
    files: { 'panels/main.html': '<p>ticker</p>' },
  };
}

/** In-memory marketplace: each published version has bytes, hash and signature that tests can corrupt. */
class FakeApi implements MarketplaceApi {
  base = 'http://mock/api/plugins';
  latest = new Map<string, string>();
  releases = new Map<string, { bytes: Uint8Array; sha256: string; signature: string }>();
  reportInstall = vi.fn(async () => {});
  reportError = vi.fn(async () => {});
  reportActive = vi.fn(async () => {});

  constructor(private readonly key: KeyObject) {}

  publish(b: PluginBundle, opts: { as?: { id: string; version: string }; key?: KeyObject } = {}) {
    const { id, version } = opts.as ?? b.manifest;
    const bytes = new TextEncoder().encode(JSON.stringify(b));
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    const signature = signWith(opts.key ?? this.key, `${id}@${version}:${sha256}`);
    this.releases.set(`${id}@${version}`, { bytes, sha256, signature });
    this.latest.set(id, version);
    return this.releases.get(`${id}@${version}`);
  }

  async list() {
    return { items: [], nextCursor: null };
  }

  async get(id: string): Promise<ListingDetail> {
    const latestVersion = this.latest.get(id);
    if (!latestVersion) throw new Error('unknown');
    return {
      id,
      name: 'Ticker',
      summary: '',
      author: '',
      category: 'utility',
      latestVersion,
      permissions: [],
      network: [],
      installs: 0,
      verified: true,
      versions: [],
    };
  }

  async release(id: string, version: string): Promise<Release> {
    const r = this.releases.get(`${id}@${version}`);
    if (!r) throw new Error('unknown release');
    return { manifest: null, bundleUrl: `${id}/${version}/bundle`, sha256: r.sha256, signature: r.signature, publishedAt: '' };
  }

  async blocklist(): Promise<SignedBlocklist> {
    throw new Error('offline');
  }

  async download(url: string) {
    const [id, version] = url.split('/');
    return this.releases.get(`${id}@${version}`).bytes;
  }
}

function memoryPersistence(): PluginPersistence {
  let settings: PluginsSettings = EMPTY_PLUGINS_SETTINGS;
  const bundles = new Map<string, PluginBundle>();
  const kv = new Map<string, Record<string, JsonValue>>();
  return {
    loadSettings: async () => settings,
    saveSettings: async (next) => void (settings = next),
    readBundle: async (key) => bundles.get(key) ?? null,
    writeBundle: async (key, b) => void bundles.set(key, b),
    deleteBundles: async (id) => [...bundles.keys()].filter((k) => k.startsWith(`${id}@`)).forEach((k) => bundles.delete(k)),
    readKv: async (id) => kv.get(id) ?? {},
    writeKv: async (id, data) => void kv.set(id, data),
  };
}

let manager: PluginManager;
let api: FakeApi;
let client: MarketplaceClient;
let signer: TestKeys;
let consents: number;

beforeEach(async () => {
  signer = keyPair();
  api = new FakeApi(signer.privateKey);
  manager = new PluginManager();
  await manager.start({
    services: {} as HostServices,
    persistence: memoryPersistence(),
    launchSandbox: () => Promise.reject(new Error('no worker expected')),
  });
  // The consent sheet: always Allow.
  consents = 0;
  manager.subscribe(() => {
    const consent = manager.getSnapshot().consent;
    if (consent) {
      consents++;
      queueMicrotask(() => manager.answerConsent(consent.id, true));
    }
  });
  client = new MarketplaceClient({ api, manager, publicKey: signer.publicKey });
});

const installed = () => manager.getSnapshot().plugins.find((p) => p.installed.id === ID)?.installed;

function signedBlocklist(entries: BlocklistEntry[], issuedAt: string, key: KeyObject = signer.privateKey): SignedBlocklist {
  return { entries, issuedAt, signature: signWith(key, canonicalJson({ entries, issuedAt })) };
}

describe('MarketplaceClient.install', () => {
  it('installs a verified bundle through consent and reports the install', async () => {
    api.publish(bundle('1.0.0'));
    await expect(client.install(ID)).resolves.toBe(true);
    expect(consents).toBe(1);
    expect(installed()).toMatchObject({ version: '1.0.0', enabled: true, source: { kind: 'marketplace' } });
    expect(installed().granted.permissions).toEqual(['prices:read']);
    expect(api.reportInstall).toHaveBeenCalledWith(ID, '1.0.0');
  });

  it('rejects tampered bytes (hash mismatch) and installs nothing', async () => {
    const release = api.publish(bundle('1.0.0'));
    release.bytes = new TextEncoder().encode(JSON.stringify(bundle('1.0.0', ['chat:read'])));
    await expect(client.install(ID)).rejects.toThrow(/do not match the published hash/);
    expect(consents).toBe(0);
    expect(installed()).toBeUndefined();
  });

  it('rejects a bundle signed by another key', async () => {
    api.publish(bundle('1.0.0'), { key: keyPair().privateKey });
    await expect(client.install(ID)).rejects.toBeInstanceOf(BundleVerificationError);
    await expect(client.install(ID)).rejects.toThrow(/signature is invalid/);
    expect(installed()).toBeUndefined();
  });

  it('rejects a signed bundle whose manifest id or version differs from the release', async () => {
    api.publish(bundle('1.0.1'), { as: { id: ID, version: '1.0.0' } });
    await expect(client.install(ID, '1.0.0')).rejects.toThrow(/does not match the signed id and version/);
    api.publish(bundle('1.0.0', [], 'com.example.other'), { as: { id: ID, version: '1.0.0' } });
    await expect(client.install(ID, '1.0.0')).rejects.toThrow(/does not match the signed id and version/);
    expect(manager.getSnapshot().plugins).toHaveLength(0);
  });
});

describe('MarketplaceClient.applyBlocklist', () => {
  beforeEach(async () => {
    api.publish(bundle('1.0.0'));
    await client.install(ID);
  });

  it('ignores a blocklist with a bad signature', async () => {
    const list = signedBlocklist([{ id: ID, versions: '*', reason: 'x' }], '2026-11-01T00:00:00Z', keyPair().privateKey);
    await expect(client.applyBlocklist(list)).resolves.toBe(false);
    expect(client.blocklist).toEqual([]);
    expect(installed().enabled).toBe(true);
  });

  it('disables a blocklisted installed version and refuses to install it', async () => {
    const entries = [{ id: ID, versions: ['1.0.0'], reason: 'malware' }];
    await expect(client.applyBlocklist(signedBlocklist(entries, '2026-11-01T00:00:00Z'))).resolves.toBe(true);
    expect(installed()).toMatchObject({ enabled: false, disabledReason: 'blocklisted' });
    await expect(client.install(ID, '1.0.0')).rejects.toThrow(/blocked: malware/);
  });

  it('rejects an older blocklist (no rollback)', async () => {
    const entries = [{ id: ID, versions: '*' as const, reason: 'malware' }];
    await client.applyBlocklist(signedBlocklist(entries, '2026-11-02T00:00:00Z'));
    await expect(client.applyBlocklist(signedBlocklist([], '2026-11-01T00:00:00Z'))).resolves.toBe(false);
    expect(client.blocklist).toEqual(entries);
    expect(installed().disabledReason).toBe('blocklisted');
  });
});

describe('MarketplaceClient.checkUpdates', () => {
  beforeEach(async () => {
    api.publish(bundle('1.0.0'));
    await client.install(ID);
    consents = 0;
  });

  it('applies an update with the same permissions silently', async () => {
    api.publish(bundle('1.1.0'));
    await client.checkUpdates();
    expect(consents).toBe(0);
    expect(installed()).toMatchObject({ version: '1.1.0', enabled: true });
    expect(installed().pendingUpdate).toBeUndefined();
  });

  it('holds an update that asks for a new permission', async () => {
    api.publish(bundle('1.1.0', ['prices:read', 'chat:read']));
    await client.checkUpdates();
    expect(consents).toBe(0);
    expect(installed().version).toBe('1.0.0');
    expect(installed().granted.permissions).toEqual(['prices:read']);
    expect(installed().pendingUpdate).toMatchObject({ version: '1.1.0', permissions: ['prices:read', 'chat:read'] });
  });

  it('skips a blocklisted latest version', async () => {
    await client.applyBlocklist(signedBlocklist([{ id: ID, versions: ['1.1.0'], reason: 'bad' }], '2026-11-01T00:00:00Z'));
    api.publish(bundle('1.1.0'));
    await client.checkUpdates();
    expect(installed().version).toBe('1.0.0');
  });
});
