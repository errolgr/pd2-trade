// Proves the release verifier rejects what the Tauri updater would reject, using real `tauri signer`
// output, so a verifier that silently passes everything can't hide a broken release.
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { REQUIRED_PLATFORMS, checkConfig, checkManifest, compareVersions, verifySignature } from './verify-updater.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Run the CLI's JS entry with node: Windows refuses to spawn node_modules/.bin/tauri.cmd without a
// shell (EINVAL), and a shell would split the artifact path on its spaces.
const TAURI_CLI = path.join(ROOT, 'node_modules', '@tauri-apps', 'cli', 'tauri.js');
// Throwaway keys; the CLI can't sign with an empty-password key it generated itself.
const KEY_PASSWORD = 'verify-updater-test';

let dir;
const keys = {};

function generateKey(name) {
  const keyPath = path.join(dir, `${name}.key`);
  execFileSync(process.execPath, [TAURI_CLI, 'signer', 'generate', '--ci', '-p', KEY_PASSWORD, '-w', keyPath], { stdio: 'pipe' });
  return { keyPath, pubkey: readFileSync(`${keyPath}.pub`, 'utf8').trim() };
}

function sign(keyName, filePath) {
  // The CLI rejects -f when a signing key is also set in the environment (e.g. on a release runner).
  const env = { ...process.env };
  for (const name of ['TAURI_SIGNING_PRIVATE_KEY', 'TAURI_PRIVATE_KEY', 'TAURI_PRIVATE_KEY_PATH']) delete env[name];
  execFileSync(process.execPath, [TAURI_CLI, 'signer', 'sign', '-f', keys[keyName].keyPath, '-p', KEY_PASSWORD, filePath], {
    stdio: 'pipe',
    env,
  });
  return readFileSync(`${filePath}.sig`, 'utf8').trim();
}

beforeAll(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'verify-updater-'));
  keys.release = generateKey('release');
  keys.other = generateKey('other');
}, 60_000);

afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe('verifySignature', () => {
  const artifact = () => {
    const filePath = path.join(dir, 'PD2 Trader_1.0.0_x64-setup.exe');
    writeFileSync(filePath, Buffer.from('installer bytes '.repeat(4096)));
    return filePath;
  };

  it('accepts an artifact signed by the trusted key', () => {
    const filePath = artifact();
    const signature = sign('release', filePath);
    expect(() => verifySignature(keys.release.pubkey, signature, readFileSync(filePath))).not.toThrow();
  });

  it('rejects an artifact whose bytes changed after signing', () => {
    const filePath = artifact();
    const signature = sign('release', filePath);
    const tampered = Buffer.from(readFileSync(filePath));
    tampered[100] ^= 1;
    expect(() => verifySignature(keys.release.pubkey, signature, tampered)).toThrow(/does not match/);
  });

  it('rejects an artifact signed by a different key than installed builds trust', () => {
    const filePath = artifact();
    const signature = sign('other', filePath);
    expect(() => verifySignature(keys.release.pubkey, signature, readFileSync(filePath))).toThrow(/trust key/);
  });

  it('rejects a signature whose trusted comment was edited', () => {
    const filePath = artifact();
    const lines = Buffer.from(sign('release', filePath), 'base64').toString('utf8').split('\n');
    lines[2] = lines[2].replace('file:', 'file:evil-');
    const edited = Buffer.from(lines.join('\n')).toString('base64');
    expect(() => verifySignature(keys.release.pubkey, edited, readFileSync(filePath))).toThrow(/Trusted comment/);
  });
});

describe('checkManifest', () => {
  const manifest = (overrides = {}) => ({
    version: '1.2.3',
    platforms: Object.fromEntries(
      REQUIRED_PLATFORMS.map((name) => [name, { url: `https://example.com/${name}`, signature: 'c2ln' }]),
    ),
    ...overrides,
  });

  it('rejects a manifest missing a built platform', () => {
    const { platforms } = manifest();
    delete platforms['windows-x86_64'];
    expect(() => checkManifest(manifest({ platforms }))).toThrow(/missing platform windows-x86_64/);
  });

  it('rejects a manifest for a different version than the release', () => {
    expect(() => checkManifest(manifest(), { expectVersion: '1.2.4' })).toThrow(/expected 1.2.4/);
  });
});

describe('compareVersions', () => {
  it('compares numerically, not lexically', () => {
    expect(compareVersions('0.10.0', '0.9.13')).toBeGreaterThan(0);
    expect(compareVersions('0.9.13', '0.9.13')).toBe(0);
  });
});

describe('checkConfig', () => {
  const copyRepoConfig = () => {
    const root = mkdtempSync(path.join(dir, 'repo-'));
    for (const file of ['package.json', 'package-lock.json', 'src-tauri/tauri.conf.json', 'src-tauri/Cargo.toml',
      'src-tauri/Cargo.lock', 'docs/.vitepress/config.js', 'src-tauri/capabilities/default.json', 'src-tauri/src/lib.rs']) {
      mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
      cpSync(path.join(ROOT, file), path.join(root, file));
    }
    return root;
  };
  const editJson = (root, file, edit) => {
    const json = JSON.parse(readFileSync(path.join(root, file), 'utf8'));
    edit(json);
    writeFileSync(path.join(root, file), JSON.stringify(json));
  };

  it('passes for the committed repo config', () => {
    expect(() => checkConfig()).not.toThrow();
  });

  it('fails when only some version files were bumped', () => {
    const root = copyRepoConfig();
    editJson(root, 'package.json', (pkg) => {
      pkg.version = '99.0.0';
    });
    expect(() => checkConfig(root)).toThrow(/Version files disagree/);
  });

  it('fails when the updater key is rotated', () => {
    const root = copyRepoConfig();
    editJson(root, 'src-tauri/tauri.conf.json', (conf) => {
      conf.plugins.updater.pubkey = keys.other.pubkey;
    });
    expect(() => checkConfig(root)).toThrow(/only accept updates signed by/);
  });

  it('fails when relaunch permission is removed', () => {
    const root = copyRepoConfig();
    editJson(root, 'src-tauri/capabilities/default.json', (cap) => {
      cap.permissions = cap.permissions.filter((p) => typeof p !== 'string' || !p.startsWith('process:'));
    });
    expect(() => checkConfig(root)).toThrow(/relaunch/);
  });
});
