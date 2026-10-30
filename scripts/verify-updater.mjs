#!/usr/bin/env node
/**
 * Guards the auto-update pipeline. A broken update can only be fixed by users re-downloading the
 * installer, because the updater that would fetch the fix lives in the already-installed build.
 *
 *   node scripts/verify-updater.mjs config
 *     Repo checks: version files agree, updater pubkey/endpoint/identifier match what installed builds
 *     expect, updater + process plugins are registered and permitted.
 *
 *   node scripts/verify-updater.mjs draft --release-id <id> [--repo owner/name]     (needs GITHUB_TOKEN)
 *     Before publishing: the draft release's latest.json has this package version, is newer than the
 *     live release, covers every platform, and each signature verifies against the attached asset.
 *
 *   node scripts/verify-updater.mjs live [--expect-version <x.y.z>]
 *     What installed apps see: the configured endpoint serves a valid latest.json whose download URLs
 *     resolve to files that verify against the pubkey baked into installed builds.
 */
import { createHash, createPublicKey, verify } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readVersions } from './version-files.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Installed builds have these baked in. Changing any of them strands every existing install:
// a new key fails signature checks, a new identifier/binary name installs a second copy, and old
// builds keep polling the old endpoint. Only change them alongside a manual-reinstall migration plan.
export const EXPECTED_KEY_ID = '26B56390B49E9A08';
export const EXPECTED_ENDPOINT = 'https://github.com/errolgr/pd2-trade/releases/latest/download/latest.json';
export const EXPECTED_IDENTIFIER = 'com.pd2-trader.app';
export const EXPECTED_MAIN_BINARY = 'pd2-trader-installer';
// Platforms built by .github/workflows/publish-to-manual-release.yml.
export const REQUIRED_PLATFORMS = ['windows-x86_64', 'linux-x86_64'];
const DEFAULT_REPO = 'errolgr/pd2-trade';

const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

/** Minisign key/signature files are 2-line text; Tauri stores them base64-encoded once more. */
function minisignLines(base64Text, what) {
  const lines = Buffer.from(base64Text.trim(), 'base64').toString('utf8').split(/\r?\n/);
  if (!lines[0]?.startsWith('untrusted comment:') || !lines[1]) {
    throw new Error(`${what} is not a base64-encoded minisign file`);
  }
  return lines;
}

/** Parse a Tauri updater pubkey (base64 of a minisign .pub file). */
export function parsePublicKey(pubkeyBase64) {
  const raw = Buffer.from(minisignLines(pubkeyBase64, 'Updater pubkey')[1], 'base64');
  if (raw.length !== 42 || raw.subarray(0, 2).toString('latin1') !== 'Ed') {
    throw new Error('Updater pubkey is not a minisign Ed25519 public key');
  }
  return {
    keyId: Buffer.from(raw.subarray(2, 10)).reverse().toString('hex').toUpperCase(),
    key: createPublicKey({ key: Buffer.concat([ED25519_SPKI_PREFIX, raw.subarray(10)]), format: 'der', type: 'spki' }),
  };
}

/**
 * Verify a Tauri updater signature (base64 of a minisign .sig file) over `data`, the same way the
 * updater plugin does before installing. Throws with the reason on failure.
 */
export function verifySignature(pubkeyBase64, signatureBase64, data) {
  const { keyId, key } = parsePublicKey(pubkeyBase64);
  const lines = minisignLines(signatureBase64, 'Signature');
  const sig = Buffer.from(lines[1], 'base64');
  if (sig.length !== 74) throw new Error('Signature has an unexpected length');

  const algorithm = sig.subarray(0, 2).toString('latin1');
  const sigKeyId = Buffer.from(sig.subarray(2, 10)).reverse().toString('hex').toUpperCase();
  if (sigKeyId !== keyId) {
    throw new Error(`Signed with key ${sigKeyId}, but installed builds trust key ${keyId}`);
  }
  // "ED" = prehashed (BLAKE2b-512 of the file), what `tauri signer` produces; "Ed" = legacy raw.
  let message;
  if (algorithm === 'ED') message = createHash('blake2b512').update(data).digest();
  else if (algorithm === 'Ed') message = data;
  else throw new Error(`Unsupported signature algorithm "${algorithm}"`);

  const signatureBytes = sig.subarray(10);
  if (!verify(null, message, key, signatureBytes)) {
    throw new Error('Signature does not match the file contents');
  }

  const trustedPrefix = 'trusted comment: ';
  if (!lines[2]?.startsWith(trustedPrefix) || !lines[3]) throw new Error('Signature is missing its trusted comment');
  const globalSignature = Buffer.from(lines[3], 'base64');
  const trustedComment = Buffer.from(lines[2].slice(trustedPrefix.length), 'utf8');
  if (!verify(null, Buffer.concat([signatureBytes, trustedComment]), key, globalSignature)) {
    throw new Error('Trusted comment signature is invalid');
  }
}

/** Numeric x.y.z comparison; the updater only offers strictly newer versions. */
export function compareVersions(a, b) {
  const parse = (v) => {
    const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(v);
    if (!match) throw new Error(`"${v}" is not an x.y.z version`);
    return match.slice(1).map(Number);
  };
  const [pa, pb] = [parse(a), parse(b)];
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
  return 0;
}

/** Validate latest.json structure; returns the platform entries to verify. */
export function checkManifest(manifest, { expectVersion } = {}) {
  const errors = [];
  if (typeof manifest?.version !== 'string') errors.push('latest.json has no version');
  else {
    try {
      compareVersions(manifest.version, '0.0.0');
    } catch (error) {
      errors.push(`latest.json ${error.message}`);
    }
    if (expectVersion && manifest.version.replace(/^v/, '') !== expectVersion) {
      errors.push(`latest.json is version ${manifest.version}, expected ${expectVersion}`);
    }
  }
  const platforms = manifest?.platforms ?? {};
  for (const name of REQUIRED_PLATFORMS) {
    const entry = platforms[name];
    if (!entry) errors.push(`latest.json is missing platform ${name}`);
    else if (typeof entry.url !== 'string' || !entry.url.startsWith('https://')) errors.push(`${name}: url is not https`);
    else if (typeof entry.signature !== 'string' || !entry.signature) errors.push(`${name}: signature is empty`);
  }
  if (errors.length) throw new Error(errors.join('\n'));
  return REQUIRED_PLATFORMS.map((name) => ({ name, ...platforms[name] }));
}

function readJson(relative) {
  return JSON.parse(readFileSync(path.join(ROOT, relative), 'utf8'));
}

function tauriConfig() {
  return readJson('src-tauri/tauri.conf.json');
}

function packageVersion() {
  return readJson('package.json').version;
}

export function checkConfig(root = ROOT) {
  const read = (relative) => readFileSync(path.join(root, relative), 'utf8');
  const errors = [];
  const conf = JSON.parse(read('src-tauri/tauri.conf.json'));
  const pkg = JSON.parse(read('package.json'));

  // Version mismatches make the installed app think it is outdated forever (update loop) or never.
  const versions = readVersions(root);
  if (new Set(Object.values(versions)).size !== 1) {
    errors.push(`Version files disagree: ${Object.entries(versions).map(([f, v]) => `${f}=${v}`).join(', ')}`);
  }

  const updater = conf.plugins?.updater;
  try {
    const { keyId } = parsePublicKey(updater?.pubkey ?? '');
    if (keyId !== EXPECTED_KEY_ID) {
      errors.push(`Updater pubkey is key ${keyId}; installed builds only accept updates signed by ${EXPECTED_KEY_ID}`);
    }
  } catch (error) {
    errors.push(error.message);
  }
  if (!updater?.endpoints?.includes(EXPECTED_ENDPOINT)) {
    errors.push(`Updater endpoints must include ${EXPECTED_ENDPOINT} (installed builds poll it)`);
  }
  if (conf.bundle?.createUpdaterArtifacts !== true) {
    errors.push('bundle.createUpdaterArtifacts must be true or releases ship without signatures/latest.json');
  }
  if (conf.identifier !== EXPECTED_IDENTIFIER) errors.push(`identifier must stay ${EXPECTED_IDENTIFIER}`);
  if (conf.mainBinaryName !== EXPECTED_MAIN_BINARY) errors.push(`mainBinaryName must stay ${EXPECTED_MAIN_BINARY}`);

  const permissions = new Set(
    JSON.parse(read('src-tauri/capabilities/default.json')).permissions.map((p) => (typeof p === 'string' ? p : p.identifier)),
  );
  const hasAll = (alternatives) => alternatives.some((set) => set.every((p) => permissions.has(p)));
  if (!hasAll([['updater:default'], ['updater:allow-check', 'updater:allow-download-and-install']])) {
    errors.push('capabilities/default.json must grant updater:default (check + download-and-install)');
  }
  if (!hasAll([['process:default'], ['process:allow-restart']])) {
    errors.push('capabilities/default.json must grant process:default or process:allow-restart (relaunch)');
  }

  const libRs = read('src-tauri/src/lib.rs');
  if (!/tauri_plugin_updater::Builder::new\(\)/.test(libRs)) errors.push('lib.rs does not register tauri_plugin_updater');
  if (!/tauri_plugin_process::init\(\)/.test(libRs)) errors.push('lib.rs does not register tauri_plugin_process');

  if (errors.length) throw new Error(errors.join('\n'));
  return pkg.version;
}

async function fetchOk(url, init) {
  const response = await fetch(url, { redirect: 'follow', ...init });
  if (!response.ok) throw new Error(`GET ${url} -> HTTP ${response.status}`);
  return response;
}

export async function fetchLiveManifest() {
  return (await fetchOk(EXPECTED_ENDPOINT, { headers: { 'Cache-Control': 'no-cache' } })).json();
}

async function verifyPlatforms(entries, pubkey, download) {
  const failures = [];
  for (const entry of entries) {
    try {
      const data = await download(entry);
      verifySignature(pubkey, entry.signature, data);
      console.log(`  ok  ${entry.name}: ${(data.length / 1e6).toFixed(1)} MB, signature valid`);
    } catch (error) {
      failures.push(`${entry.name}: ${error.message}`);
    }
  }
  if (failures.length) throw new Error(failures.join('\n'));
}

async function runLive(args) {
  const conf = tauriConfig();
  const manifest = await fetchLiveManifest();
  const entries = checkManifest(manifest, { expectVersion: args['expect-version'] });
  console.log(`Live latest.json: v${manifest.version}`);
  await verifyPlatforms(entries, conf.plugins.updater.pubkey, async (entry) =>
    Buffer.from(await (await fetchOk(entry.url)).arrayBuffer()),
  );
}

async function runDraft(args) {
  const token = process.env.GITHUB_TOKEN;
  const releaseId = args['release-id'];
  const repo = args.repo ?? DEFAULT_REPO;
  if (!token) throw new Error('GITHUB_TOKEN is required to read draft releases');
  if (!releaseId) throw new Error('--release-id is required');

  const api = (url, accept = 'application/vnd.github+json') =>
    fetchOk(url, { headers: { Authorization: `Bearer ${token}`, Accept: accept, 'X-GitHub-Api-Version': '2022-11-28' } });
  const release = await (await api(`https://api.github.com/repos/${repo}/releases/${releaseId}`)).json();
  const assets = new Map(release.assets.map((asset) => [asset.name, asset]));
  const downloadAsset = async (asset) => Buffer.from(await (await api(asset.url, 'application/octet-stream')).arrayBuffer());

  const manifestAsset = assets.get('latest.json');
  if (!manifestAsset) throw new Error(`Release ${release.tag_name} has no latest.json asset`);
  const manifest = JSON.parse((await downloadAsset(manifestAsset)).toString('utf8'));
  const entries = checkManifest(manifest, { expectVersion: args['expect-version'] ?? packageVersion() });
  console.log(`Draft ${release.tag_name} latest.json: v${manifest.version}`);

  await verifyPlatforms(entries, tauriConfig().plugins.updater.pubkey, async (entry) => {
    const name = decodeURIComponent(new URL(entry.url).pathname.split('/').pop());
    const asset = assets.get(name);
    if (!asset) throw new Error(`url points at ${name}, which is not attached to the release`);
    return downloadAsset(asset);
  });

  const live = await fetchLiveManifest().catch(() => null);
  if (live?.version && compareVersions(manifest.version, live.version) <= 0) {
    throw new Error(`v${manifest.version} is not newer than the live v${live.version}; installed apps would not update`);
  }
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) args[argv[i].slice(2)] = argv[++i];
    else args._.push(argv[i]);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const mode = args._[0];
  if (mode === 'config') console.log(`Updater config OK (v${checkConfig()})`);
  else if (mode === 'live') await runLive(args);
  else if (mode === 'draft') await runDraft(args);
  else throw new Error('Usage: verify-updater.mjs <config | live [--expect-version x.y.z] | draft --release-id id [--repo o/r]>');
  if (mode !== 'config') console.log('Updater release OK');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`Updater verification failed:\n${error.message}`);
    process.exit(1);
  });
}
