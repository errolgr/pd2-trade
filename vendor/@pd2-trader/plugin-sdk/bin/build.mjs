/**
 * `pd2-plugin` build contract (mirrored by the pd2-price-crawler release build):
 *
 *   pd2-plugin.json        manifest whose entry.worker / entry.panels point at SOURCE files
 *   → dist/manifest.json   same manifest, entry rewritten to `worker.js` / `panels/<name>.html`
 *   → dist/worker.js       entry.worker bundled as an IIFE (es2020, browser, not minified)
 *   → dist/panels/<name>.html  each panel's HTML with every relative `<script src>` bundled and inlined and every
 *                          relative `<link rel="stylesheet">` inlined as `<style>` (the sandbox has no network)
 *
 * The source and output manifests are both validated with the SDK's manifestSchema.
 */
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

export const SOURCE_MANIFEST = 'pd2-plugin.json';
const SDK_SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../src');

const TARGET = 'es2020';

let manifestModule;
/** The SDK's TypeScript manifest module, bundled once per process so Node can run it. */
export async function loadManifestModule() {
  if (!manifestModule) {
    const result = await esbuild.build({
      entryPoints: [join(SDK_SRC, 'manifest.ts')],
      bundle: true,
      write: false,
      format: 'esm',
      platform: 'node',
      target: 'node18',
      logLevel: 'silent',
    });
    const code = result.outputFiles[0].text;
    manifestModule = import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
  }
  return manifestModule;
}

export class PluginBuildError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PluginBuildError';
  }
}

/** Resolves a manifest entry path inside the plugin root; rejects paths that escape it. */
function insideRoot(root, path, what) {
  const abs = resolve(root, path);
  if (abs !== root && !abs.startsWith(root + sep)) throw new PluginBuildError(`${what}: ${path} is outside the plugin`);
  if (!existsSync(abs)) throw new PluginBuildError(`${what}: ${path} does not exist`);
  return abs;
}

async function bundleScript(entry) {
  try {
    const result = await esbuild.build({
      entryPoints: [entry],
      bundle: true,
      write: false,
      format: 'iife',
      target: TARGET,
      platform: 'browser',
      minify: false,
      charset: 'utf8',
      legalComments: 'none',
      logLevel: 'silent',
    });
    return result.outputFiles[0].text;
  } catch (error) {
    const messages = error.errors?.map((e) => `${e.location ? `${e.location.file}:${e.location.line}: ` : ''}${e.text}`);
    throw new PluginBuildError(messages?.length ? messages.join('\n') : String(error));
  }
}

async function bundleCss(entry) {
  try {
    const result = await esbuild.build({
      entryPoints: [entry],
      bundle: true,
      write: false,
      loader: { '.css': 'css' },
      target: TARGET,
      logLevel: 'silent',
    });
    return result.outputFiles[0].text;
  } catch (error) {
    throw new PluginBuildError(error.errors?.map((e) => e.text).join('\n') || String(error));
  }
}

const isRemote = (ref) => /^[a-z][a-z0-9+.-]*:|^\/\//i.test(ref);
const attr = (tag, name) => tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'))?.slice(1).find((v) => v !== undefined);

/** `</script` inside inlined code would end the element early. */
const escapeInlineScript = (code) => code.replace(/<\/(script)/gi, '<\\/$1');
const escapeInlineStyle = (code) => code.replace(/<\/(style)/gi, '<\\/$1');

/** Inlines relative scripts and stylesheets of one panel HTML file. */
export async function buildPanelHtml(htmlPath, panel) {
  const html = await readFile(htmlPath, 'utf8');
  const base = dirname(htmlPath);
  const parts = [];
  let last = 0;
  const pattern = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>|<link\b[^>]*>/gi;
  for (const match of html.matchAll(pattern)) {
    const [whole] = match;
    let replacement = whole;
    if (whole.toLowerCase().startsWith('<script')) {
      const src = attr(match[1], 'src');
      if (src !== undefined) {
        if (isRemote(src)) throw new PluginBuildError(`panel ${panel}: remote script ${src} (plugins can't load remote code)`);
        const code = await bundleScript(resolve(base, src));
        replacement = `<script>\n${escapeInlineScript(code)}</script>`;
      }
    } else if ((attr(whole, 'rel') ?? '').toLowerCase() === 'stylesheet') {
      const href = attr(whole, 'href');
      if (href && isRemote(href)) throw new PluginBuildError(`panel ${panel}: remote stylesheet ${href}`);
      if (href) replacement = `<style>\n${escapeInlineStyle(await bundleCss(resolve(base, href)))}</style>`;
    }
    parts.push(html.slice(last, match.index), replacement);
    last = match.index + whole.length;
  }
  parts.push(html.slice(last));
  return parts.join('');
}

async function readSourceManifest(root) {
  const path = join(root, SOURCE_MANIFEST);
  if (!existsSync(path)) throw new PluginBuildError(`${SOURCE_MANIFEST} not found in ${root}`);
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    throw new PluginBuildError(`${SOURCE_MANIFEST}: ${error.message}`);
  }
}

/**
 * Builds the plugin in `root` into memory. Returns the output manifest and every output file
 * (`manifest.json`, `worker.js`, `panels/<name>.html`) keyed by bundle path.
 */
export async function buildPlugin(root) {
  root = resolve(root);
  const { parseManifest } = await loadManifestModule();
  const source = await readSourceManifest(root);
  const checked = parseManifest(source);
  if (!checked.manifest) throw new PluginBuildError(`${SOURCE_MANIFEST} is invalid:\n  ${checked.errors.join('\n  ')}`);

  const files = new Map();
  const entry = {};
  const { worker, panels } = checked.manifest.entry;
  if (worker) {
    files.set('worker.js', await bundleScript(insideRoot(root, worker, 'entry.worker')));
    entry.worker = 'worker.js';
  }
  if (panels) {
    entry.panels = {};
    for (const [name, path] of Object.entries(panels)) {
      const out = `panels/${name}.html`;
      files.set(out, await buildPanelHtml(insideRoot(root, path, `entry.panels.${name}`), name));
      entry.panels[name] = out;
    }
  }

  const manifest = { ...source, entry };
  const result = parseManifest(manifest);
  if (!result.manifest) throw new PluginBuildError(`dist/manifest.json is invalid:\n  ${result.errors.join('\n  ')}`);
  files.set('manifest.json', `${JSON.stringify(manifest, null, 2)}\n`);
  return { manifest: result.manifest, files };
}

async function listFiles(dir, prefix = '') {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...(await listFiles(join(dir, entry.name), rel)));
    else out.push(rel);
  }
  return out;
}

/** Writes build output into `dir` and deletes files a previous build left that this one no longer has. */
export async function writeOutput(dir, files) {
  for (const [path, content] of files) {
    const target = join(dir, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content);
  }
  for (const stale of await listFiles(dir)) if (!files.has(stale)) await rm(join(dir, stale), { force: true });
}

/** Path relative to cwd for log lines. */
export const display = (path) => relative(process.cwd(), path) || '.';
