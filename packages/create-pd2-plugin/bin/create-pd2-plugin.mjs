#!/usr/bin/env node
/**
 * create-pd2-plugin <dir> [--id com.you.name] [--name "Display Name"]
 *
 * Copies template/ into <dir> and fills in the plugin id, display name and package name.
 */
import { existsSync, realpathSync } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const TEMPLATE = resolve(dirname(fileURLToPath(import.meta.url)), '../template');
/** Same rule as the SDK manifest schema (PLUGIN_ID_RE). */
const PLUGIN_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)+$/;
/** npm ignores `.gitignore` in published packages, so the template ships it without the dot. */
const RENAMES = { gitignore: '.gitignore' };

const USAGE = 'Usage: create-pd2-plugin <dir> [--id com.you.plugin-name] [--name "Plugin Name"]';

function fail(message) {
  console.error(`create-pd2-plugin: ${message}\n${USAGE}`);
  process.exit(1);
}

function parseArgs(argv) {
  const options = { dir: null, id: null, name: null };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const [flag, inline] = arg.split('=', 2);
    if (flag === '--id' || flag === '--name') {
      const value = inline ?? argv[++i];
      if (!value) fail(`${flag} needs a value`);
      options[flag.slice(2)] = value;
    } else if (flag === '-h' || flag === '--help') {
      console.log(USAGE);
      process.exit(0);
    } else if (arg.startsWith('-')) fail(`Unknown option ${arg}`);
    else if (options.dir) fail(`Unexpected argument ${arg}`);
    else options.dir = arg;
  }
  if (!options.dir) fail('missing <dir>');
  return options;
}

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const titleCase = (slug) =>
  slug
    .split('-')
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');

async function templateFiles(dir, prefix = '') {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...(await templateFiles(join(dir, entry.name), rel)));
    else out.push(rel);
  }
  return out;
}

/** Copies the template into `target`; returns the values it substituted. */
export async function scaffold(target, { id, name } = {}) {
  target = resolve(target);
  if (existsSync(target) && (await readdir(target)).length) throw new Error(`${target} is not empty`);
  const slug = slugify(basename(target)) || 'my-plugin';
  const pluginId = id ?? `com.example.${slug}`;
  if (!PLUGIN_ID_RE.test(pluginId)) throw new Error(`--id must be a reverse-DNS id like com.you.${slug}`);
  const values = {
    __PLUGIN_ID__: pluginId,
    __PLUGIN_NAME__: (name ?? titleCase(pluginId.split('.').pop())).slice(0, 48),
    __PACKAGE_NAME__: slug,
  };
  for (const rel of await templateFiles(TEMPLATE)) {
    let content = await readFile(join(TEMPLATE, rel), 'utf8');
    for (const [key, value] of Object.entries(values)) content = content.split(key).join(value);
    const out = join(target, dirname(rel), RENAMES[basename(rel)] ?? basename(rel));
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, content);
  }
  return { dir: target, id: values.__PLUGIN_ID__, name: values.__PLUGIN_NAME__ };
}

// Run as a CLI (also through the npx / node_modules/.bin symlink), not when imported.
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const options = parseArgs(process.argv.slice(2));
  try {
    const { dir, id, name } = await scaffold(options.dir, options);
    const rel = relative(process.cwd(), dir) || '.';
    console.log(`Created ${name} (${id}) in ${rel}\n`);
    console.log(`  cd ${rel}\n  npm install\n  npm run dev`);
    console.log('\nThen in the overlay: Settings → Plugins → Load unpacked → http://localhost:5199/');
    console.log('Read DESIGN_RULES.md (or point your AI tool at llms.txt) before you build UI.');
  } catch (error) {
    fail(error.message);
  }
}
