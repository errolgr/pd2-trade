import { compareVersions } from '@pd2-trader/plugin-sdk';
import { parseBundle, type PluginManager } from '../host/manager';
import type { PluginBundle } from '../host/types';
import { canonicalJson, verifyBundle, verifyEd25519 } from '../trust/verify';
import type { BlocklistEntry, MarketplaceApi, Release, SignedBlocklist } from './api';

/**
 * Marketplace install, auto-update and the remote kill switch (PRD §7.1, §7.3). Nothing is loaded unless its
 * bytes hash to the signed sha256 and the server's Ed25519 signature over `${id}@${version}:${sha256}` verifies.
 */

export class BundleVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BundleVerificationError';
  }
}

export type { BlocklistEntry };

/** Downloads and verifies a release; returns the parsed bundle. */
export async function fetchVerifiedBundle(
  api: MarketplaceApi,
  id: string,
  release: Release,
  version: string,
  publicKey?: string,
): Promise<PluginBundle> {
  const bytes = await api.download(release.bundleUrl);
  const check = await verifyBundle(
    bytes,
    { id, version, sha256: release.sha256, signature: release.signature },
    publicKey,
  );
  if (!check.ok)
    throw new BundleVerificationError(
      check.reason === 'hash-mismatch'
        ? 'Downloaded files do not match the published hash'
        : 'Bundle signature is invalid',
    );
  let bundle: PluginBundle;
  try {
    bundle = parseBundle(JSON.parse(new TextDecoder().decode(bytes)));
  } catch (error) {
    throw new BundleVerificationError(`Bundle is malformed: ${(error as Error).message}`);
  }
  if (bundle.manifest.id !== id || bundle.manifest.version !== version)
    throw new BundleVerificationError('Bundle manifest does not match the signed id and version');
  return bundle;
}

export function isBlocked(entries: readonly BlocklistEntry[], id: string, version: string): BlocklistEntry | undefined {
  return entries.find((e) => e.id === id && (e.versions === '*' || e.versions.includes(version)));
}

const BLOCKLIST_CACHE_KEY = 'pd2-plugin-blocklist';
export const BLOCKLIST_INTERVAL_MS = 30 * 60 * 1000;
export const UPDATE_INTERVAL_MS = 6 * 60 * 60 * 1000;

export async function verifyBlocklist(list: SignedBlocklist, publicKey?: string): Promise<boolean> {
  return verifyEd25519(canonicalJson({ entries: list.entries, issuedAt: list.issuedAt }), list.signature, publicKey);
}

export interface MarketplaceClientOptions {
  api: MarketplaceApi;
  manager: PluginManager;
  publicKey?: string;
  storage?: Pick<Storage, 'getItem' | 'setItem'>;
}

/** Install/update/blocklist orchestration over one API + manager. */
export class MarketplaceClient {
  private entries: BlocklistEntry[] = [];
  private issuedAt = '';
  private timers: Array<ReturnType<typeof setInterval>> = [];

  constructor(private readonly opts: MarketplaceClientOptions) {}

  get blocklist(): readonly BlocklistEntry[] {
    return this.entries;
  }

  /** Verified install with consent. Resolves false when the user cancels the consent sheet. */
  async install(id: string, version?: string): Promise<boolean> {
    const { api, manager, publicKey } = this.opts;
    const target = version ?? (await api.get(id)).latestVersion;
    const blocked = isBlocked(this.entries, id, target);
    if (blocked) throw new BundleVerificationError(`This version is blocked: ${blocked.reason}`);
    const release = await api.release(id, target);
    const bundle = await fetchVerifiedBundle(api, id, release, target, publicKey);
    const ok = await manager.install(bundle, {
      kind: 'marketplace',
      sha256: release.sha256,
      signature: release.signature,
    });
    if (ok) void api.reportInstall(id, target);
    return ok;
  }

  /**
   * Applies a signed blocklist: rejects bad signatures and anything older than the last one applied (no
   * rollback to a list that predates a block). Returns whether it was applied.
   */
  async applyBlocklist(list: SignedBlocklist): Promise<boolean> {
    if (this.issuedAt && Date.parse(list.issuedAt) < Date.parse(this.issuedAt)) return false;
    if (!(await verifyBlocklist(list, this.opts.publicKey))) return false;
    this.entries = list.entries;
    this.issuedAt = list.issuedAt;
    this.opts.manager.applyBlocklist(list.entries);
    try {
      this.opts.storage?.setItem(BLOCKLIST_CACHE_KEY, JSON.stringify(list));
    } catch {
      // Cache is an optimization for offline startups.
    }
    return true;
  }

  async checkBlocklist(): Promise<void> {
    try {
      await this.applyBlocklist(await this.opts.api.blocklist());
    } catch (error) {
      console.warn('[plugins] blocklist check failed:', error);
    }
  }

  /** Silent auto-update for marketplace plugins; updates asking for new permissions/hosts are held. */
  async checkUpdates(): Promise<void> {
    const { api, manager, publicKey } = this.opts;
    for (const view of manager.getSnapshot().plugins) {
      const installed = view.installed;
      if (installed.source.kind !== 'marketplace') continue;
      try {
        const detail = await api.get(installed.id);
        const latest = detail.latestVersion;
        if (compareVersions(latest, installed.version) <= 0 || installed.pendingUpdate?.version === latest) continue;
        if (isBlocked(this.entries, installed.id, latest)) continue;
        const release = await api.release(installed.id, latest);
        const bundle = await fetchVerifiedBundle(api, installed.id, release, latest, publicKey);
        await manager.applyUpdate(bundle, {
          kind: 'marketplace',
          sha256: release.sha256,
          signature: release.signature,
        });
      } catch (error) {
        console.warn(`[plugins] update check for ${installed.id} failed:`, error);
      }
    }
  }

  /** Once-per-UTC-day active ping per enabled marketplace plugin (developer dashboard). */
  pingActive(): void {
    const { api, manager } = this.opts;
    for (const { installed } of manager.getSnapshot().plugins) {
      if (installed.source.kind === 'marketplace' && installed.enabled && manager.takeActivePing(installed.id))
        void api.reportActive(installed.id, installed.version);
    }
  }

  /** Cached blocklist first (offline startups), then the network; repeats every 30 min. */
  async start(): Promise<void> {
    try {
      const cached = this.opts.storage?.getItem(BLOCKLIST_CACHE_KEY);
      if (cached) await this.applyBlocklist(JSON.parse(cached) as SignedBlocklist);
    } catch {
      // Ignore a corrupt cache; the network check below replaces it.
    }
    await this.checkBlocklist();
    void this.checkUpdates();
    this.pingActive();
    this.timers.push(
      setInterval(() => {
        void this.checkBlocklist();
        this.pingActive();
      }, BLOCKLIST_INTERVAL_MS),
      setInterval(() => void this.checkUpdates(), UPDATE_INTERVAL_MS),
    );
  }

  stop(): void {
    this.timers.splice(0).forEach(clearInterval);
  }
}
