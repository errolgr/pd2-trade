import {
  parseManifest,
  resolveSettings,
  satisfies,
  SDK_VERSION,
  SLOT_PERMISSIONS,
  type CallableSlotId,
  type EventMap,
  type EventName,
  type JsonValue,
  type Permission,
  type PluginManifest,
  type SlotInput,
  type SlotOutput,
} from '@pd2-trader/plugin-sdk';
import { PluginBroker, PluginKv } from './broker';
import { FailureTracker, type FailureKind } from './budget';
import { PluginInstance, type PortLike } from './instance';
import { launchWorkerSandbox } from './sandbox';
import {
  EMPTY_PLUGINS_SETTINGS,
  type DisabledReason,
  type HostServices,
  type InstalledPlugin,
  type PluginBundle,
  type PluginHotkey,
  type PluginPersistence,
  type PluginSource,
  type PluginsSettings,
} from './types';

/**
 * Plugin manager: the registry of installed plugins (persisted in the settings file), their sandboxes, consent,
 * budgets and auto-disable, slot/event/command dispatch for the core surfaces, and plugin panels/themes.
 * A singleton (`pluginHost`) read by React through `usePluginHost()` (useSyncExternalStore).
 */

export type PluginStatus = 'stopped' | 'starting' | 'running' | 'error' | 'disabled';

export interface PluginView {
  installed: InstalledPlugin;
  manifest: PluginManifest | null;
  status: PluginStatus;
  error?: string;
  failures: number;
}

export interface ConsentRequest {
  id: number;
  kind: 'install' | 'update';
  manifest: PluginManifest;
  source: PluginSource;
  /** update: only what is new compared to the current grant. */
  added: { permissions: Permission[]; network: string[] };
}

export interface PluginPanelInfo {
  /** Overlay panel id `plugin:<pluginId>:<panel>`. */
  panelId: `plugin:${string}:${string}`;
  pluginId: string;
  panel: string;
  title: string;
}

export interface PluginThemeInfo {
  /** Theme id used in settings.themeId: `plugin:<pluginId>`. */
  id: `plugin:${string}`;
  pluginId: string;
  name: string;
  mode: 'dark' | 'light';
  description?: string;
  vars: Record<string, string>;
}

export interface PluginHostSnapshot {
  ready: boolean;
  plugins: PluginView[];
  consent: ConsentRequest | null;
  panels: PluginPanelInfo[];
  themes: PluginThemeInfo[];
}

export interface SlotCall<S extends CallableSlotId> {
  pluginId: string;
  pluginName: string;
  result: Promise<SlotOutput<S>>;
}

export interface SandboxLauncher {
  (opts: { pluginId: string; code: string; onCrash: (message: string) => void }): Promise<{
    port: PortLike;
    destroy(): void;
  }>;
}

export interface DevLoader {
  load(source: Extract<PluginSource, { kind: 'dev' }>): Promise<PluginBundle>;
  /** Calls onChange with a fresh bundle whenever the source changes; returns a stop function. */
  watch(source: Extract<PluginSource, { kind: 'dev' }>, onChange: (bundle: PluginBundle) => void): () => void;
}

export interface PluginTelemetry {
  error(id: string, version: string, kind: FailureKind | 'auto-disabled'): void;
}

export interface ManagerOptions {
  services: HostServices;
  persistence: PluginPersistence;
  devLoader?: DevLoader;
  launchSandbox?: SandboxLauncher;
  telemetry?: PluginTelemetry;
  /** Shown when a plugin is auto-disabled or blocked. */
  onAutoDisabled?(plugin: { id: string; name: string }, reason: DisabledReason): void;
  now?(): number;
}

export const pluginPanelId = (pluginId: string, panel: string) => `plugin:${pluginId}:${panel}` as const;
export const pluginThemeId = (pluginId: string) => `plugin:${pluginId}` as const;
export const bundleKey = (id: string, version: string) => `${id}@${version}`;

interface Runtime {
  manifest: PluginManifest | null;
  bundle: PluginBundle | null;
  status: PluginStatus;
  error?: string;
  instance?: PluginInstance;
  failures: FailureTracker;
  stopWatch?: () => void;
  panelPorts: Map<string, Set<(data: unknown) => void>>;
}

/** What `manifest` asks for beyond `granted`. */
export function missingGrants(
  manifest: Pick<PluginManifest, 'permissions' | 'network'>,
  granted: InstalledPlugin['granted'],
): ConsentRequest['added'] {
  return {
    permissions: manifest.permissions.filter((p) => !granted.permissions.includes(p)),
    network: manifest.network.filter((h) => !granted.network.includes(h)),
  };
}

export function parseBundle(value: unknown): PluginBundle {
  if (!value || typeof value !== 'object') throw new Error('Bundle is not an object');
  const raw = value as { format?: unknown; manifest?: unknown; files?: unknown };
  if (raw.format !== 'pd2-plugin-bundle@1') throw new Error('Unsupported bundle format');
  const parsed = parseManifest(raw.manifest);
  if (!parsed.manifest) throw new Error(`Invalid manifest: ${parsed.errors.join('; ')}`);
  const files = raw.files && typeof raw.files === 'object' ? (raw.files as Record<string, unknown>) : {};
  const out: Record<string, string> = {};
  for (const [path, content] of Object.entries(files)) if (typeof content === 'string') out[path] = content;
  const needed = [parsed.manifest.entry.worker, ...Object.values(parsed.manifest.entry.panels ?? {})].filter(
    (p): p is string => !!p,
  );
  for (const path of needed) if (!(path in out)) throw new Error(`Bundle is missing ${path}`);
  return { format: 'pd2-plugin-bundle@1', manifest: parsed.manifest, files: out };
}

export class PluginManager {
  private opts: ManagerOptions | null = null;
  private settings: PluginsSettings = EMPTY_PLUGINS_SETTINGS;
  private readonly runtimes = new Map<string, Runtime>();
  private readonly listeners = new Set<() => void>();
  private snapshot: PluginHostSnapshot = { ready: false, plugins: [], consent: null, panels: [], themes: [] };
  private consentQueue: Array<ConsentRequest & { resolve(ok: boolean): void }> = [];
  private consentSeq = 0;
  private saving: Promise<void> = Promise.resolve();

  // ---- store -----------------------------------------------------------------------------------------------

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => void this.listeners.delete(listener);
  };

  getSnapshot = (): PluginHostSnapshot => this.snapshot;

  private publish(): void {
    const plugins: PluginView[] = Object.values(this.settings.installed).map((installed) => {
      const rt = this.runtimes.get(installed.id);
      return {
        installed,
        manifest: rt?.manifest ?? null,
        status: installed.enabled ? (rt?.status ?? 'stopped') : 'disabled',
        error: rt?.error,
        failures: rt?.failures.count ?? 0,
      };
    });
    const panels: PluginPanelInfo[] = [];
    const themes: PluginThemeInfo[] = [];
    for (const view of plugins) {
      const m = view.manifest;
      if (!m || !view.installed.enabled) continue;
      for (const panel of Object.keys(m.entry.panels ?? {}))
        panels.push({ panelId: pluginPanelId(m.id, panel), pluginId: m.id, panel, title: m.name });
      if (m.theme)
        themes.push({
          id: pluginThemeId(m.id),
          pluginId: m.id,
          name: m.name,
          mode: m.theme.mode,
          description: m.theme.description,
          vars: m.theme.vars,
        });
    }
    const head = this.consentQueue[0];
    this.snapshot = {
      ready: !!this.opts,
      plugins,
      consent: head
        ? { id: head.id, kind: head.kind, manifest: head.manifest, source: head.source, added: head.added }
        : null,
      panels,
      themes,
    };
    this.listeners.forEach((fn) => fn());
  }

  private persist(): Promise<void> {
    const settings = this.settings;
    this.saving = this.saving
      .then(() => this.options.persistence.saveSettings(settings))
      .catch((error) => {
        console.warn('[plugins] saving plugin settings failed:', error);
      });
    return this.saving;
  }

  private update(id: string, patch: Partial<InstalledPlugin> | null): void {
    const installed = { ...this.settings.installed };
    if (patch === null) delete installed[id];
    else installed[id] = { ...installed[id], ...patch };
    this.settings = { ...this.settings, installed };
    void this.persist();
  }

  private get options(): ManagerOptions {
    if (!this.opts) throw new Error('Plugin host not started');
    return this.opts;
  }

  private now(): number {
    return (this.opts?.now ?? Date.now)();
  }

  private runtime(id: string): Runtime {
    let rt = this.runtimes.get(id);
    if (!rt) {
      rt = { manifest: null, bundle: null, status: 'stopped', failures: new FailureTracker(), panelPorts: new Map() };
      this.runtimes.set(id, rt);
    }
    return rt;
  }

  // ---- lifecycle -------------------------------------------------------------------------------------------

  /** Loads the registry and starts every enabled plugin. Safe to call again after `shutdown()`. */
  async start(opts: ManagerOptions): Promise<void> {
    this.opts = opts;
    this.settings = await opts.persistence.loadSettings();
    this.publish();
    await Promise.all(Object.values(this.settings.installed).map((p) => this.boot(p.id)));
  }

  shutdown(): void {
    for (const id of this.runtimes.keys()) this.stopRuntime(id);
    this.runtimes.clear();
    this.consentQueue.splice(0).forEach((c) => c.resolve(false));
    this.opts = null;
    this.publish();
  }

  /** Loads the plugin's bundle (stored or dev source) and starts it if enabled. */
  private async boot(id: string): Promise<void> {
    const installed = this.settings.installed[id];
    if (!installed) return;
    const rt = this.runtime(id);
    try {
      let bundle: PluginBundle | null;
      if (installed.source.kind === 'dev') {
        const dev = this.options.devLoader;
        if (!dev) throw new Error('Load unpacked is not available');
        bundle = await dev.load(installed.source);
        rt.stopWatch?.();
        rt.stopWatch = dev.watch(installed.source, (next) => void this.hotReload(id, next));
      } else {
        bundle = await this.options.persistence.readBundle(bundleKey(id, installed.version));
      }
      if (!bundle) throw new Error('Plugin files are missing; reinstall it');
      rt.bundle = bundle;
      rt.manifest = bundle.manifest;
      if (!satisfies(SDK_VERSION, bundle.manifest.sdk)) {
        rt.status = 'error';
        rt.error = `Needs SDK ${bundle.manifest.sdk}; this app has ${SDK_VERSION}`;
        this.update(id, { enabled: false, disabledReason: 'incompatible' });
        this.publish();
        return;
      }
      if (installed.enabled) await this.startRuntime(id);
      else this.publish();
    } catch (error) {
      rt.status = 'error';
      rt.error = error instanceof Error ? error.message : String(error);
      this.publish();
    }
  }

  private async startRuntime(id: string): Promise<void> {
    const installed = this.settings.installed[id];
    const rt = this.runtime(id);
    const bundle = rt.bundle;
    if (!installed || !bundle) return;
    this.stopInstance(rt);
    const manifest = bundle.manifest;
    rt.error = undefined;
    if (!manifest.entry.worker) {
      // Theme-only / panel-only plugin: nothing to run in a worker.
      rt.status = 'running';
      this.publish();
      return;
    }
    rt.status = 'starting';
    this.publish();
    let instance: PluginInstance | undefined;
    try {
      const launch = this.options.launchSandbox ?? launchWorkerSandbox;
      const sandbox = await launch({
        pluginId: id,
        code: bundle.files[manifest.entry.worker],
        onCrash: (message) => instance?.crashed(message),
      });
      const broker = new PluginBroker({
        manifest,
        granted: installed.granted,
        services: this.options.services,
        kv: new PluginKv(id, this.options.persistence),
        settings: () => this.settingsFor(id),
        openPanel: (panel, payload) => this.options.services.openPanel(pluginPanelId(id, panel), payload),
        postToPanel: (panel, data) => rt.panelPorts.get(panel)?.forEach((fn) => fn(data)),
        now: () => this.now(),
      });
      instance = new PluginInstance({
        manifest,
        port: sandbox.port,
        broker,
        settings: () => this.settingsFor(id),
        destroy: sandbox.destroy,
        onFailure: (kind, detail) => this.recordFailure(id, kind, detail),
        onDead: (reason) => {
          if (rt.instance !== instance) return;
          rt.instance = undefined;
          if (rt.status === 'running') {
            rt.status = 'error';
            rt.error = reason;
            this.publish();
          }
        },
        onPanelMessage: () => {},
      });
      rt.instance = instance;
      await instance.start();
      if (rt.instance !== instance) return;
      rt.status = 'running';
      this.publish();
    } catch (error) {
      if (instance && rt.instance === instance) {
        instance.stop();
        rt.instance = undefined;
      }
      rt.status = 'error';
      rt.error = error instanceof Error ? error.message : String(error);
      this.publish();
    }
  }

  private stopInstance(rt: Runtime): void {
    const instance = rt.instance;
    rt.instance = undefined;
    instance?.stop();
  }

  private stopRuntime(id: string): void {
    const rt = this.runtimes.get(id);
    if (!rt) return;
    this.stopInstance(rt);
    rt.stopWatch?.();
    rt.stopWatch = undefined;
    rt.status = 'stopped';
  }

  private async hotReload(id: string, bundle: PluginBundle): Promise<void> {
    const installed = this.settings.installed[id];
    if (!installed || bundle.manifest.id !== id) return;
    const added = missingGrants(bundle.manifest, installed.granted);
    if (added.permissions.length || added.network.length) {
      const ok = await this.requestConsent('update', bundle.manifest, installed.source, added);
      if (!ok) return;
      this.update(id, { granted: mergeGrants(installed.granted, bundle.manifest) });
    }
    const rt = this.runtime(id);
    rt.bundle = bundle;
    rt.manifest = bundle.manifest;
    rt.failures.reset();
    this.update(id, { version: bundle.manifest.version, name: bundle.manifest.name });
    if (this.settings.installed[id].enabled) await this.startRuntime(id);
    else this.publish();
  }

  private settingsFor(id: string): Record<string, string | number | boolean> {
    return resolveSettings(this.runtimes.get(id)?.manifest?.settings, this.settings.installed[id]?.settings);
  }

  // ---- budgets ---------------------------------------------------------------------------------------------

  private recordFailure(id: string, kind: FailureKind, detail: string): void {
    const rt = this.runtimes.get(id);
    const installed = this.settings.installed[id];
    if (!rt || !installed) return;
    rt.error = detail;
    const version = installed.version;
    if (installed.source.kind === 'marketplace') this.options.telemetry?.error(id, version, kind);
    if (rt.failures.record(this.now())) {
      this.disable(id, 'failures');
      if (installed.source.kind === 'marketplace') this.options.telemetry?.error(id, version, 'auto-disabled');
    } else {
      this.publish();
    }
  }

  private disable(id: string, reason: DisabledReason): void {
    const installed = this.settings.installed[id];
    if (!installed) return;
    this.stopInstance(this.runtime(id));
    this.runtime(id).status = 'disabled';
    this.update(id, { enabled: false, disabledReason: reason });
    this.publish();
    if (reason !== 'user') this.opts?.onAutoDisabled?.({ id, name: installed.name }, reason);
  }

  // ---- consent ---------------------------------------------------------------------------------------------

  private requestConsent(
    kind: ConsentRequest['kind'],
    manifest: PluginManifest,
    source: PluginSource,
    added: ConsentRequest['added'],
  ): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.consentQueue.push({ id: ++this.consentSeq, kind, manifest, source, added, resolve });
      this.publish();
    });
  }

  /** The consent sheet's Allow / Cancel. */
  answerConsent(id: number, allow: boolean): void {
    const index = this.consentQueue.findIndex((c) => c.id === id);
    if (index < 0) return;
    const [request] = this.consentQueue.splice(index, 1);
    request.resolve(allow);
    this.publish();
  }

  // ---- install / update / remove ----------------------------------------------------------------------------

  /**
   * Installs (or reinstalls) a verified bundle after the user consents to its permissions and network hosts.
   * Resolves false when the user cancels.
   */
  async install(bundle: PluginBundle, source: PluginSource): Promise<boolean> {
    const manifest = bundle.manifest;
    if (!satisfies(SDK_VERSION, manifest.sdk))
      throw new Error(`${manifest.name} needs SDK ${manifest.sdk}; this app has ${SDK_VERSION}`);
    const ok = await this.requestConsent('install', manifest, source, {
      permissions: manifest.permissions,
      network: manifest.network,
    });
    if (!ok) return false;
    const id = manifest.id;
    const previous = this.settings.installed[id];
    if (source.kind === 'marketplace')
      await this.options.persistence.writeBundle(bundleKey(id, manifest.version), bundle);
    this.stopRuntime(id);
    this.update(id, {
      id,
      version: manifest.version,
      name: manifest.name,
      source,
      enabled: true,
      disabledReason: undefined,
      granted: { permissions: [...manifest.permissions], network: [...manifest.network] },
      pendingUpdate: undefined,
      settings: previous?.settings ?? {},
      hotkeys: previous?.hotkeys ?? {},
      installedAt: previous?.installedAt ?? new Date(this.now()).toISOString(),
    });
    const rt = this.runtime(id);
    rt.failures.reset();
    await this.boot(id);
    return true;
  }

  /**
   * Applies a verified marketplace update: silent when it asks for nothing new, otherwise held as
   * `pendingUpdate` until the user re-consents (`approveUpdate`).
   */
  async applyUpdate(
    bundle: PluginBundle,
    source: Extract<PluginSource, { kind: 'marketplace' }>,
  ): Promise<'updated' | 'held'> {
    const id = bundle.manifest.id;
    const installed = this.settings.installed[id];
    if (!installed) throw new Error(`${id} is not installed`);
    await this.options.persistence.writeBundle(bundleKey(id, bundle.manifest.version), bundle);
    const added = missingGrants(bundle.manifest, installed.granted);
    if (added.permissions.length || added.network.length) {
      this.update(id, {
        pendingUpdate: {
          version: bundle.manifest.version,
          sha256: source.sha256,
          signature: source.signature,
          permissions: [...bundle.manifest.permissions],
          network: [...bundle.manifest.network],
        },
      });
      this.publish();
      return 'held';
    }
    this.stopRuntime(id);
    this.update(id, {
      version: bundle.manifest.version,
      name: bundle.manifest.name,
      source,
      pendingUpdate: undefined,
      // Narrowed grants follow the manifest: a removed permission is not kept for a later re-add.
      granted: {
        permissions: installed.granted.permissions.filter((p) => bundle.manifest.permissions.includes(p)),
        network: installed.granted.network.filter((h) => bundle.manifest.network.includes(h)),
      },
    });
    await this.boot(id);
    return 'updated';
  }

  /** Re-consent for a held update. */
  async approveUpdate(id: string): Promise<boolean> {
    const installed = this.settings.installed[id];
    const pending = installed?.pendingUpdate;
    if (!installed || !pending) return false;
    const bundle = await this.options.persistence.readBundle(bundleKey(id, pending.version));
    if (!bundle) throw new Error('Update files are missing');
    const source: PluginSource = { kind: 'marketplace', sha256: pending.sha256, signature: pending.signature };
    const ok = await this.requestConsent(
      'update',
      bundle.manifest,
      source,
      missingGrants(bundle.manifest, installed.granted),
    );
    if (!ok) return false;
    this.stopRuntime(id);
    this.update(id, {
      version: pending.version,
      name: bundle.manifest.name,
      source,
      pendingUpdate: undefined,
      granted: { permissions: [...bundle.manifest.permissions], network: [...bundle.manifest.network] },
    });
    await this.boot(id);
    return true;
  }

  async setEnabled(id: string, enabled: boolean): Promise<void> {
    const installed = this.settings.installed[id];
    if (!installed) return;
    if (!enabled) return this.disable(id, 'user');
    if (installed.disabledReason === 'blocklisted') return;
    this.runtime(id).failures.reset();
    this.update(id, { enabled: true, disabledReason: undefined });
    await this.boot(id);
  }

  async uninstall(id: string): Promise<void> {
    this.stopRuntime(id);
    this.runtimes.delete(id);
    this.update(id, null);
    this.publish();
    await this.options.persistence.deleteBundles(id);
  }

  /**
   * Remote kill switch: disables every installed version listed (versions '*' = all); a plugin that was
   * disabled only by the blocklist comes back when it is no longer listed.
   */
  applyBlocklist(entries: Array<{ id: string; versions: '*' | string[]; reason: string }>): void {
    for (const installed of Object.values(this.settings.installed)) {
      const blocked = entries.some(
        (e) => e.id === installed.id && (e.versions === '*' || e.versions.includes(installed.version)),
      );
      if (blocked && installed.disabledReason !== 'blocklisted') this.disable(installed.id, 'blocklisted');
      else if (!blocked && installed.disabledReason === 'blocklisted') {
        this.update(installed.id, { enabled: true, disabledReason: undefined });
        void this.boot(installed.id);
      }
    }
  }

  setPluginSettings(id: string, values: Record<string, unknown>): void {
    const rt = this.runtimes.get(id);
    if (!this.settings.installed[id]) return;
    const resolved = resolveSettings(rt?.manifest?.settings, values);
    this.update(id, { settings: resolved });
    rt?.instance?.sendSettings(resolved);
    this.publish();
  }

  pluginSettings(id: string): Record<string, string | number | boolean> {
    return this.settingsFor(id);
  }

  setHotkey(id: string, commandId: string, hotkey: PluginHotkey | null): void {
    const installed = this.settings.installed[id];
    if (!installed) return;
    this.update(id, { hotkeys: { ...installed.hotkeys, [commandId]: hotkey } });
    this.publish();
  }

  /** Effective hotkey: user binding, else the manifest default (`ctrl+k` / `alt+k`), else unbound. */
  hotkeyFor(id: string, commandId: string): PluginHotkey | null {
    const installed = this.settings.installed[id];
    if (installed && commandId in installed.hotkeys) return installed.hotkeys[commandId];
    const def = this.runtimes.get(id)?.manifest?.commands.find((c) => c.id === commandId)?.defaultHotkey;
    const m = def ? /^(ctrl|alt)\+(.+)$/i.exec(def) : null;
    return m ? { modifier: m[1].toLowerCase() as 'ctrl' | 'alt', key: m[2] } : null;
  }

  /** Marks the plugin as pinged today; true when a ping is due (once per UTC day per plugin). */
  takeActivePing(id: string): boolean {
    const day = new Date(this.now()).toISOString().slice(0, 10);
    if (this.settings.activePings?.[id] === day) return false;
    this.settings = { ...this.settings, activePings: { ...this.settings.activePings, [id]: day } };
    void this.persist();
    return true;
  }

  // ---- dispatch for core surfaces ---------------------------------------------------------------------------

  /**
   * Calls `slot` on every running plugin that declares it and holds its permission. Each result resolves or
   * rejects independently (timeout / error / invalid UI): surfaces render each as it settles.
   */
  callSlot<S extends CallableSlotId>(slot: S, input: SlotInput<S>): SlotCall<S>[] {
    const calls: SlotCall<S>[] = [];
    const needed = SLOT_PERMISSIONS[slot];
    for (const [id, rt] of this.runtimes) {
      const installed = this.settings.installed[id];
      const instance = rt.instance;
      if (!installed?.enabled || rt.status !== 'running' || !instance || !rt.manifest?.slots.includes(slot)) continue;
      const holds = (p: Permission) =>
        rt.manifest!.permissions.includes(p) && installed.granted.permissions.includes(p);
      if (needed && !holds(needed)) continue;
      // ticker.widget input carries the stash summary only for plugins granted stash:read.
      const pluginInput =
        slot === 'ticker.widget' && !holds('stash:read')
          ? { ...(input as SlotInput<'ticker.widget'>), netWorth: null }
          : input;
      calls.push({ pluginId: id, pluginName: installed.name, result: instance.invokeSlot(slot, pluginInput) });
    }
    return calls;
  }

  /** True when any running plugin implements `slot` (lets surfaces skip building inputs). */
  hasSlot(slot: CallableSlotId): boolean {
    for (const [id, rt] of this.runtimes)
      if (rt.status === 'running' && this.settings.installed[id]?.enabled && rt.manifest?.slots.includes(slot))
        return true;
    return false;
  }

  emit<E extends EventName>(name: E, payload: EventMap[E]): void {
    for (const rt of this.runtimes.values()) if (rt.status === 'running') rt.instance?.emit(name, payload);
  }

  async runCommand(id: string, commandId: string, args?: JsonValue): Promise<void> {
    const instance = this.runtimes.get(id)?.instance;
    if (!instance) throw new Error('Plugin is not running');
    await instance.runCommand(commandId, args);
  }

  /** Every command of every running plugin (palette + hotkeys). */
  commands(): Array<{ pluginId: string; pluginName: string; id: string; title: string; hotkey: PluginHotkey | null }> {
    const out: Array<{ pluginId: string; pluginName: string; id: string; title: string; hotkey: PluginHotkey | null }> =
      [];
    for (const [id, rt] of this.runtimes) {
      const installed = this.settings.installed[id];
      if (!installed?.enabled || !rt.manifest) continue;
      for (const command of rt.manifest.commands)
        out.push({
          pluginId: id,
          pluginName: installed.name,
          id: command.id,
          title: command.title,
          hotkey: this.hotkeyFor(id, command.id),
        });
    }
    return out;
  }

  // ---- panels ----------------------------------------------------------------------------------------------

  /** Panel HTML for a plugin panel, or null when the plugin or panel is gone. */
  panelHtml(pluginId: string, panel: string): string | null {
    const rt = this.runtimes.get(pluginId);
    const path = rt?.manifest?.entry.panels?.[panel];
    return path && rt?.bundle ? (rt.bundle.files[path] ?? null) : null;
  }

  /**
   * Connects an open panel frame: broker calls run with the plugin's grants, `toWorker` messages reach the
   * worker (`sdk.panels.onMessage`), and `sdk.panels.post` reaches `onWorkerMessage`.
   */
  connectPanel(
    pluginId: string,
    panel: string,
    onWorkerMessage: (data: unknown) => void,
  ): {
    call(method: string, params: unknown): Promise<unknown>;
    toWorker(data: unknown): void;
    disconnect(): void;
  } | null {
    const rt = this.runtimes.get(pluginId);
    const installed = this.settings.installed[pluginId];
    const manifest = rt?.manifest;
    if (!rt || !installed?.enabled || !manifest?.entry.panels?.[panel]) return null;
    let set = rt.panelPorts.get(panel);
    if (!set) rt.panelPorts.set(panel, (set = new Set()));
    set.add(onWorkerMessage);
    const broker = new PluginBroker({
      manifest,
      granted: installed.granted,
      services: this.options.services,
      kv: new PluginKv(pluginId, this.options.persistence),
      settings: () => this.settingsFor(pluginId),
      openPanel: (p, payload) => this.options.services.openPanel(pluginPanelId(pluginId, p), payload),
      postToPanel: (p, data) => rt.panelPorts.get(p)?.forEach((fn) => fn(data)),
      now: () => this.now(),
    });
    return {
      call: (method, params) => broker.handle(method, params),
      toWorker: (data) => rt.instance?.sendPanelMessage(panel, data),
      disconnect: () => void set.delete(onWorkerMessage),
    };
  }
}

function mergeGrants(granted: InstalledPlugin['granted'], manifest: PluginManifest): InstalledPlugin['granted'] {
  return {
    permissions: [...new Set([...granted.permissions, ...manifest.permissions])],
    network: [...new Set([...granted.network, ...manifest.network])],
  };
}

export const pluginHost = new PluginManager();
