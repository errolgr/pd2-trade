/** Shared by sync-shared-packages.mjs and check-vendor.mjs: the vendor layout and its file hashes. */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

export const ROOT = join(import.meta.dirname, '..');
export const VENDOR_DIR = join(ROOT, 'vendor');
export const MANIFEST_PATH = join(VENDOR_DIR, 'MANIFEST.json');
export const SERVER_REPO = 'errolgr/pd2-trader-server';
/** Server package dir → vendored package dir (both relative). Only what the overlay builds and runs against. */
export const PACKAGES = {
  'packages/ui': '@pd2-trader/ui',
  'packages/plugin-sdk': '@pd2-trader/plugin-sdk',
};
export const EDIT_HINT = 'Shared packages are vendored: edit in pd2-trader-server, then npm run sync:shared';

export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

/** Every file under each vendored package (node_modules excluded: npm may nest installs there), sorted. */
export function vendoredFiles() {
  const out = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      if (name === 'node_modules') continue;
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else out.push(relative(VENDOR_DIR, full).split(sep).join('/'));
    }
  };
  for (const pkg of Object.values(PACKAGES)) {
    const dir = join(VENDOR_DIR, pkg);
    if (existsSync(dir)) walk(dir);
  }
  return out.sort();
}

export const hashFile = (path) => sha256(readFileSync(join(VENDOR_DIR, path)));
