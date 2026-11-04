#!/usr/bin/env node
/**
 * Local mock of the plugin marketplace (`/api/plugins`, pd2-price-crawler PluginsModule) for dev and smoke tests.
 * Serves the sample plugin in scripts/fixtures/plugins (built at startup with the vendored @pd2-trader/plugin-sdk
 * build), optionally the first-party plugins built in pd2-trader-server, an inline theme-only plugin, a listing
 * whose bundle signature is wrong (install must be rejected) and a blocklisted listing.
 *
 * Usage:
 *   node scripts/mock-plugin-marketplace.mjs [port]        (or PORT=3999; default 3999)
 *   VITE_BACKEND_URL=http://localhost:3999 npm run dev
 *   PD2_PLUGINS_DIR=../pd2-price-crawler/packages/plugins  also serve those plugins' dist/ (build them in the server
 *                                                          repo first); several dirs separated by ':'
 *
 * Signing uses the DEV seed below (dev/test only); its public key is the one in src/plugins/trust/publicKey.ts.
 */
import { Buffer } from 'node:buffer';
import { createHash, createPrivateKey, createPublicKey, sign } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURE_PLUGINS = join(ROOT, 'scripts', 'fixtures', 'plugins');
const PLUGIN_DIRS = [FIXTURE_PLUGINS, ...(process.env.PD2_PLUGINS_DIR ?? '').split(':').filter(Boolean)];
const PORT = Number(process.argv[2] ?? process.env.PORT ?? 3999);
/** The Vite dev server (http://localhost:1420) and any other local port, for parallel dev servers. */
const ALLOWED_ORIGIN_RE = /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/;
const PAGE_SIZE = 2;
const BASE = '/api/plugins';

// ---- signing ----------------------------------------------------------------------------------------------

const DEV_SEED = 'aWPRHqm93UStNrUy+qfcgxRZ3yYtyo//gdo9BzTqLXs=';
const PKCS8_ED25519_PREFIX = Buffer.from('302e020100300506032b657004220420', 'hex');
const privateKey = createPrivateKey({
  key: Buffer.concat([PKCS8_ED25519_PREFIX, Buffer.from(DEV_SEED, 'base64')]),
  format: 'der',
  type: 'pkcs8',
});
const publicKeyB64 = createPublicKey(privateKey).export({ format: 'der', type: 'spki' }).subarray(-32).toString('base64');

const signText = (message) => sign(null, Buffer.from(message, 'utf8'), privateKey).toString('base64');
const sha256Hex = (bytes) => createHash('sha256').update(bytes).digest('hex');

/** Same as canonicalJson in src/plugins/trust/verify.ts: keys sorted at every depth, no whitespace. */
function canonicalJson(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((v) => canonicalJson(v === undefined ? null : v)).join(',')}]`;
  const entries = Object.entries(value)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`;
}

// ---- catalog ----------------------------------------------------------------------------------------------

const PUBLISHED_AT = '2026-10-20T12:00:00.000Z';

/** Every PLUGIN_THEME_TOKENS token (packages/plugin-sdk/src/manifest.ts); surface/surface-elevated are derived. */
const EMBER_VARS = {
  background: 'oklch(0.16 0.02 30)',
  foreground: 'oklch(0.96 0.01 60)',
  card: 'oklch(0.23 0.03 30)',
  'card-foreground': 'oklch(0.96 0.01 60)',
  popover: 'oklch(0.18 0.025 30)',
  'popover-foreground': 'oklch(0.96 0.01 60)',
  primary: 'oklch(0.7 0.17 45)',
  'primary-foreground': 'oklch(0.16 0.02 30)',
  secondary: 'oklch(0.27 0.035 30)',
  'secondary-foreground': 'oklch(0.96 0.01 60)',
  muted: 'oklch(0.27 0.035 30)',
  'muted-foreground': 'oklch(0.72 0.03 50)',
  accent: 'oklch(0.3 0.05 35)',
  'accent-foreground': 'oklch(0.96 0.01 60)',
  destructive: 'oklch(0.6 0.22 25)',
  'destructive-foreground': 'oklch(0.98 0 0)',
  border: 'oklch(0.3 0.04 30)',
  input: 'oklch(0.45 0.05 35)',
  ring: 'oklch(0.7 0.17 45)',
  'chart-1': 'oklch(0.7 0.17 45)',
  'chart-2': 'oklch(0.7 0.13 165)',
  'chart-3': 'oklch(0.78 0.15 85)',
  'chart-4': 'oklch(0.62 0.2 310)',
  'chart-5': 'oklch(0.62 0.21 10)',
  sidebar: 'oklch(0.16 0.02 30)',
  'sidebar-foreground': 'oklch(0.96 0.01 60)',
  'sidebar-primary': 'oklch(0.7 0.17 45)',
  'sidebar-primary-foreground': 'oklch(0.16 0.02 30)',
  'sidebar-accent': 'oklch(0.3 0.05 35)',
  'sidebar-accent-foreground': 'oklch(0.96 0.01 60)',
  'sidebar-border': 'oklch(0.3 0.04 30)',
  'sidebar-ring': 'oklch(0.7 0.17 45)',
  success: 'oklch(0.72 0.2 150)',
  'success-foreground': 'oklch(0.14 0.004 285)',
  warning: 'oklch(0.83 0.18 84)',
  'warning-foreground': 'oklch(0.14 0.004 285)',
  info: 'oklch(0.75 0.15 232)',
  'info-foreground': 'oklch(0.14 0.004 285)',
  'surface-foreground': 'oklch(0.96 0.01 60)',
  glow: 'oklch(0.75 0.16 50)',
  scrim: 'oklch(0 0 0 / 0.6)',
  'q-unique': 'oklch(0.8 0.09 77)',
  'q-set': 'oklch(0.79 0.21 152)',
  'q-rare': 'oklch(0.85 0.2 92)',
  'q-magic': 'oklch(0.71 0.17 255)',
  'q-crafted': 'oklch(0.68 0.16 76)',
  'q-rune': 'oklch(0.75 0.18 55)',
  'q-normal': 'oklch(0.97 0.003 265)',
  'q-gold': 'oklch(0.81 0.13 86)',
  'q-corrupted': 'oklch(0.7 0.19 22)',
  'q-corrupted-zone': 'oklch(0.71 0.2 306)',
  radius: '0.375rem',
};

const PANEL_HTML = (title) =>
  `<!doctype html><html><body><div class="pd2-stack"><p class="pd2-title">${title}</p></div></body></html>`;

/** Inline listings: bundle built on request for any listed version. */
const INLINE = [
  {
    listing: {
      id: 'dev.pd2trader.ember-theme',
      name: 'Hellforge Ember',
      summary: 'A warm dark theme with forge-orange highlights.',
      author: 'PD2 Trader',
      category: 'theme',
      verified: true,
      installs: 1280,
      rating: 4.6,
    },
    versions: ['1.0.0', '1.1.0'],
    manifest: (version) => ({
      id: 'dev.pd2trader.ember-theme',
      name: 'Hellforge Ember',
      version,
      sdk: '^1.0.0',
      description: 'A warm dark theme with forge-orange highlights.',
      author: 'PD2 Trader',
      category: 'theme',
      theme: { mode: 'dark', description: 'Forge orange on charcoal', vars: EMBER_VARS },
    }),
    files: {},
  },
  {
    listing: {
      id: 'dev.example.sketchy-prices',
      name: 'Sketchy Prices',
      summary: 'Demo listing whose bundle signature is wrong; installing it must fail.',
      author: 'Unknown dev',
      category: 'pricing',
      verified: false,
      installs: 3,
      rating: null,
    },
    versions: ['0.1.0'],
    badSignature: true,
    manifest: (version) => ({
      id: 'dev.example.sketchy-prices',
      name: 'Sketchy Prices',
      version,
      sdk: '^1.0.0',
      description: 'Demo listing whose bundle signature is wrong.',
      author: 'Unknown dev',
      category: 'pricing',
      entry: { panels: { main: 'panels/main.html' } },
      network: ['prices.example.com'],
    }),
    files: { 'panels/main.html': PANEL_HTML('Sketchy Prices') },
  },
  {
    listing: {
      id: 'dev.example.old-ticker',
      name: 'Old Ticker',
      summary: 'Demo listing whose only version is on the blocklist.',
      author: 'Example dev',
      category: 'utility',
      verified: false,
      installs: 412,
      rating: 3.1,
    },
    versions: ['1.0.0'],
    manifest: (version) => ({
      id: 'dev.example.old-ticker',
      name: 'Old Ticker',
      version,
      sdk: '^1.0.0',
      description: 'Demo listing whose only version is on the blocklist.',
      author: 'Example dev',
      category: 'utility',
      entry: { panels: { main: 'panels/main.html' } },
      permissions: ['prices:read'],
    }),
    files: { 'panels/main.html': PANEL_HTML('Old Ticker') },
  },
];

const BLOCKLIST_ENTRIES = [{ id: 'dev.example.old-ticker', versions: ['1.0.0'], reason: 'Sends price checks to an undeclared host' }];
const BLOCKLIST_ISSUED_AT = new Date().toISOString();

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

function listFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...listFiles(full));
    else out.push(full);
  }
  return out;
}

/** Builds the fixture plugins into their (git-ignored) dist/ with the vendored SDK build. */
async function buildFixtures() {
  const { buildPlugin, writeOutput } = await import('../vendor/@pd2-trader/plugin-sdk/bin/build.mjs');
  for (const name of readdirSync(FIXTURE_PLUGINS)) {
    const dir = join(FIXTURE_PLUGINS, name);
    const { files } = await buildPlugin(dir);
    await writeOutput(join(dir, 'dist'), files);
  }
}

/** Plugins under PLUGIN_DIRS/*: metadata from dist/manifest.json, else the source pd2-plugin.json. */
function firstParty() {
  const out = [];
  for (const root of PLUGIN_DIRS) {
    if (!existsSync(root)) continue;
    for (const name of readdirSync(root).sort()) {
      const dir = join(root, name);
      const dist = join(dir, 'dist');
      const built = join(dist, 'manifest.json');
      const source = join(dir, 'pd2-plugin.json');
      try {
        const manifestPath = existsSync(built) ? built : existsSync(source) ? source : null;
        if (!manifestPath) continue;
        out.push({ dist: existsSync(built) ? dist : null, manifest: readJson(manifestPath) });
      } catch (error) {
        console.warn(`[mock-marketplace] skipping ${name}: ${error.message}`);
      }
    }
  }
  return out;
}

function toListing(manifest, extra) {
  return {
    id: manifest.id,
    name: manifest.name,
    summary: manifest.description ?? '',
    author: manifest.author ?? 'PD2 Trader',
    category: manifest.category ?? 'utility',
    iconUrl: null,
    latestVersion: manifest.version,
    permissions: manifest.permissions ?? [],
    network: manifest.network ?? [],
    installs: 0,
    rating: null,
    verified: false,
    ...extra,
  };
}

/** All listings with a way to build each version's bundle (null = not built → 404). */
function catalog() {
  const entries = [];
  for (const { dist, manifest } of firstParty()) {
    entries.push({
      listing: toListing(manifest, { author: 'PD2 Trader', verified: true, installs: 2400, rating: 4.8 }),
      versions: [{ version: manifest.version, manifest }],
      bundle: (version) => {
        if (!dist || version !== manifest.version || !existsSync(join(dist, 'manifest.json'))) return null;
        const builtManifest = readJson(join(dist, 'manifest.json'));
        const files = {};
        for (const file of listFiles(dist)) {
          const path = relative(dist, file).split(sep).join('/');
          if (path !== 'manifest.json') files[path] = readFileSync(file, 'utf8');
        }
        return { format: 'pd2-plugin-bundle@1', manifest: builtManifest, files };
      },
    });
  }
  for (const item of INLINE) {
    const latest = item.versions[item.versions.length - 1];
    const latestManifest = item.manifest(latest);
    entries.push({
      listing: toListing(latestManifest, item.listing),
      versions: item.versions.map((version) => ({ version, manifest: item.manifest(version) })),
      badSignature: item.badSignature,
      bundle: (version) =>
        item.versions.includes(version)
          ? { format: 'pd2-plugin-bundle@1', manifest: item.manifest(version), files: item.files }
          : null,
    });
  }
  return entries;
}

function release(entry, version) {
  const bundle = entry.bundle(version);
  if (!bundle) return null;
  const bytes = Buffer.from(JSON.stringify(bundle), 'utf8');
  const sha256 = sha256Hex(bytes);
  const id = entry.listing.id;
  // Wrong on purpose: signs a different hash, so the client's signature check fails.
  const signature = signText(`${id}@${version}:${entry.badSignature ? sha256Hex(Buffer.from('tampered')) : sha256}`);
  return { bytes, sha256, signature, manifest: bundle.manifest };
}

// ---- http -------------------------------------------------------------------------------------------------

function send(req, res, status, body, contentType = 'application/json') {
  const origin = req.headers.origin;
  const headers = { 'Cache-Control': 'no-store' };
  if (origin && ALLOWED_ORIGIN_RE.test(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Vary'] = 'Origin';
  }
  if (body === undefined) {
    res.writeHead(status, headers).end();
    return;
  }
  const payload = Buffer.isBuffer(body) ? body : Buffer.from(JSON.stringify(body), 'utf8');
  res.writeHead(status, { ...headers, 'Content-Type': contentType, 'Content-Length': payload.length }).end(payload);
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : null);
      } catch {
        resolve(data);
      }
    });
  });
}

function listPage(params) {
  const q = (params.get('q') ?? '').trim().toLowerCase();
  const category = params.get('category');
  const offset = Math.max(0, Number.parseInt(params.get('cursor') ?? '0', 10) || 0);
  const matches = catalog()
    .map((e) => e.listing)
    .filter((l) => !category || l.category === category)
    .filter((l) => !q || [l.id, l.name, l.summary, l.author].some((s) => s.toLowerCase().includes(q)));
  const items = matches.slice(offset, offset + PAGE_SIZE);
  const next = offset + PAGE_SIZE;
  return { items, nextCursor: next < matches.length ? String(next) : null };
}

async function route(req, res) {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  if (req.method === 'OPTIONS') {
    const origin = req.headers.origin;
    const headers = { 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Max-Age': '600' };
    if (origin && ALLOWED_ORIGIN_RE.test(origin)) {
      headers['Access-Control-Allow-Origin'] = origin;
      headers['Access-Control-Allow-Headers'] = req.headers['access-control-request-headers'] ?? 'Content-Type, Accept';
      headers['Vary'] = 'Origin';
    }
    res.writeHead(204, headers).end();
    return;
  }
  if (url.pathname !== BASE && !url.pathname.startsWith(`${BASE}/`)) return send(req, res, 404, { message: 'Not found' });
  const parts = url.pathname
    .slice(BASE.length)
    .split('/')
    .filter(Boolean)
    .map((p) => decodeURIComponent(p));

  if (req.method === 'POST' && parts.length === 2 && ['installs', 'errors', 'active'].includes(parts[1])) {
    const body = await readBody(req);
    console.log(`[mock-marketplace] POST ${parts[1]} ${parts[0]} ${JSON.stringify(body)}`);
    return send(req, res, 204);
  }
  if (req.method !== 'GET') return send(req, res, 405, { message: 'Method not allowed' });

  if (parts.length === 0) return send(req, res, 200, listPage(url.searchParams));
  if (parts.length === 1 && parts[0] === 'blocklist') {
    const body = { entries: BLOCKLIST_ENTRIES, issuedAt: BLOCKLIST_ISSUED_AT };
    return send(req, res, 200, { ...body, signature: signText(canonicalJson(body)) });
  }

  const entry = catalog().find((e) => e.listing.id === parts[0]);
  if (!entry) return send(req, res, 404, { message: 'Unknown plugin' });
  if (parts.length === 1) {
    const versions = entry.versions
      .map(({ version, manifest }) => ({
        version,
        publishedAt: PUBLISHED_AT,
        permissions: manifest.permissions ?? [],
        network: manifest.network ?? [],
        status: BLOCKLIST_ENTRIES.some((b) => b.id === entry.listing.id && (b.versions === '*' || b.versions.includes(version)))
          ? 'blocked'
          : 'approved',
      }))
      .reverse();
    return send(req, res, 200, { ...entry.listing, versions });
  }
  if (parts[1] !== 'versions' || !parts[2]) return send(req, res, 404, { message: 'Not found' });
  const version = parts[2];
  if (!entry.versions.some((v) => v.version === version)) return send(req, res, 404, { message: 'Unknown version' });
  const built = release(entry, version);
  if (!built) return send(req, res, 404, { message: `${entry.listing.id} is not built (build it in pd2-trader-server)` });
  if (parts.length === 3)
    return send(req, res, 200, {
      manifest: built.manifest,
      bundleUrl: `${BASE}/${encodeURIComponent(entry.listing.id)}/versions/${encodeURIComponent(version)}/bundle`,
      sha256: built.sha256,
      signature: built.signature,
      publishedAt: PUBLISHED_AT,
    });
  if (parts.length === 4 && parts[3] === 'bundle') return send(req, res, 200, built.bytes);
  return send(req, res, 404, { message: 'Not found' });
}

await buildFixtures();
for (const root of PLUGIN_DIRS) if (!existsSync(root)) console.warn(`[mock-marketplace] ${root} does not exist`);
createServer((req, res) => {
  route(req, res).catch((error) => {
    console.error('[mock-marketplace]', error);
    if (!res.headersSent) send(req, res, 500, { message: String(error?.message ?? error) });
  });
}).listen(PORT, () => {
  const ids = catalog().map((e) => `${e.listing.id}${e.bundle(e.listing.latestVersion) ? '' : ' (not built)'}`);
  console.log(`[mock-marketplace] http://localhost:${PORT}${BASE} · public key ${publicKeyB64}`);
  console.log(`[mock-marketplace] listings: ${ids.join(', ')}`);
});
