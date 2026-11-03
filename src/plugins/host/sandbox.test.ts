// @vitest-environment happy-dom
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  PANEL_BOOTSTRAP,
  WORKER_BOOTSTRAP,
  createSandboxFrame,
  panelSrcdoc,
  parsePanelHtml,
  workerSrcdoc,
} from './sandbox';

const sha256 = (text: string) => `'sha256-${createHash('sha256').update(text, 'utf8').digest('base64')}'`;

/**
 * The app CSP allows the two fixed bootstrap scripts by hash. These pins fail when a bootstrap changes, so the
 * hash in src-tauri/tauri.conf.json (app.security.csp script-src) is updated with it.
 */
const WORKER_BOOTSTRAP_HASH = "'sha256-zmcbutKSdWfPJs84OFhX5WVbbI5doSaL1mxe20RUh4Y='";
const PANEL_BOOTSTRAP_HASH = "'sha256-Y1zyzibbPhRhzMfEqt0hZi9zLAPA/GKKxLFfnSoF6rw='";

describe('plugin sandboxes', () => {
  it('pins the bootstrap script hashes', () => {
    expect(sha256(WORKER_BOOTSTRAP)).toBe(WORKER_BOOTSTRAP_HASH);
    expect(sha256(PANEL_BOOTSTRAP)).toBe(PANEL_BOOTSTRAP_HASH);
  });

  it('allows the bootstraps in the app CSP whenever one is set', () => {
    const conf = JSON.parse(readFileSync(join(__dirname, '../../../src-tauri/tauri.conf.json'), 'utf8'));
    const csp = conf.app?.security?.csp;
    if (csp === null || csp === undefined) return; // no app CSP: nothing blocks the bootstraps
    const scriptSrc: string =
      typeof csp === 'string' ? (/script-src ([^;]*)/.exec(csp)?.[1] ?? '') : (csp['script-src'] ?? '');
    expect(scriptSrc).toContain(WORKER_BOOTSTRAP_HASH);
    expect(scriptSrc).toContain(PANEL_BOOTSTRAP_HASH);
    expect(scriptSrc).toContain('blob:');
  });

  it('frames are script-only sandboxes with no network', () => {
    const frame = createSandboxFrame(workerSrcdoc(), 'plugin');
    expect(frame.getAttribute('sandbox')).toBe('allow-scripts');
    for (const doc of [workerSrcdoc(), panelSrcdoc()]) {
      expect(doc).toContain("default-src 'none'");
      expect(doc).toContain("connect-src 'none'");
      expect(doc).not.toContain('allow-same-origin');
    }
  });

  it('splits panel HTML into markup and inline scripts, dropping external and meta refs', () => {
    const doc = parsePanelHtml(
      `<html><head><meta http-equiv="Content-Security-Policy" content="default-src *"><style>.a{}</style>` +
        `<script src="https://evil.example/x.js"></script></head>` +
        `<body><div class="pd2-stack">Hi</div><script>window.pd2.post(1)</script></body></html>`,
    );
    expect(doc.scripts).toEqual(['window.pd2.post(1)']);
    expect(doc.body).toContain('<style>.a{}</style>');
    expect(doc.body).toContain('<div class="pd2-stack">Hi</div>');
    expect(doc.body).not.toContain('script');
    expect(doc.body).not.toContain('Content-Security-Policy');
  });
});
