#!/usr/bin/env node
/** Builds every first-party plugin in packages/plugins/* with the pd2-plugin build (→ <plugin>/dist). */
import { existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { buildPlugin, PluginBuildError, SOURCE_MANIFEST, writeOutput } from '../packages/plugin-sdk/bin/build.mjs';

const root = resolve(import.meta.dirname, '../packages/plugins');
let failed = 0;
for (const entry of await readdir(root, { withFileTypes: true })) {
  const dir = join(root, entry.name);
  if (!entry.isDirectory() || !existsSync(join(dir, SOURCE_MANIFEST))) continue;
  try {
    const { manifest, files } = await buildPlugin(dir);
    await writeOutput(join(dir, 'dist'), files);
    console.log(`✓ ${manifest.id}@${manifest.version} → packages/plugins/${entry.name}/dist`);
  } catch (error) {
    failed++;
    console.error(`✗ ${entry.name}: ${error instanceof PluginBuildError ? error.message : error}`);
  }
}
process.exit(failed ? 1 : 0);
