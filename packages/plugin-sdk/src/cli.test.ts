import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildPlugin, writeOutput } from '../bin/build.mjs';
import { parseManifest } from './manifest';

const SDK_ROOT = resolve(__dirname, '..');
const CLI = join(SDK_ROOT, 'bin/pd2-plugin.mjs');
const RUNE_TICKER = resolve(SDK_ROOT, '../plugins/rune-ticker');
const CREATE = resolve(SDK_ROOT, '../create-pd2-plugin/bin/create-pd2-plugin.mjs');

const temps: string[] = [];
const temp = async () => {
  const dir = await mkdtemp(join(tmpdir(), 'pd2-plugin-'));
  temps.push(dir);
  return dir;
};
afterEach(async () => {
  await Promise.all(temps.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

/** A plugin without SDK imports, so it builds from any folder. */
async function fixture(manifest: Record<string, unknown> = {}): Promise<string> {
  const dir = await temp();
  await writeFile(
    join(dir, 'pd2-plugin.json'),
    JSON.stringify({
      id: 'com.example.fixture',
      name: 'Fixture',
      version: '0.1.0',
      sdk: '^1.0.0',
      entry: { worker: 'worker.ts', panels: { main: 'panel.html' } },
      ...manifest,
    }),
  );
  await writeFile(join(dir, 'worker.ts'), 'const answer: number = 42;\nconsole.log(answer);\n');
  await writeFile(join(dir, 'helper.ts'), 'export const label = (s: string): string => `</script> ${s}`;\n');
  await writeFile(join(dir, 'panel.ts'), "import { label } from './helper';\ndocument.body.dataset.v = label('v1');\n");
  await writeFile(join(dir, 'panel.css'), '.box { color: var(--foreground); }\n');
  await writeFile(
    join(dir, 'panel.html'),
    '<html><head><link rel="stylesheet" href="./panel.css"></head><body><div class="box"></div>' +
      '<script type="module" src="./panel.ts"></script></body></html>',
  );
  return dir;
}

describe('pd2-plugin build', () => {
  it('builds rune-ticker into a dist whose manifest passes parseManifest, with the panel script inlined', async () => {
    const out = await temp();
    const { files } = await buildPlugin(RUNE_TICKER);
    await writeOutput(out, files);

    const manifest = JSON.parse(await readFile(join(out, 'manifest.json'), 'utf8'));
    const { manifest: parsed, errors } = parseManifest(manifest);
    expect(errors).toEqual([]);
    expect(parsed?.entry).toEqual({ worker: 'worker.js', panels: { main: 'panels/main.html' } });

    const worker = await readFile(join(out, 'worker.js'), 'utf8');
    expect(worker).toMatch(/slots\.register\(["']ticker\.widget["']/);
    expect(worker).not.toMatch(/^\s*(import|export)\s/m);

    const html = await readFile(join(out, 'panels/main.html'), 'utf8');
    expect(html).not.toMatch(/<script[^>]*\bsrc=/);
    expect(html).toMatch(/<script>[\s\S]*prices\.runes[\s\S]*<\/script>/);
    expect(html).toContain('class="pd2-button');
  });

  it('inlines stylesheets, drops type="module", escapes </script> and removes stale files', async () => {
    const dir = await fixture();
    const out = await temp();
    await writeFile(join(out, 'stale.js'), 'old');
    const { files } = await buildPlugin(dir);
    await writeOutput(out, files);

    const html = await readFile(join(out, 'panels/main.html'), 'utf8');
    expect(html).toMatch(/<style>[\s\S]*\.box[\s\S]*var\(--foreground\)[\s\S]*<\/style>/);
    expect(html).not.toContain('<link');
    expect(html).not.toContain('type="module"');
    expect(html.match(/<\/script>/g)).toHaveLength(1);
    expect(html).toContain('<\\/script>');
    expect(existsSync(join(out, 'stale.js'))).toBe(false);
  });

  it('rejects invalid manifests, missing entries and remote scripts', async () => {
    await expect(buildPlugin(await fixture({ id: 'Not An Id' }))).rejects.toThrow(/pd2-plugin\.json is invalid:\n.*id/);
    await expect(buildPlugin(await fixture({ entry: { worker: 'missing.ts' } }))).rejects.toThrow(
      /entry\.worker: missing\.ts does not exist/,
    );
    const remote = await fixture();
    await writeFile(join(remote, 'panel.html'), '<script src="https://cdn.example.com/x.js"></script>');
    await expect(buildPlugin(remote)).rejects.toThrow(/remote script/);
  });
});

describe('create-pd2-plugin', () => {
  it('scaffolds a plugin with the given id that builds', async () => {
    // Inside the repo so the template's @pd2-trader/plugin-sdk import resolves to this workspace package.
    const parent = await mkdtemp(join(SDK_ROOT, '.scaffold-'));
    temps.push(parent);
    const dir = join(parent, 'my-plugin');
    const run = spawnSync(process.execPath, [CREATE, dir, '--id', 'com.tester.my-plugin'], { encoding: 'utf8' });
    expect(run.status, run.stderr).toBe(0);
    expect(existsSync(join(dir, '.gitignore'))).toBe(true);
    // Design-system docs come from @pd2-trader/ui, not a template copy.
    const ui = (name: string) => readFile(resolve(SDK_ROOT, '../ui', name), 'utf8');
    expect(await readFile(join(dir, 'DESIGN_RULES.md'), 'utf8')).toBe(await ui('DESIGN_RULES.md'));
    const llms = await readFile(join(dir, 'llms.txt'), 'utf8');
    expect(llms).toMatch(/^# PD2 Trader plugin/);
    expect(llms.endsWith(await ui('llms.txt'))).toBe(true);
    expect(existsSync(join(dir, 'llms.plugin.txt'))).toBe(false);

    const source = JSON.parse(await readFile(join(dir, 'pd2-plugin.json'), 'utf8'));
    expect(source).toMatchObject({ id: 'com.tester.my-plugin', name: 'My Plugin' });
    expect(JSON.parse(await readFile(join(dir, 'package.json'), 'utf8')).name).toBe('my-plugin');

    const { manifest, files } = await buildPlugin(dir);
    expect(manifest.entry).toEqual({ worker: 'worker.js', panels: { main: 'panels/main.html' } });
    expect(files.get('worker.js')).toContain('priceCheck.section');
    expect(files.get('panels/main.html')).not.toMatch(/__PLUGIN_|<script[^>]*\bsrc=/);

    expect(spawnSync(process.execPath, [CREATE, dir], { encoding: 'utf8' }).stderr).toMatch(/not empty/);
  });

  it("lints the scaffold with @pd2-trader/ui's configs.plugin", async () => {
    const parent = await mkdtemp(join(SDK_ROOT, '.scaffold-'));
    temps.push(parent);
    const dir = join(parent, 'lint-me');
    expect(spawnSync(process.execPath, [CREATE, dir], { encoding: 'utf8' }).status).toBe(0);
    const eslint = resolve(SDK_ROOT, '../../node_modules/eslint/bin/eslint.js');
    const lint = (cwd: string) => spawnSync(process.execPath, [eslint, 'src'], { cwd, encoding: 'utf8' });
    const clean = lint(dir);
    expect(clean.status, clean.stdout + clean.stderr).toBe(0);

    await writeFile(join(dir, 'src/bad.ts'), "export const bad = { className: 'bg-red-500 w-[312px]' };\n");
    const dirty = lint(dir);
    expect(dirty.status).toBe(1);
    expect(dirty.stdout).toMatch(/pd2-ds\/no-palette-class/);
    expect(dirty.stdout).toMatch(/pd2-ds\/no-arbitrary-value/);
  }, 30_000);
});

describe('pd2-plugin dev', () => {
  let child: ChildProcess | null = null;
  afterEach(() => {
    child?.kill();
    child = null;
  });

  it('serves dist with CORS and no-store, and rebuilds on change', async () => {
    const dir = await fixture();
    const port = 20000 + Math.floor(Math.random() * 20000);
    child = spawn(process.execPath, [CLI, 'dev', '--port', String(port)], {
      cwd: dir,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let log = '';
    const waiters: { test: () => boolean; resolve: () => void }[] = [];
    // Executor form: the SDK tsconfig targets ES2020 (no Promise.withResolvers).
    /** Resolves once the dev server's output satisfies `test` (it logs every build and when it listens). */
    const logged = (test: (log: string) => boolean) =>
      new Promise<void>((resolve) => {
        waiters.push({ test: () => test(log), resolve });
        if (test(log)) resolve();
      });
    child.stdout!.on('data', (chunk: Buffer) => {
      log += chunk.toString();
      waiters.forEach((w) => w.test() && w.resolve());
    });
    const exited = new Promise<never>((_, fail) =>
      child!.once('exit', (code) => fail(new Error(`dev exited ${code}: ${log}`))),
    );
    exited.catch(() => {}); // the kill in afterEach
    const builds = () => log.match(/^✓/gm)?.length ?? 0;
    await Promise.race([logged((l) => l.includes('Serving')), exited]);

    const base = `http://localhost:${port}/`;
    const response = await fetch(`${base}manifest.json`);
    expect(response.status).toBe(200);
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(parseManifest(await response.json()).errors).toEqual([]);
    expect((await fetch(`${base}..%2Fpd2-plugin.json`)).status).not.toBe(200);

    await writeFile(join(dir, 'panel.ts'), "document.body.dataset.v = 'v2-marker';\n");
    await Promise.race([logged(() => builds() >= 2), exited]);
    expect(await (await fetch(`${base}panels/main.html`)).text()).toContain('v2-marker');
  }, 15_000);
});
