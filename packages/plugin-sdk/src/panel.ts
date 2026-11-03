import type { BrokerMethod } from './protocol';
import type { ThemeInfo } from './slots';

/**
 * Plugin panels (B7): a sandboxed iframe the host fills with the panel's HTML, the theme kit CSS below and the
 * `window.pd2` bridge. Theme tokens are pushed on open and on every theme change, so `var(--surface)` etc.
 * follow all 21 themes and the window-transparency setting.
 */
export interface PanelBridge {
  onTheme(handler: (theme: ThemeInfo) => void): void;
  /** The payload the panel was opened with (`sdk.panels.open(panel, payload)`). */
  onPayload(handler: (payload: unknown) => void): void;
  /** Data the worker sent with `sdk.panels.post(panel, data)`. */
  onMessage(handler: (data: unknown) => void): void;
  /** Sends data to the worker (`sdk.panels.onMessage`). */
  post(data: unknown): void;
  /** Broker call with the plugin's permissions, e.g. pd2.call('prices.runes'). */
  call<T = unknown>(method: BrokerMethod, params?: unknown): Promise<T>;
  close(): void;
}

declare global {
  interface Window {
    pd2: PanelBridge;
  }
}

/**
 * Theme kit: design-system look for plugin panels without React or Tailwind. Tokens only (the host sets every
 * THEME_TOKENS var on :root). Classes: pd2-stack, pd2-row, pd2-label, pd2-value, pd2-title, pd2-muted,
 * pd2-badge (+ data-tone), pd2-button (+ pd2-button-secondary), pd2-input, pd2-divider, pd2-skeleton,
 * tone-* and q-* text colors.
 */
export const PANEL_KIT_CSS = `
:root { color-scheme: dark; }
:root.light { color-scheme: light; }
* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; background: transparent; }
body {
  font-family: var(--font-family, Inter, system-ui, sans-serif);
  font-size: 12px; line-height: 1.45; color: var(--foreground);
  font-variant-numeric: tabular-nums; -webkit-font-smoothing: antialiased;
}
.pd2-stack { display: flex; flex-direction: column; gap: 6px; padding: 8px; }
.pd2-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 6px; }
.pd2-tile { border: 1px solid var(--border); border-radius: calc(var(--radius) - 2px); background: var(--card); padding: 6px 8px; }
.pd2-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 22px; }
.pd2-label { color: var(--muted-foreground); }
.pd2-value { font-weight: 500; }
.pd2-title { font-size: 13px; font-weight: 600; letter-spacing: -0.01em; }
.pd2-muted { color: var(--muted-foreground); }
.pd2-divider { height: 1px; background: var(--border); border: 0; margin: 4px 0; }
.pd2-badge { display: inline-flex; align-items: center; height: 18px; padding: 0 6px; border-radius: calc(var(--radius) - 4px);
  font-size: 11px; font-weight: 500; border: 1px solid var(--border); background: var(--secondary); color: var(--secondary-foreground); }
.pd2-badge[data-tone="success"] { background: color-mix(in oklab, var(--success) 15%, transparent); color: var(--success); border-color: color-mix(in oklab, var(--success) 35%, transparent); }
.pd2-badge[data-tone="warning"] { background: color-mix(in oklab, var(--warning) 15%, transparent); color: var(--warning); border-color: color-mix(in oklab, var(--warning) 35%, transparent); }
.pd2-badge[data-tone="danger"] { background: color-mix(in oklab, var(--destructive) 15%, transparent); color: var(--destructive); border-color: color-mix(in oklab, var(--destructive) 35%, transparent); }
.pd2-button { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 28px; padding: 0 10px;
  border-radius: calc(var(--radius) - 2px); border: 0; font: inherit; font-weight: 500; cursor: pointer;
  background: var(--primary); color: var(--primary-foreground); }
.pd2-button:hover { opacity: 0.9; }
.pd2-button:disabled { opacity: 0.5; cursor: default; }
.pd2-button-secondary { background: var(--secondary); color: var(--secondary-foreground); }
.pd2-input { height: 28px; padding: 0 8px; border-radius: calc(var(--radius) - 2px); border: 1px solid var(--input);
  background: transparent; color: inherit; font: inherit; }
.pd2-input:focus { outline: 2px solid color-mix(in oklab, var(--ring) 50%, transparent); outline-offset: 0; }
.pd2-skeleton { border-radius: calc(var(--radius) - 4px); background: var(--muted); height: 12px; }
.tone-muted { color: var(--muted-foreground); }
.tone-success { color: var(--success); }
.tone-warning { color: var(--warning); }
.tone-danger { color: var(--destructive); }
.q-unique { color: var(--q-unique); } .q-set { color: var(--q-set); } .q-rare { color: var(--q-rare); }
.q-magic { color: var(--q-magic); } .q-crafted { color: var(--q-crafted); } .q-rune { color: var(--q-rune); }
@media (prefers-reduced-motion: no-preference) { .pd2-skeleton { animation: pd2-pulse 1.4s ease-in-out infinite; } }
@keyframes pd2-pulse { 50% { opacity: 0.5; } }
`;
