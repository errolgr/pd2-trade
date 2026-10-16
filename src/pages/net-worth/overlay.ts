/** App event: toggle the net worth mini panel window (emitted by the ticker, handled by NetWorthOverlayHost). */
export const NETWORTH_TOGGLE_PANEL_EVENT = 'networth:toggle-panel';

/** Formats an HR amount for compact overlay display (1 decimal under 1000, none above). */
export function formatHr(value: number): string {
  return Math.abs(value) >= 1000 ? value.toFixed(0) : value.toFixed(1);
}

/** Formats an HR change with an explicit sign, e.g. `+3.1` / `-0.4`. */
export function formatSignedHr(value: number): string {
  return `${value >= 0 ? '+' : '-'}${formatHr(Math.abs(value))}`;
}
