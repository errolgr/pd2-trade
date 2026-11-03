import { isTauri } from '@tauri-apps/api/core';
import { BaseDirectory, readTextFile } from '@tauri-apps/plugin-fs';
import { parseManifest } from '@pd2-trader/plugin-sdk';
import type { DevLoader } from '../host/manager';
import { parseBundle } from '../host/manager';
import type { PluginBundle, PluginSource } from '../host/types';

/**
 * Load unpacked (PRD C2.2): a plugin's build output (`manifest.json` + the files its entry points name), from
 * a dev server URL (browser dev mode; `pd2-plugin dev` serves one with CORS) or, in Tauri, a folder inside the
 * app config directory (the fs scope; `pd2-plugin dev --outdir` writes there). Hot reload polls the source
 * and reloads the plugin when any file changes.
 */

export const HOT_RELOAD_INTERVAL_MS = 1000;

type DevSource = Extract<PluginSource, { kind: 'dev' }>;

async function readFrom(source: DevSource, path: string): Promise<string> {
  if (source.transport === 'url') {
    const base = source.location.endsWith('/') ? source.location : `${source.location}/`;
    const response = await window.fetch(new URL(path, base).toString(), { cache: 'no-store', credentials: 'omit' });
    if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
    return response.text();
  }
  if (!isTauri()) throw new Error('Folders can only be loaded in the desktop app; use a dev server URL');
  const folder = source.location.replace(/[\\/]+$/, '');
  return readTextFile(`${folder}/${path}`, { baseDir: BaseDirectory.AppConfig });
}

export async function loadUnpacked(source: DevSource): Promise<PluginBundle> {
  let raw: unknown;
  try {
    raw = JSON.parse(await readFrom(source, 'manifest.json'));
  } catch (error) {
    throw new Error(`Could not read manifest.json: ${error instanceof Error ? error.message : String(error)}`);
  }
  const { manifest, errors } = parseManifest(raw);
  if (!manifest) throw new Error(`Invalid manifest: ${errors.join('; ')}`);
  const paths = [manifest.entry.worker, ...Object.values(manifest.entry.panels ?? {})].filter(
    (p): p is string => !!p,
  );
  const files: Record<string, string> = {};
  for (const path of paths) files[path] = await readFrom(source, path);
  return parseBundle({ format: 'pd2-plugin-bundle@1', manifest, files });
}

const fingerprint = (bundle: PluginBundle) => JSON.stringify([bundle.manifest, bundle.files]);

export const devLoader: DevLoader = {
  load: loadUnpacked,
  watch(source, onChange) {
    let last: string | null = null;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      try {
        const bundle = await loadUnpacked(source);
        const print = fingerprint(bundle);
        if (last !== null && print !== last && !stopped) onChange(bundle);
        last = print;
      } catch {
        // Mid-rebuild or server down: keep the running version and try again.
      }
      if (!stopped) timer = setTimeout(tick, HOT_RELOAD_INTERVAL_MS);
    };
    timer = setTimeout(tick, HOT_RELOAD_INTERVAL_MS);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  },
};
