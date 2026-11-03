/**
 * Plugin sandboxes (PRD §6.2, M0 spike). Each plugin's logic is a Worker spawned from a blob inside a hidden
 * `<iframe sandbox="allow-scripts" srcdoc>`: an opaque origin ("null") with no access to the host DOM,
 * `window.__TAURI_INTERNALS__`, localStorage, cookies or the network (`connect-src 'none'`, inherited by the
 * blob worker). Never add `allow-same-origin` and never serve plugin code from a registered URI scheme.
 *
 * All I/O is one MessageChannel: the host keeps port1 (`PluginInstance`/broker), port2 is transferred to the
 * worker. The only window-level messages are the bootstrap handshake, accepted when `event.source` is the
 * frame's own contentWindow.
 *
 * The bootstrap scripts are fixed strings so the app CSP (tauri.conf.json) can allow them by hash; their
 * sha256 is pinned in sandbox.test.ts. Changing a bootstrap means updating the hash in tauri.conf.json too.
 */

export const WORKER_SANDBOX_CSP =
  "default-src 'none'; script-src blob: 'unsafe-inline'; worker-src blob:; connect-src 'none'";
export const PANEL_SANDBOX_CSP =
  "default-src 'none'; script-src blob: 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'";

/** Worker frame: on the host's boot message, runs the plugin code as a blob Worker and hands it port2. */
export const WORKER_BOOTSTRAP = `(function () {
  var booted = false;
  addEventListener('message', function (e) {
    if (booted || e.source !== parent || !e.data || e.data.t !== 'pd2:boot' || !e.ports[0]) return;
    booted = true;
    var url = URL.createObjectURL(new Blob([e.data.code], { type: 'text/javascript' }));
    var worker = new Worker(url, { name: String(e.data.name) });
    worker.onerror = function (ev) {
      ev.preventDefault();
      parent.postMessage({ t: 'pd2:crash', message: String(ev.message || 'worker error') }, '*');
    };
    worker.postMessage({ t: 'pd2:connect' }, [e.ports[0]]);
  });
  parent.postMessage({ t: 'pd2:loaded' }, '*');
})();`;

/**
 * Panel frame: installs `window.pd2` (theme, payload, worker messages, broker calls), applies the theme kit
 * CSS and the panel markup, then runs the panel's scripts as blob scripts in order.
 */
export const PANEL_BOOTSTRAP = `(function () {
  var port = null, booted = false, seq = 0, pending = {}, last = {};
  var handlers = { theme: [], payload: [], message: [] };
  function emit(kind, value) {
    last[kind] = { value: value };
    handlers[kind].forEach(function (fn) { try { fn(value); } catch (err) { console.error(err); } });
  }
  function on(kind) {
    return function (fn) { handlers[kind].push(fn); if (last[kind]) fn(last[kind].value); };
  }
  function applyTheme(theme) {
    var root = document.documentElement;
    for (var key in theme.vars) root.style.setProperty('--' + key, theme.vars[key]);
    root.classList.toggle('dark', theme.mode === 'dark');
    root.classList.toggle('light', theme.mode === 'light');
  }
  window.pd2 = {
    onTheme: on('theme'),
    onPayload: on('payload'),
    onMessage: on('message'),
    post: function (data) { if (port) port.postMessage({ t: 'toWorker', data: data }); },
    call: function (method, params) {
      return new Promise(function (resolve, reject) {
        if (!port) return reject(new Error('not connected'));
        var id = ++seq;
        pending[id] = [resolve, reject];
        port.postMessage({ t: 'call', id: id, method: method, params: params });
      });
    },
    close: function () { if (port) port.postMessage({ t: 'close' }); }
  };
  function run(scripts, i) {
    if (i >= scripts.length) return;
    var el = document.createElement('script');
    el.src = URL.createObjectURL(new Blob([scripts[i]], { type: 'text/javascript' }));
    el.onload = el.onerror = function () { run(scripts, i + 1); };
    document.body.appendChild(el);
  }
  addEventListener('message', function (e) {
    if (booted || e.source !== parent || !e.data || e.data.t !== 'pd2:boot-panel' || !e.ports[0]) return;
    booted = true;
    port = e.ports[0];
    port.onmessage = function (m) {
      var d = m.data;
      if (d.t === 'theme') { applyTheme(d.theme); emit('theme', d.theme); }
      else if (d.t === 'payload') emit('payload', d.data);
      else if (d.t === 'message') emit('message', d.data);
      else if (d.t === 'result' && pending[d.id]) {
        var p = pending[d.id];
        delete pending[d.id];
        if (d.ok) p[0](d.value); else p[1](new Error(d.error));
      }
    };
    var style = document.createElement('style');
    style.textContent = e.data.css;
    document.head.appendChild(style);
    document.body.innerHTML = e.data.body;
    // The overlay is not focusable until it claims the keyboard: typing into a panel field asks the host.
    document.addEventListener('focusin', function (ev) {
      var el = ev.target;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) port.postMessage({ t: 'keyboard' });
    }, true);
    run(e.data.scripts, 0);
  });
  parent.postMessage({ t: 'pd2:loaded' }, '*');
})();`;

const srcdoc = (csp: string, bootstrap: string) =>
  `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${csp}"><script>${bootstrap}</script></head><body></body></html>`;

export const workerSrcdoc = (): string => srcdoc(WORKER_SANDBOX_CSP, WORKER_BOOTSTRAP);
export const panelSrcdoc = (): string => srcdoc(PANEL_SANDBOX_CSP, PANEL_BOOTSTRAP);

/** Creates the hidden sandboxed frame. Exported for tests of the frame attributes. */
export function createSandboxFrame(doc: string, title: string): HTMLIFrameElement {
  const frame = document.createElement('iframe');
  // allow-scripts only: opaque origin, no same-origin access, no top navigation, no popups, no forms.
  frame.setAttribute('sandbox', 'allow-scripts');
  frame.setAttribute('referrerpolicy', 'no-referrer');
  frame.setAttribute('title', title);
  // setAttribute, not the `srcdoc` property: automation shims (puppeteer stealth) hook the property setter and
  // swap contentWindow for a proxy, which breaks the event.source check.
  frame.setAttribute('srcdoc', doc);
  return frame;
}

export interface WorkerSandbox {
  /** Host end of the plugin's MessageChannel. */
  port: MessagePort;
  /** Removes the frame, which terminates its worker (the watchdog's kill switch). */
  destroy(): void;
}

let hiddenHost: HTMLElement | null = null;
function sandboxContainer(): HTMLElement {
  if (hiddenHost?.isConnected) return hiddenHost;
  hiddenHost = document.createElement('div');
  hiddenHost.setAttribute('data-plugin-sandboxes', '');
  hiddenHost.setAttribute('aria-hidden', 'true');
  hiddenHost.style.display = 'none';
  document.body.appendChild(hiddenHost);
  return hiddenHost;
}

/**
 * Launches a plugin worker sandbox. Resolves once the bootstrap loaded and the code + port were handed over;
 * `onCrash` reports uncaught worker errors (counted as failures by the instance).
 */
export function launchWorkerSandbox(opts: {
  pluginId: string;
  code: string;
  onCrash: (message: string) => void;
  timeoutMs?: number;
}): Promise<WorkerSandbox> {
  const frame = createSandboxFrame(workerSrcdoc(), `plugin ${opts.pluginId}`);
  const channel = new MessageChannel();
  let destroyed = false;
  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    window.removeEventListener('message', onMessage);
    channel.port1.close();
    frame.remove();
  };
  let resolveBoot: (sandbox: WorkerSandbox) => void = () => {};
  let rejectBoot: (error: Error) => void = () => {};
  const booted = new Promise<WorkerSandbox>((resolve, reject) => {
    resolveBoot = resolve;
    rejectBoot = reject;
  });
  let loaded = false;
  function onMessage(event: MessageEvent) {
    // Authenticate by source: only this frame's window, never another plugin or page.
    if (event.source !== frame.contentWindow) return;
    const data = event.data as { t?: string; message?: string } | null;
    if (data?.t === 'pd2:loaded' && !loaded) {
      loaded = true;
      frame.contentWindow?.postMessage({ t: 'pd2:boot', code: opts.code, name: opts.pluginId }, '*', [channel.port2]);
      resolveBoot({ port: channel.port1, destroy });
    } else if (data?.t === 'pd2:crash') {
      opts.onCrash(String(data.message ?? 'worker error').slice(0, 300));
    }
  }
  window.addEventListener('message', onMessage);
  sandboxContainer().appendChild(frame);
  const timer = setTimeout(() => {
    if (loaded) return;
    destroy();
    rejectBoot(new Error('Plugin sandbox did not start'));
  }, opts.timeoutMs ?? 5000);
  return booted.finally(() => clearTimeout(timer));
}

export interface PanelDocument {
  body: string;
  scripts: string[];
}

/**
 * Splits a plugin panel HTML file into markup and script sources. Inline scripts can't run in the frame under
 * the app CSP (hash-only), so the bootstrap re-runs them as blob scripts. External script refs are dropped
 * (bundles inline them at build time; the sandbox has no network).
 */
export function parsePanelHtml(html: string): PanelDocument {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const scripts: string[] = [];
  doc.querySelectorAll('script').forEach((el) => {
    if (!el.src && el.textContent) scripts.push(el.textContent);
    el.remove();
  });
  const styles = Array.from(doc.querySelectorAll('style'))
    .map((el) => el.outerHTML)
    .join('');
  doc.querySelectorAll('meta, link, base').forEach((el) => el.remove());
  return { body: styles + doc.body.innerHTML, scripts };
}
