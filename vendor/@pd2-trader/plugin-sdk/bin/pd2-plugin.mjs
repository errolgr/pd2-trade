#!/usr/bin/env node
/**
 * pd2-plugin: build and serve PD2 Trader plugins.
 *
 *   pd2-plugin build [--outdir <dir>]               pd2-plugin.json + sources → dist/
 *   pd2-plugin dev [--port 5199] [--outdir <dir>]   build, rebuild on change, serve dist/ with CORS
 *
 * Run inside a plugin folder (the one with pd2-plugin.json). `--outdir` also copies the build there, e.g. the
 * desktop app's `<AppConfig>/plugins-dev/<name>` folder for Settings → Plugins → Load unpacked.
 */
import { watch } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { buildPlugin, display, PluginBuildError, writeOutput } from './build.mjs';

const USAGE = `Usage:
  pd2-plugin build [--outdir <dir>]
  pd2-plugin dev [--port 5199] [--outdir <dir>]

Run in a plugin folder containing pd2-plugin.json. Output goes to ./dist.`;

const DEFAULT_PORT = 5199;

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const options = { port: DEFAULT_PORT, outdir: null };
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
    console.log(`Load it in the overlay: Settings → Plugins → Load unpacked → http://localhost:${port}/`);
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
} else fail(`Unknown command ${command}`);
