import type {
  AccountProfile,
  CorePrice,
  GameMode,
  JsonValue,
  NetWorthSummary,
  NotifyParams,
  Permission,
  PluginManifest,
  RunePrice,
  ThemeInfo,
} from '@pd2-trader/plugin-sdk';

/** A plugin bundle (`pd2-plugin-bundle@1`): the manifest plus its text files, keyed by bundle path. */
export interface PluginBundle {
  format: 'pd2-plugin-bundle@1';
  manifest: PluginManifest;
  files: Record<string, string>;
}

export type PluginSource =
  | { kind: 'marketplace'; sha256: string; signature: string }
  /** Load unpacked: a dev server URL (browser dev mode) or a folder path (Tauri). Hot-reloaded. */
  | { kind: 'dev'; location: string; transport: 'url' | 'folder' };

/** A user-bound plugin hotkey, same shape as the core hotkeys (`hotkeyModifier*` + `hotkeyKey*`). */
export interface PluginHotkey {
  modifier: 'ctrl' | 'alt';
  key: string;
}

export type DisabledReason = 'user' | 'failures' | 'blocklisted' | 'incompatible' | 'invalid';

/** Persisted per installed plugin (ISettings.plugins.installed[id]). */
export interface InstalledPlugin {
  id: string;
  version: string;
  name: string;
  source: PluginSource;
  enabled: boolean;
  disabledReason?: DisabledReason;
  /** What the user consented to. The broker grants manifest ∩ granted. */
  granted: { permissions: Permission[]; network: string[] };
  /** A downloaded update that asks for more than `granted`; held until the user re-consents. */
  pendingUpdate?: { version: string; sha256: string; signature: string; permissions: Permission[]; network: string[] };
  settings: Record<string, string | number | boolean>;
  /** commandId → hotkey; null = unbound (absent = manifest default). */
  hotkeys: Record<string, PluginHotkey | null>;
  installedAt: string;
}

export interface PluginsSettings {
  installed: Record<string, InstalledPlugin>;
  /** UTC day (YYYY-MM-DD) of the last /active ping per plugin. */
  activePings?: Record<string, string>;
}

export const EMPTY_PLUGINS_SETTINGS: PluginsSettings = { installed: {} };

/** Host capabilities the broker proxies; implemented by the React bridge from app state. */
export interface HostServices {
  gameMode(): GameMode;
  runePrices(): Promise<RunePrice[]>;
  itemPrice(name: string): Promise<(CorePrice & { name: string }) | null>;
  netWorthSummary(): NetWorthSummary | null;
  accountProfile(): AccountProfile | null;
  notify(plugin: { id: string; name: string }, notification: NotifyParams): void;
  openPanel(panelId: string, payload?: JsonValue): void;
  /** The app's HTTP client (Tauri plugin-http / window.fetch). Only the fetch proxy calls it. */
  httpFetch(url: string, init: RequestInit & { maxRedirections?: number }): Promise<Response>;
  themeInfo(): ThemeInfo;
}

/** Durable plugin state: registry in the settings file, bundles and plugin KV in IndexedDB. */
export interface PluginPersistence {
  loadSettings(): Promise<PluginsSettings>;
  saveSettings(settings: PluginsSettings): Promise<void>;
  readBundle(key: string): Promise<PluginBundle | null>;
  writeBundle(key: string, bundle: PluginBundle): Promise<void>;
  deleteBundles(id: string): Promise<void>;
  readKv(id: string): Promise<Record<string, JsonValue>>;
  writeKv(id: string, data: Record<string, JsonValue>): Promise<void>;
}
