// The app manifest (src-tauri/build.rs) makes Tauri's runtime ACL check app commands, failing closed: a command
// registered in `generate_handler!` but missing from the manifest or from Main's grant is denied at runtime, and only
// a Rust build (not run in CI's test job) would notice. These checks read the sources so drift fails `npm test`.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const TAURI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src-tauri');
const read = (file) => readFileSync(path.join(TAURI, file), 'utf8');

/** Command names in `tauri::generate_handler![...]`: the last path segment of each entry. */
function registeredCommands() {
  const body = read('src/lib.rs').match(/generate_handler!\[([\s\S]*?)\]/)?.[1];
  if (!body) throw new Error('generate_handler! not found in src-tauri/src/lib.rs');
  return body
    .split(',')
    .map((entry) => entry.trim().split('::').pop())
    .filter(Boolean);
}

function manifestCommands() {
  const body = read('build.rs').match(/const APP_COMMANDS: &\[&str\] = &\[([\s\S]*?)\];/)?.[1];
  if (!body) throw new Error('APP_COMMANDS not found in src-tauri/build.rs');
  return [...body.matchAll(/"([a-z0-9_]+)"/g)].map((m) => m[1]);
}

function mainWindowGrants() {
  const body = read('permissions/main-window.toml').match(/permissions = \[([\s\S]*?)\]/)?.[1];
  if (!body) throw new Error('main-window set not found in src-tauri/permissions/main-window.toml');
  return [...body.matchAll(/"([a-z0-9-]+)"/g)].map((m) => m[1]);
}

const capability = (name) => JSON.parse(read(`capabilities/${name}.json`));
const sorted = (list) => [...list].sort();

describe('Tauri app ACL', () => {
  it('lists every registered command in the app manifest, and nothing else', () => {
    expect(sorted(manifestCommands())).toEqual(sorted(registeredCommands()));
  });

  it('grants Main an allow permission for every app command', () => {
    const expected = registeredCommands().map((command) => `allow-${command.replaceAll('_', '-')}`);
    expect(sorted(mainWindowGrants())).toEqual(sorted(expected));
    expect(capability('default').permissions).toContain('main-window');
  });

  it('keeps every capability local and bound to a named window', () => {
    for (const name of ['default', 'sign-in']) {
      const cap = capability(name);
      expect(cap.local, name).toBe(true);
      expect(cap.remote, name).toBeUndefined();
      expect(cap.windows.length, name).toBeGreaterThan(0);
      expect(cap.windows, name).not.toContain('*');
    }
    expect(capability('sign-in').permissions).not.toContain('main-window');
  });
});
