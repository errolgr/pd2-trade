/**
 * `pd2-plugin publish`: builds the plugin like `pd2-plugin build` and uploads the bundle to the marketplace
 * (`POST /api/plugins/:id/versions`, docs/api.md "Plugins"). The version waits for review like every upload.
 */
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const BUNDLE_FORMAT = 'pd2-plugin-bundle@1';
export const DEFAULT_API = 'https://pd2trader.com';
export const CHANGELOG_FILE = 'CHANGELOG.md';
export const CHANGELOG_MAX_CHARS = 5000;
const KEY = /^pd2pk_[0-9a-f]{8}_[0-9a-f]{40}$/;

export class PublishError extends Error {}

/** The upload document: the output manifest plus every built file except `manifest.json` itself. */
export function toBundle(manifest, files) {
  const bundleFiles = {};
  for (const [path, content] of files) if (path !== 'manifest.json') bundleFiles[path] = content;
  return { format: BUNDLE_FORMAT, manifest, files: bundleFiles };
}

/**
 * The section of a Keep-a-Changelog style file for `version` (`## 1.2.0`, `## [1.2.0] - 2026-11-01`, `### v1.2.0`),
 * up to the next heading of the same or a higher level; the same rule the server applies to GitHub builds.
 */
export function changelogSection(markdown, version) {
  const lines = markdown.split(/\r?\n/);
  const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const heading = new RegExp(`^(#{1,4})\\s+\\[?v?${escaped}\\]?(?=\\s|$)`);
  const start = lines.findIndex((l) => heading.test(l));
  if (start < 0) return null;
  const level = heading.exec(lines[start])[1].length;
  const out = [];
  for (const line of lines.slice(start + 1)) {
    const h = /^(#{1,6})\s/.exec(line);
    if (h && h[1].length <= level) break;
    out.push(line);
  }
  const text = out.join('\n').trim();
  return text ? text.slice(0, CHANGELOG_MAX_CHARS) : null;
}

/** Release notes: `--notes`, else the `--changelog` file's (or ./CHANGELOG.md's) section for `version`. */
export async function releaseNotes(root, version, { notes, changelog }) {
  if (notes) return notes.slice(0, CHANGELOG_MAX_CHARS);
  const path = changelog ?? join(root, CHANGELOG_FILE);
  if (!existsSync(path)) {
    if (changelog) throw new PublishError(`${changelog} not found`);
    return null;
  }
  return changelogSection(await readFile(path, 'utf8'), version);
}

/** The publish key: `--key`, else PD2_PLUGIN_KEY. */
export function publishKey(flag, env = process.env) {
  const key = (flag ?? env.PD2_PLUGIN_KEY ?? '').trim();
  if (!key)
    throw new PublishError(
      'a publish key is required: pass --key or set PD2_PLUGIN_KEY (create one on pd2trader.com → My plugins → Publish keys)',
    );
  if (!KEY.test(key)) throw new PublishError('the publish key must look like pd2pk_<8 hex>_<40 hex>');
  return key;
}

/**
 * Uploads `bundle` (+ release notes) for `manifest.id`. Resolves to the created version
 * (`{ version, status: 'pending', checks: { errors, warnings }, … }`); throws `PublishError` with the server's
 * reasons otherwise.
 */
export async function upload({ api, key, bundle, changelog, fetchImpl = fetch }) {
  const form = new FormData();
  form.append('bundle', new Blob([JSON.stringify(bundle)], { type: 'application/json' }), 'bundle.json');
  if (changelog) form.append('changelog', changelog);
  const url = `${api.replace(/\/+$/, '')}/api/plugins/${encodeURIComponent(bundle.manifest.id)}/versions`;
  let res;
  try {
    res = await fetchImpl(url, { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: form });
  } catch (error) {
    throw new PublishError(`could not reach ${api}: ${error instanceof Error ? error.message : String(error)}`);
  }
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // not JSON (proxy error page)
  }
  if (res.ok) return body;
  const reasons = Array.isArray(body?.errors) ? body.errors : [];
  const message = Array.isArray(body?.message) ? body.message.join('; ') : (body?.message ?? text.slice(0, 200));
  const hint =
    res.status === 401
      ? ' (is the key revoked, or for another plugin?)'
      : res.status === 404
        ? ` (register ${bundle.manifest.id} on pd2trader.com → My plugins first)`
        : '';
  throw new PublishError(
    `upload failed: ${res.status} ${message || res.statusText}${hint}${reasons.length ? `\n  ${reasons.join('\n  ')}` : ''}`,
  );
}
