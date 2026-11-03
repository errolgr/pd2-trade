import type { RunePrice } from '@pd2-trader/plugin-sdk';

/** Shared by the worker and the panel (each bundles its own copy). Type-only SDK import: no runtime code. */

/** High runes, most valuable first. */
export const HIGH_RUNES = ['Zod', 'Cham', 'Jah', 'Ber', 'Sur', 'Lo', 'Ohm', 'Vex', 'Gul', 'Ist', 'Mal', 'Um', 'Pul'];

export type TickerRune = { name: string; priceHr: number; listings: number };
export type PriceMap = Record<string, number>;

/** What the worker posts to the panel after every refresh. */
export type TickerSnapshot = {
  type: 'snapshot';
  /** ISO time of the fetch. */
  at: string;
  runes: TickerRune[];
  /** The previous distinct prices (trend baseline); null before a change was seen. */
  previous: PriceMap | null;
};

export type PanelRequest = { type: 'sync' } | { type: 'refresh' };

export const shortRuneName = (name: string): string => name.replace(/\s*rune$/i, '').trim();

export function highRunes(prices: RunePrice[]): TickerRune[] {
  const byName = new Map(prices.map((p) => [shortRuneName(p.name), p]));
  return HIGH_RUNES.flatMap((name) => {
    const p = byName.get(name);
    return p ? [{ name, priceHr: p.priceHr, listings: p.listings }] : [];
  });
}

export const priceMap = (runes: TickerRune[]): PriceMap => Object.fromEntries(runes.map((r) => [r.name, r.priceHr]));

export function samePrices(a: PriceMap, b: PriceMap): boolean {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((k) => Math.abs(a[k] - (b[k] ?? NaN)) < 1e-9);
}

/** Percent change vs the baseline; null without a baseline price. */
export function changePercent(name: string, priceHr: number, previous: PriceMap | null): number | null {
  const before = previous?.[name];
  if (before === undefined || before <= 0) return null;
  return ((priceHr - before) / before) * 100;
}

/** Changes under 0.5% read as flat. */
export function trendOf(change: number | null): 'up' | 'down' | 'flat' {
  if (change === null || Math.abs(change) < 0.5) return 'flat';
  return change > 0 ? 'up' : 'down';
}

export const formatHr = (hr: number): string => `${hr >= 10 ? hr.toFixed(1) : hr.toFixed(2)} HR`;

export function isSnapshot(value: unknown): value is TickerSnapshot {
  const v = value as TickerSnapshot | null;
  return !!v && v.type === 'snapshot' && Array.isArray(v.runes);
}
