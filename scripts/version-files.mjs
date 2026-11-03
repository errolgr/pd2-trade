/**
 * The app version lives in six files; a release bumps all of them (scripts/release.mjs) and
 * verify-updater.mjs fails when they disagree. Each entry reads and rewrites only the app's own
 * version, never a dependency's (Cargo.lock lists crates that share version numbers with the app).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

/** `pattern` must capture (prefix)(version)(suffix); `count` occurrences are rewritten. */
function textVersion(pattern, count = 1) {
  return {
    read: (text) => pattern.exec(text)?.[2],
    write: (text, version) => {
      let left = count;
      const global = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`);
      const next = text.replace(global, (match, prefix, _old, suffix) => (left-- > 0 ? `${prefix}${version}${suffix}` : match));
      if (left > 0) throw new Error(`expected ${count} version occurrence(s), found ${count - left}`);
      return next;
    },
  };
}

export const VERSION_FILES = {
  // The top-level "version" is the first one in each file
  'package.json': textVersion(/^(\s*"version":\s*")([^"]+)(")/m),
  // The root and packages[""] entries
  'package-lock.json': textVersion(/^(\s*"version":\s*")([^"]+)(")/m, 2),
  'src-tauri/tauri.conf.json': textVersion(/^(\s*"version":\s*")([^"]+)(")/m),
  'src-tauri/Cargo.toml': textVersion(/^(\[package\][^[]*?^version\s*=\s*")([^"]+)(")/m),
  'src-tauri/Cargo.lock': {
    read: (text, root) => lockPattern(root).exec(text)?.[2],
    write: (text, version, root) => textVersion(lockPattern(root)).write(text, version),
  },
  'docs/.vitepress/config.js': textVersion(/^(\s*appVersion:\s*')([^']+)(')/m),
};

function lockPattern(root) {
  const cargoToml = readFileSync(path.join(root, 'src-tauri/Cargo.toml'), 'utf8');
  // The [package] name, whose Cargo.lock entry carries the app version
  const name = /^\[package\][^[]*?^name\s*=\s*"([^"]+)"/m.exec(cargoToml)?.[1];
  if (!name) throw new Error('src-tauri/Cargo.toml has no [package] name');
  return new RegExp(`(\\[\\[package\\]\\]\\r?\\nname = "${name}"\\r?\\nversion = ")([^"]+)(")`);
}

/** The app version each file declares (undefined where it can't be found). */
export function readVersions(root) {
  return Object.fromEntries(
    Object.entries(VERSION_FILES).map(([file, { read }]) => [file, read(readFileSync(path.join(root, file), 'utf8'), root)]),
  );
}

/** Rewrites the app version in every version file. */
export function writeVersion(root, version) {
  for (const [file, { write }] of Object.entries(VERSION_FILES)) {
    const full = path.join(root, file);
    writeFileSync(full, write(readFileSync(full, 'utf8'), version, root));
  }
}
