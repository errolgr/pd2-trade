#!/usr/bin/env node
/**
 * pd2-plugin: build, serve and publish PD2 Trader plugins.
 *
 *   pd2-plugin build [--outdir <dir>]               pd2-plugin.json + sources → dist/
 *   pd2-plugin dev [--port 5199] [--outdir <dir>]   build, rebuild on change, serve dist/ with CORS
 *   pd2-plugin publish [--key <pd2pk_…>] [--api <url>] [--notes <md> | --changelog <file>] [--dry-run]
 *                                                    build, then upload the bundle for review
 *
 * Run inside a plugin folder (the one with pd2-plugin.json). The desktop app's Settings → Plugins → Load unpacked
 * only accepts a folder inside its config directory (`<AppConfig>/plugins-dev/<name>`): point `--outdir` there.
 * The dev-server URL (`pd2-plugin dev`) only loads in the overlay's browser dev mode (`npm run dev` in a browser).
 */
import { watch } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { buildPlugin, display, PluginBuildError, writeOutput } from './build.mjs';
import { DEFAULT_API, PublishError, publishKey, releaseNotes, toBundle, upload } from './publish.mjs';

const USAGE = `Usage:
  pd2-plugin build [--outdir <dir>]
  pd2-plugin dev [--port 5199] [--outdir <dir>]
  pd2-plugin publish [--key <pd2pk_…>] [--api ${DEFAULT_API}] [--notes <markdown> | --changelog <file>] [--dry-run]

Run in a plugin folder containing pd2-plugin.json. Output goes to ./dist.
publish reads the key from --key or PD2_PLUGIN_KEY (pd2trader.com → My plugins → Publish keys) and the release
notes from --notes, else the version's section of --changelog / ./CHANGELOG.md. Every upload waits for review.`;

const DEFAULT_PORT = 5199;

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const options = { port: DEFAULT_PORT, outdir: null, api: process.env.PD2_TRADER_API ?? DEFAULT_API };
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    const [flag, inline] = arg.split('=', 2);
    const value = () => {
      const v = inline ?? rest[++i];
      if (v === undefined) fail(`${flag} needs a value`);
      return v;
    };
    if (flag === '--port') {
      options.port = Number(value());
      if (!Number.isInteger(options.port) || options.port <= 0 || options.port > 65535) fail('--port must be 1-65535');
    } else if (flag === '--outdir') options.outdir = resolve(value());
    else if (flag === '--key') options.key = value();
    else if (flag === '--api') options.api = value();
    else if (flag === '--notes') options.notes = value();
    else if (flag === '--changelog') options.changelog = resolve(value());
    else if (flag === '--dry-run') options.dryRun = true;
    else if (flag === '-h' || flag === '--help') options.help = true;
    else fail(`Unknown option ${arg}`);
  }
  return { command, options };
}

function fail(message) {
  console.error(`pd2-plugin: ${message}\n\n${USAGE}`);
  process.exit(1);
}

async function buildOnce(root, outdir) {
  const started = Date.now();
  const { manifest, files } = await buildPlugin(root);
  const dist = join(root, 'dist');
  await writeOutput(dist, files);
  if (outdir) await writeOutput(outdir, files);
  const size = [...files.values()].reduce((n, c) => n + Buffer.byteLength(c), 0);
  console.log(
    `✓ ${manifest.id}@${manifest.version} → ${display(dist)}${outdir ? ` + ${display(outdir)}` : ''} ` +
      `(${files.size} files, ${(size / 1024).toFixed(1)} KB, ${Date.now() - started} ms)`,
  );
}

const report = (error) => console.error(error instanceof PluginBuildError ? `✗ ${error.message}` : error);

const CONTENT_TYPES = {
  '.json': 'application/json; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
};

function serve(dist, port) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Private-Network': 'true',
    'Cache-Control': 'no-store',
  };
  const server = createServer(async (req, res) => {
    if (req.method === 'OPTIONS') return res.writeHead(204, headers).end();
    if (req.method !== 'GET' && req.method !== 'HEAD') return res.writeHead(405, headers).end();
    const pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
    const file = normalize(join(dist, pathname === '/' ? 'manifest.json' : pathname));
    if (!file.startsWith(dist + sep)) return res.writeHead(403, headers).end();
    try {
      const body = await readFile(file);
      res.writeHead(200, { ...headers, 'Content-Type': CONTENT_TYPES[extname(file)] ?? 'application/octet-stream' });
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch {
      res.writeHead(404, { ...headers, 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
    }
  });
  server.on('error', (error) => {
    console.error(error.code === 'EADDRINUSE' ? `pd2-plugin: port ${port} is in use; pass --port <n>` : error);
    process.exit(1);
  });
  server.listen(port, () => {
    console.log(`Serving ${display(dist)} at http://localhost:${port}/`);
    console.log(
      `Load it in the overlay's browser dev mode: Settings → Plugins → Load unpacked → http://localhost:${port}/ ` +
        '(the desktop app only loads folders inside its config directory: use --outdir <AppConfig>/plugins-dev/<name>)',
    );
  });
  return server;
}

async function dev(root, { port, outdir }) {
  try {
    await buildOnce(root, outdir);
  } catch (error) {
    report(error);
  }
  serve(join(root, 'dist'), port);

  // Rebuild on any change outside dist/ and node_modules/ (debounced; one build at a time).
  let timer = null;
  let building = false;
  let again = false;
  const rebuild = async () => {
    if (building) return void (again = true);
    building = true;
    try {
      await buildOnce(root, outdir);
    } catch (error) {
      report(error);
    }
    building = false;
    if (again) {
      again = false;
      void rebuild();
    }
  };
  watch(root, { recursive: true }, (_event, filename) => {
    const path = String(filename ?? '');
    if (/^(dist|node_modules|\.git)([\\/]|$)/.test(path)) return;
    clearTimeout(timer);
    timer = setTimeout(rebuild, 80);
  });
  console.log('Watching for changes…');
}

async function publish(root, options) {
  const key = options.dryRun ? null : publishKey(options.key);
  const { manifest, files } = await buildPlugin(root);
  const bundle = toBundle(manifest, files);
  const changelog = await releaseNotes(root, manifest.version, options);
  const size = Buffer.byteLength(JSON.stringify(bundle));
  console.log(
    `✓ built ${manifest.id}@${manifest.version} (${Object.keys(bundle.files).length} files, ${(size / 1024).toFixed(1)} KB)` +
      `${changelog ? ', with release notes' : ', no release notes'}`,
  );
  if (options.dryRun) return console.log('Dry run: nothing uploaded.');
  const version = await upload({ api: options.api, key, bundle, changelog });
  console.log(`✓ uploaded ${manifest.id}@${version.version}: ${version.status} (every upload is reviewed before it is listed)`);
  for (const warning of version.checks?.warnings ?? []) console.log(`  ! ${warning}`);
}

const { command, options } = parseArgs(process.argv.slice(2));
if (options.help || !command) {
  console.log(USAGE);
  process.exit(command || options.help ? 0 : 1);
}
const root = process.cwd();
if (command === 'build') {
  try {
    await buildOnce(root, options.outdir);
  } catch (error) {
    report(error);
    process.exit(1);
  }
} else if (command === 'dev') {
  await dev(root, options);
} else if (command === 'publish') {
  try {
    await publish(root, options);
  } catch (error) {
    if (error instanceof PublishError) console.error(`✗ ${error.message}`);
    else report(error);
    process.exit(1);
  }
} else fail(`Unknown command ${command}`);
