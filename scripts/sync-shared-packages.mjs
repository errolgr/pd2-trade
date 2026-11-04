#!/usr/bin/env node
/**
 * Vendors the shared packages from the private pd2-trader-server monorepo into vendor/@pd2-trader/* and rewrites
 * vendor/MANIFEST.json. CI never reaches the private repo; it only checks the hashes (scripts/check-vendor.mjs).
 *
 *   npm run sync:shared                          re-sync the ref in vendor/MANIFEST.json
 *   npm run sync:shared -- --ref <sha|branch>    sync another commit (branches resolve to their head sha)
 *   npm run sync:shared -- --repo-dir <path>     read from a local pd2-trader-server checkout instead of GitHub
 *
 * GitHub access uses the operator's `gh auth token`. Each package's npm `files` (plus package.json) is copied,
 * minus tests and stories; package.json drops devDependencies/scripts (they run in the server repo) and its
 * `workspace:` ranges become the vendored sibling's version so npm workspaces resolve them. Run `npm install` after.
 */
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { MANIFEST_PATH, PACKAGES, SERVER_REPO, VENDOR_DIR, hashFile, vendoredFiles } from './vendor-lib.mjs';

const EXCLUDE = [/\.test\.[cm]?[jt]sx?$/, /\.stories\.[jt]sx?$/, /(^|\/)__(tests|snapshots)__(\/|$)/];

function arg(name) {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
}

function run(cmd, args, { binary = false, ...opts } = {}) {
  const res = spawnSync(cmd, args, { encoding: binary ? 'buffer' : 'utf8', maxBuffer: 1 << 30, ...opts });
  if (res.status !== 0) {
    const err = res.stderr ? res.stderr.toString() : '';
    throw new Error(`${cmd} ${args.filter((a) => !a.includes('AUTHORIZATION')).join(' ')} failed: ${err.trim()}`);
  }
  return res.stdout;
}

const previous = existsSync(MANIFEST_PATH) ? JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) : null;
const ref = arg('--ref') ?? previous?.ref;
const repoDir = arg('--repo-dir');
if (!ref) throw new Error('no --ref given and vendor/MANIFEST.json has none');

const work = mkdtempSync(join(tmpdir(), 'pd2-sync-'));
try {
  const repo = repoDir ?? join(work, 'repo');
  const git = (args, opts) => run('git', ['-C', repo, ...args], opts);
  let sha;
  if (repoDir) {
    sha = git(['rev-parse', '--verify', `${ref}^{commit}`]).trim();
  } else {
    const token = run('gh', ['auth', 'token']).trim();
    const auth = `http.https://github.com/.extraheader=AUTHORIZATION: basic ${Buffer.from(`x-access-token:${token}`).toString('base64')}`;
    run('git', ['init', '-q', repo]);
    git(['-c', auth, 'fetch', '-q', '--depth', '1', `https://github.com/${SERVER_REPO}.git`, ref]);
    sha = git(['rev-parse', 'FETCH_HEAD']).trim();
  }

  const src = join(work, 'src');
  mkdirSync(src);
  const tar = git(['archive', '--format=tar', sha, ...Object.keys(PACKAGES)], { binary: true });
  run('tar', ['-x', '-C', src], { input: tar });

  const versions = {};
  const pkgs = {};
  for (const from of Object.keys(PACKAGES)) {
    pkgs[from] = JSON.parse(readFileSync(join(src, from, 'package.json'), 'utf8'));
    versions[pkgs[from].name] = pkgs[from].version;
  }

  for (const [from, to] of Object.entries(PACKAGES)) {
    const pkg = pkgs[from];
    const dest = join(VENDOR_DIR, to);
    rmSync(dest, { recursive: true, force: true });
    mkdirSync(dest, { recursive: true });
    for (const entry of pkg.files ?? []) {
      const path = join(src, from, entry);
      if (!existsSync(path)) {
        console.warn(`! ${pkg.name}: "files" entry ${entry} is missing at ${sha.slice(0, 8)}, skipped`);
        continue;
      }
      cpSync(path, join(dest, entry), {
        recursive: true,
        filter: (p) => !EXCLUDE.some((re) => re.test(p.slice(join(src, from).length).split('\\').join('/'))),
      });
    }
    delete pkg.devDependencies;
    delete pkg.scripts;
    for (const field of ['dependencies', 'peerDependencies']) {
      for (const [name, range] of Object.entries(pkg[field] ?? {})) {
        if (!range.startsWith('workspace:')) continue;
        if (!versions[name]) throw new Error(`${pkg.name} depends on ${name} (${range}), which is not vendored`);
        pkg[field][name] = versions[name];
      }
    }
    writeFileSync(join(dest, 'package.json'), `${JSON.stringify(pkg, null, 2)}\n`);
    console.log(`✓ ${pkg.name}@${pkg.version} ← ${SERVER_REPO}@${sha.slice(0, 8)}:${from}`);
  }

  mkdirSync(dirname(MANIFEST_PATH), { recursive: true });
  const files = Object.fromEntries(vendoredFiles().map((path) => [path, hashFile(path)]));
  const manifest = { repo: SERVER_REPO, ref: sha, packages: PACKAGES, files };
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`✓ vendor/MANIFEST.json: ${Object.keys(files).length} files at ${sha}. Run npm install.`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
