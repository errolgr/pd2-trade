#!/usr/bin/env node

import { chmodSync, copyFileSync, existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoPluginPath = resolve(scriptDir, "linuxdeploy-plugin-gtk.sh");
const tauriCacheDir = resolve(homedir(), ".cache", "tauri");
const pluginPath = resolve(tauriCacheDir, "linuxdeploy-plugin-gtk.sh");

if (!existsSync(repoPluginPath)) {
  console.error(`[ERROR] repo plugin script not found: ${repoPluginPath}`);
  process.exit(1);
}

mkdirSync(tauriCacheDir, { recursive: true });
copyFileSync(repoPluginPath, pluginPath);
chmodSync(pluginPath, 0o755);
console.log(`[INFO] Prepared linuxdeploy GTK plugin in Tauri cache: ${pluginPath}`);
